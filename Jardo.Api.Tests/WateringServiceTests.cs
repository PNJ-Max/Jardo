using Jardo.Api.Data;
using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Jardo.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Tests;

public class WateringServiceTests : IDisposable
{
    private static readonly DateOnly Today = new(2026, 6, 15);

    private readonly TestDatabase _database = new();
    private readonly WateringService _service;
    private readonly PlantService _plants;

    public WateringServiceTests()
    {
        var timeProvider = new FakeTimeProvider(Today);

        _service = new WateringService(
            _database.Context,
            timeProvider,
            new JournalService(_database.Context, timeProvider));

        _plants = new PlantService(_database.Context, timeProvider);
    }

    public void Dispose() => _database.Dispose();

    private GardenDbContext Db => _database.Context;

    private async Task<Zone> SeedZoneAsync(
        string zoneName,
        params (string Name, int Interval, int? WateredDaysAgo, bool IsArchived)[] plants)
    {
        var space = await Db.AddSpaceAsync("Potager");
        return await SeedZoneAsync(space, zoneName, plants);
    }

    private async Task<Zone> SeedZoneAsync(
        Space space,
        string zoneName,
        params (string Name, int Interval, int? WateredDaysAgo, bool IsArchived)[] plants)
    {
        var zone = await Db.AddZoneAsync(space, zoneName);

        foreach (var (name, interval, wateredDaysAgo, isArchived) in plants)
        {
            var plant = await Db.AddPlantAsync(space, zone, name, interval, isArchived);

            if (wateredDaysAgo.HasValue)
            {
                await Db.AddEntryAsync(JournalEntryKind.Watering, Today.AddDays(-wateredDaysAgo.Value), space, item: plant);
            }
        }

        return zone;
    }

    private async Task<DateOnly?> LastWateredAtAsync(Plant plant)
        => (await _plants.GetByIdAsync(plant.Id)).LastWateredAt;

    [Fact]
    public async Task Une_plante_archivee_nest_jamais_signalee_a_arroser()
    {
        await SeedZoneAsync("Carré 1",
            ("Tomate", 2, 10, false),
            ("Radis", 1, 60, true));

        var needingWater = await _service.GetPlantsNeedingWaterAsync();

        Assert.Equal("Tomate", Assert.Single(needingWater).Name);
    }

    [Fact]
    public async Task Les_plantes_dun_espace_archive_ne_sont_jamais_signalees_a_arroser()
    {
        await SeedZoneAsync("Carré 1", ("Tomate", 2, 10, false));

        var serre = await Db.AddSpaceAsync("Serre", isArchived: true);
        await SeedZoneAsync(serre, "Carré 1", ("Concombre", 2, 10, false));

        var needingWater = await _service.GetPlantsNeedingWaterAsync();

        Assert.Equal("Tomate", Assert.Single(needingWater).Name);
    }

    [Fact]
    public async Task Les_plantes_a_arroser_sont_triees_du_plus_urgent_au_moins_urgent()
    {
        await SeedZoneAsync("Carré 1",
            ("Peu en retard", 2, 3, false),
            ("Tres en retard", 2, 20, false),
            ("Moyennement", 2, 7, false));

        var needingWater = await _service.GetPlantsNeedingWaterAsync();

        Assert.Equal(
            new[] { "Tres en retard", "Moyennement", "Peu en retard" },
            needingWater.Select(plant => plant.Name).ToArray());
    }

    [Fact]
    public async Task Une_plante_a_jour_napparait_pas_dans_la_liste()
    {
        await SeedZoneAsync("Carré 1",
            ("Arrosee ce matin", 3, 0, false),
            ("Echeance aujourdhui", 3, 3, false));

        var needingWater = await _service.GetPlantsNeedingWaterAsync();

        var plant = Assert.Single(needingWater);
        Assert.Equal("Echeance aujourdhui", plant.Name);
        Assert.Equal(WateringStatus.DueSoon, plant.WateringStatus);
    }

    [Fact]
    public async Task Un_arrosage_sans_date_est_note_aujourdhui_sur_la_plante()
    {
        await SeedZoneAsync("Carré 1", ("Tomate", 2, null, false));
        var plantId = await Db.Plants.Select(plant => plant.Id).FirstAsync();

        var entry = await _service.WaterPlantAsync(plantId, new CreateWateringDto());

        Assert.Equal(Today, entry.Date);
        Assert.Equal(JournalEntryKind.Watering, entry.Kind);
        Assert.Equal(plantId, entry.ItemId);
    }

    [Fact]
    public async Task Un_arrosage_date_dans_le_futur_est_refuse()
    {
        var zone = await SeedZoneAsync("Carré 1", ("Tomate", 2, null, false));
        var plantId = await Db.Plants.Select(plant => plant.Id).FirstAsync();
        var dto = new CreateWateringDto { WateredAt = Today.AddDays(1) };

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.WaterPlantAsync(plantId, dto));
        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.WaterZoneAsync(zone.Id, dto));
    }

    [Fact]
    public async Task Un_arrosage_date_dans_le_passe_est_accepte()
    {
        await SeedZoneAsync("Carré 1", ("Tomate", 2, null, false));
        var plantId = await Db.Plants.Select(plant => plant.Id).FirstAsync();

        var entry = await _service.WaterPlantAsync(plantId, new CreateWateringDto { WateredAt = Today.AddDays(-1) });

        Assert.Equal(Today.AddDays(-1), entry.Date);
    }

    [Fact]
    public async Task Arroser_une_plante_archivee_est_refuse()
    {
        await SeedZoneAsync("Carré 1", ("Radis", 1, null, true));
        var plantId = await Db.Plants.Select(plant => plant.Id).FirstAsync();

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.WaterPlantAsync(plantId, new CreateWateringDto()));
    }

    [Fact]
    public async Task Arroser_une_plante_inexistante_leve_NotFound()
    {
        await Assert.ThrowsAsync<NotFoundException>(
            () => _service.WaterPlantAsync(9999, new CreateWateringDto()));
    }

    [Fact]
    public async Task Arroser_une_zone_note_une_seule_entree_sur_la_zone()
    {
        var zone = await SeedZoneAsync("Bac",
            ("Concombre", 2, null, false),
            ("Aubergine", 3, null, false));

        var entry = await _service.WaterZoneAsync(zone.Id, new CreateWateringDto());

        var stored = Assert.Single(await Db.JournalEntries.ToListAsync());
        Assert.Equal(entry.Id, stored.Id);
        Assert.Equal(zone.Id, stored.ZoneId);
        Assert.Null(stored.ItemId);
    }

    [Fact]
    public async Task Arroser_une_zone_fait_disparaitre_ses_plantes_de_la_liste()
    {
        var zone = await SeedZoneAsync("Bac",
            ("Concombre", 2, 10, false),
            ("Aubergine", 3, 15, false));

        Assert.Equal(2, (await _service.GetPlantsNeedingWaterAsync()).Count);

        await _service.WaterZoneAsync(zone.Id, new CreateWateringDto());

        Assert.Empty(await _service.GetPlantsNeedingWaterAsync());
    }

    [Fact]
    public async Task Larrosage_dune_zone_ne_vaut_pas_pour_les_autres_zones()
    {
        var potager = await Db.AddSpaceAsync("Potager");
        var carre1 = await Db.AddZoneAsync(potager, "Carré 1");
        var carre2 = await Db.AddZoneAsync(potager, "Carré 2");
        var tomate = await Db.AddPlantAsync(potager, carre1, "Tomate");
        var carotte = await Db.AddPlantAsync(potager, carre2, "Carotte");

        await Db.AddEntryAsync(JournalEntryKind.Watering, Today.AddDays(-1), potager, carre1);

        Assert.Equal(Today.AddDays(-1), await LastWateredAtAsync(tomate));
        Assert.Null(await LastWateredAtAsync(carotte));
    }

    [Fact]
    public async Task Larrosage_dun_espace_vaut_pour_toutes_ses_plantes_zones_comprises()
    {
        var verger = await Db.AddSpaceAsync("Verger", SpaceKind.Orchard);
        var rang = await Db.AddZoneAsync(verger, "Rang 1");
        var pommier = await Db.AddPlantAsync(verger, null, "Pommier");
        var poirier = await Db.AddPlantAsync(verger, rang, "Poirier");
        var potager = await Db.AddSpaceAsync("Potager");
        var tomate = await Db.AddPlantAsync(potager, null, "Tomate");

        await Db.AddEntryAsync(JournalEntryKind.Watering, Today.AddDays(-2), verger);

        Assert.Equal(Today.AddDays(-2), await LastWateredAtAsync(pommier));
        Assert.Equal(Today.AddDays(-2), await LastWateredAtAsync(poirier));
        Assert.Null(await LastWateredAtAsync(tomate));
    }

    [Fact]
    public async Task Le_dernier_arrosage_est_le_plus_recent_entre_element_zone_et_espace()
    {
        var potager = await Db.AddSpaceAsync("Potager");
        var carre = await Db.AddZoneAsync(potager, "Carré 1");
        var tomate = await Db.AddPlantAsync(potager, carre, "Tomate");

        await Db.AddEntryAsync(JournalEntryKind.Watering, Today.AddDays(-6), potager, item: tomate);
        await Db.AddEntryAsync(JournalEntryKind.Watering, Today.AddDays(-2), potager, carre);
        await Db.AddEntryAsync(JournalEntryKind.Watering, Today.AddDays(-4), potager);
        await Db.AddEntryAsync(JournalEntryKind.Observation, Today, potager, item: tomate);

        Assert.Equal(Today.AddDays(-2), await LastWateredAtAsync(tomate));
    }

    [Fact]
    public async Task Une_plante_plantee_apres_larrosage_de_sa_zone_nest_pas_en_retard()
    {
        var potager = await Db.AddSpaceAsync("Potager");
        var carre = await Db.AddZoneAsync(potager, "Carré 4");
        var laitues = await Db.AddPlantAsync(potager, carre, "Laitues", wateringIntervalDays: 3);
        laitues.PlantedDate = Today.AddDays(-1);
        await Db.SaveChangesAsync();

        await Db.AddEntryAsync(JournalEntryKind.Watering, Today.AddDays(-10), potager, carre);

        var plant = await _plants.GetByIdAsync(laitues.Id);

        Assert.Equal(WateringStatus.Ok, plant.WateringStatus);
        Assert.Equal(Today.AddDays(2), plant.NextWateringDate);
    }
}
