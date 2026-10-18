using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Jardo.Api.Services;

namespace Jardo.Api.Tests;

public class PlantServiceTests : IDisposable
{
    private readonly TestDatabase _database = new();
    private readonly PlantService _service;

    public PlantServiceTests()
    {
        _service = new PlantService(_database.Context, new FakeTimeProvider(new DateOnly(2026, 6, 15)));
    }

    public void Dispose() => _database.Dispose();

    private static SavePlantDto NewPlant(int spaceId, int? zoneId = null) => new()
    {
        Name = "Carottes",
        Variety = "Nantaise",
        Quantity = 2,
        QuantityUnit = QuantityUnit.Rows,
        SpaceId = spaceId,
        ZoneId = zoneId
    };

    [Fact]
    public async Task Une_plante_se_cree_dans_une_zone_de_son_espace()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var carre = await _database.Context.AddZoneAsync(potager, "Carré 2");

        var plant = await _service.CreateAsync(NewPlant(potager.Id, carre.Id));

        Assert.Equal("Potager", plant.SpaceName);
        Assert.Equal("Carré 2", plant.ZoneName);
    }

    [Fact]
    public async Task Une_plante_peut_se_passer_de_zone()
    {
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard);

        var plant = await _service.CreateAsync(NewPlant(verger.Id));

        Assert.Null(plant.ZoneId);
        Assert.Null(plant.ZoneName);
    }

    [Fact]
    public async Task Une_plante_est_refusee_dans_une_zone_dun_autre_espace()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var petitsFruits = await _database.Context.AddSpaceAsync("Petits fruits", SpaceKind.SmallFruit);
        var rang = await _database.Context.AddZoneAsync(petitsFruits, "Rang 1");

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.CreateAsync(NewPlant(potager.Id, rang.Id)));
    }

    [Fact]
    public async Task Changer_despace_sans_changer_de_zone_est_refuse()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var carre = await _database.Context.AddZoneAsync(potager, "Carré 1");
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard);
        var plant = await _database.Context.AddPlantAsync(potager, carre, "Rhubarbe");

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.UpdateAsync(plant.Id, NewPlant(verger.Id, carre.Id)));
    }

    [Fact]
    public async Task Une_plante_est_refusee_dans_un_espace_bois_de_chauffage()
    {
        var bois = await _database.Context.AddSpaceAsync("Bois de chauffage", SpaceKind.Firewood);

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.CreateAsync(NewPlant(bois.Id)));
    }

    [Fact]
    public async Task Deplacer_une_plante_vers_un_espace_bois_de_chauffage_est_refuse()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var bois = await _database.Context.AddSpaceAsync("Bois de chauffage", SpaceKind.Firewood);
        var plant = await _database.Context.AddPlantAsync(potager, null, "Rhubarbe");

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.UpdateAsync(plant.Id, NewPlant(bois.Id)));
    }

    [Theory]
    [InlineData(SpaceKind.VegetableGarden)]
    [InlineData(SpaceKind.Orchard)]
    [InlineData(SpaceKind.SmallFruit)]
    [InlineData(SpaceKind.Greenhouse)]
    public async Task Les_autres_types_despace_accueillent_des_plantes(SpaceKind kind)
    {
        var space = await _database.Context.AddSpaceAsync("Espace", kind);

        var plant = await _service.CreateAsync(NewPlant(space.Id));

        Assert.Equal(space.Id, plant.SpaceId);
    }

    [Fact]
    public async Task Un_groupe_darbres_identiques_est_une_seule_plante()
    {
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard);
        var dto = NewPlant(verger.Id);
        dto.Name = "Pommiers";
        dto.Quantity = 3;
        dto.QuantityUnit = QuantityUnit.Plants;

        var plant = await _service.CreateAsync(dto);

        Assert.Equal(3, plant.Quantity);
    }

    [Fact]
    public async Task Un_nombre_de_pieds_non_entier_est_refuse()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var dto = NewPlant(potager.Id);
        dto.Quantity = 2.5;
        dto.QuantityUnit = QuantityUnit.Plants;

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(dto));
    }

    [Theory]
    [InlineData(QuantityUnit.Rows)]
    [InlineData(QuantityUnit.SquareMeters)]
    public async Task Une_quantite_fractionnaire_est_acceptee_en_rangs_ou_en_m2(QuantityUnit unit)
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var dto = NewPlant(potager.Id);
        dto.Quantity = 1.5;
        dto.QuantityUnit = unit;

        var plant = await _service.CreateAsync(dto);

        Assert.Equal(1.5, plant.Quantity);
    }

    [Fact]
    public async Task Un_espace_archive_naccueille_plus_de_nouvelle_plante()
    {
        var serre = await _database.Context.AddSpaceAsync("Serre", isArchived: true);

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.CreateAsync(NewPlant(serre.Id)));
    }

    [Fact]
    public async Task Une_plante_dun_espace_archive_reste_modifiable()
    {
        var serre = await _database.Context.AddSpaceAsync("Serre", isArchived: true);
        var plant = await _database.Context.AddPlantAsync(serre, null, "Concombre");

        var updated = await _service.UpdateAsync(plant.Id, NewPlant(serre.Id));

        Assert.Equal("Carottes", updated.Name);
    }

    [Fact]
    public async Task Un_espace_inexistant_est_une_erreur_de_requete()
    {
        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.CreateAsync(NewPlant(spaceId: 999)));
    }

    [Fact]
    public async Task La_liste_par_defaut_exclut_les_plantes_des_espaces_archives()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var serre = await _database.Context.AddSpaceAsync("Serre", isArchived: true);
        await _database.Context.AddPlantAsync(potager, null, "Tomate");
        await _database.Context.AddPlantAsync(serre, null, "Concombre");

        var active = await _service.GetAllAsync();
        var all = await _service.GetAllAsync(includeArchived: true);

        Assert.Equal("Tomate", Assert.Single(active).Name);
        Assert.Equal(2, all.Count);
    }
}
