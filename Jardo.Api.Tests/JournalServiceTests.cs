using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Jardo.Api.Services;

namespace Jardo.Api.Tests;

public class JournalServiceTests : IDisposable
{
    private static readonly DateOnly Today = new(2026, 6, 15);

    private readonly TestDatabase _database = new();
    private readonly JournalService _service;

    public JournalServiceTests()
    {
        _service = new JournalService(_database.Context, new FakeTimeProvider(Today));
    }

    public void Dispose() => _database.Dispose();

    private static SaveJournalEntryDto NewEntry(
        JournalEntryKind kind,
        int spaceId,
        int? zoneId = null,
        int? itemId = null) => new()
    {
        Date = Today,
        Kind = kind,
        SpaceId = spaceId,
        ZoneId = zoneId,
        ItemId = itemId
    };

    [Fact]
    public async Task Une_zone_dun_autre_espace_est_refusee()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var petitsFruits = await _database.Context.AddSpaceAsync("Petits fruits", SpaceKind.SmallFruit);
        var rang = await _database.Context.AddZoneAsync(petitsFruits, "Rang 1");

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.CreateAsync(NewEntry(JournalEntryKind.Watering, potager.Id, rang.Id)));
    }

    [Fact]
    public async Task Un_element_dun_autre_espace_est_refuse()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard);
        var pommier = await _database.Context.AddPlantAsync(verger, null, "Pommier");

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.CreateAsync(NewEntry(JournalEntryKind.Pruning, potager.Id, itemId: pommier.Id)));
    }

    [Fact]
    public async Task Un_element_hors_de_la_zone_donnee_est_refuse()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var carre1 = await _database.Context.AddZoneAsync(potager, "Carré 1");
        var carre2 = await _database.Context.AddZoneAsync(potager, "Carré 2");
        var tomate = await _database.Context.AddPlantAsync(potager, carre1, "Tomate");

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.CreateAsync(NewEntry(JournalEntryKind.Watering, potager.Id, carre2.Id, tomate.Id)));
    }

    [Fact]
    public async Task Une_entree_sur_un_element_prend_sa_zone()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var carre = await _database.Context.AddZoneAsync(potager, "Carré 2");
        var carottes = await _database.Context.AddPlantAsync(potager, carre, "Carottes");

        var entry = await _service.CreateAsync(NewEntry(JournalEntryKind.Sowing, potager.Id, itemId: carottes.Id));

        Assert.Equal(carre.Id, entry.ZoneId);
        Assert.Equal("Carottes", entry.ItemName);
    }

    [Fact]
    public async Task Chaque_entree_porte_le_type_de_son_element()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var carre = await _database.Context.AddZoneAsync(potager, "Carré 1");
        var tomate = await _database.Context.AddPlantAsync(potager, carre, "Tomate");
        var bucher = await _database.Context.AddSpaceAsync("Bûcher", SpaceKind.Firewood);
        var chene = await _database.Context.AddWoodPileAsync(bucher, "Chêne");
        await _database.Context.AddEntryAsync(JournalEntryKind.Watering, Today.AddDays(-2), potager, item: tomate);
        await _database.Context.AddEntryAsync(JournalEntryKind.Watering, Today.AddDays(-1), potager, carre);
        await _database.Context.AddEntryAsync(JournalEntryKind.Observation, Today, bucher, item: chene);

        var journal = await _service.GetAllAsync();

        Assert.Equal(
            new ItemKind?[] { ItemKind.WoodPile, null, ItemKind.Plant },
            journal.Select(entry => entry.ItemKind).ToArray());
    }

    [Fact]
    public async Task Un_element_archive_ne_recoit_plus_dentree_mais_ses_entrees_restent_corrigeables()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var radis = await _database.Context.AddPlantAsync(potager, null, "Radis");
        var entry = await _service.CreateAsync(NewEntry(JournalEntryKind.Watering, potager.Id, itemId: radis.Id));

        radis.IsArchived = true;
        await _database.Context.SaveChangesAsync();

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.CreateAsync(NewEntry(JournalEntryKind.Watering, potager.Id, itemId: radis.Id)));

        var correction = NewEntry(JournalEntryKind.Watering, potager.Id, itemId: radis.Id);
        correction.Note = "Arrosage au pied.";
        var corrected = await _service.UpdateAsync(entry.Id, correction);

        Assert.Equal("Arrosage au pied.", corrected.Note);
    }

    [Fact]
    public async Task Un_espace_archive_ne_recoit_plus_dentree()
    {
        var tunnel = await _database.Context.AddSpaceAsync("Serre tunnel", SpaceKind.Greenhouse, isArchived: true);

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.CreateAsync(NewEntry(JournalEntryKind.Watering, tunnel.Id)));
    }

    [Theory]
    [InlineData(JournalEntryKind.WoodSupply, SpaceKind.VegetableGarden)]
    [InlineData(JournalEntryKind.Watering, SpaceKind.Firewood)]
    [InlineData(JournalEntryKind.Harvest, SpaceKind.Firewood)]
    public async Task Le_type_dintervention_doit_convenir_au_type_despace(JournalEntryKind kind, SpaceKind spaceKind)
    {
        var space = await _database.Context.AddSpaceAsync("Espace", spaceKind);
        var dto = NewEntry(kind, space.Id);

        if (kind.AcceptsQuantity())
        {
            dto.Quantity = 2;
            dto.QuantityUnit = kind.IsWood() ? MeasureUnit.Steres : MeasureUnit.Kilograms;
        }

        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(dto));
        Assert.Contains("n'accueille pas", error.Message);
    }

    [Fact]
    public async Task Une_entree_datee_dans_le_futur_est_refusee()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var dto = NewEntry(JournalEntryKind.Watering, potager.Id);
        dto.Date = Today.AddDays(1);

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(dto));
    }

    [Fact]
    public async Task Corriger_une_entree_vers_une_date_future_est_refuse()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var entry = await _service.CreateAsync(NewEntry(JournalEntryKind.Watering, potager.Id));
        var dto = NewEntry(JournalEntryKind.Watering, potager.Id);
        dto.Date = Today.AddDays(3);

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.UpdateAsync(entry.Id, dto));
    }

    public static TheoryData<JournalEntryKind, double?, MeasureUnit?, int?, string?> IncoherentFields => new()
    {
        { JournalEntryKind.Watering, 2, MeasureUnit.Kilograms, null, null },
        { JournalEntryKind.Harvest, 2, null, null, null },
        { JournalEntryKind.Harvest, 2, MeasureUnit.Steres, null, null },
        { JournalEntryKind.Harvest, null, null, 40, null },
        { JournalEntryKind.Pruning, null, null, null, "Chancre" },
        { JournalEntryKind.Observation, null, null, null, null }
    };

    [Theory]
    [MemberData(nameof(IncoherentFields))]
    public async Task Les_champs_doivent_convenir_au_type(
        JournalEntryKind kind,
        double? quantity,
        MeasureUnit? unit,
        int? heightCm,
        string? problem)
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var dto = NewEntry(kind, potager.Id);
        dto.Quantity = quantity;
        dto.QuantityUnit = unit;
        dto.HeightCm = heightCm;
        dto.Problem = problem;

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(dto));
    }

    [Fact]
    public async Task Le_bois_se_note_en_steres()
    {
        var bois = await _database.Context.AddSpaceAsync("Bois de chauffage", SpaceKind.Firewood);
        var dto = NewEntry(JournalEntryKind.WoodConsumption, bois.Id);

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(dto));

        dto.Quantity = 0.5;
        dto.QuantityUnit = MeasureUnit.Steres;
        var entry = await _service.CreateAsync(dto);

        Assert.Equal(0.5, entry.Quantity);
    }

    [Fact]
    public async Task Le_journal_du_jardin_va_du_plus_recent_au_plus_ancien()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        await _database.Context.AddEntryAsync(JournalEntryKind.Watering, Today.AddDays(-5), potager);
        await _database.Context.AddEntryAsync(JournalEntryKind.Watering, Today.AddDays(-1), potager);
        await _database.Context.AddEntryAsync(JournalEntryKind.Watering, Today.AddDays(-3), potager);

        var journal = await _service.GetAllAsync();

        Assert.Equal(
            new[] { Today.AddDays(-1), Today.AddDays(-3), Today.AddDays(-5) },
            journal.Select(entry => entry.Date).ToArray());
    }

    [Fact]
    public async Task Le_journal_se_filtre_par_type_et_par_espace()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard);
        await _database.Context.AddEntryAsync(JournalEntryKind.Watering, Today, potager);
        await _database.Context.AddEntryAsync(JournalEntryKind.Harvest, Today, potager);
        await _database.Context.AddEntryAsync(JournalEntryKind.Pruning, Today, potager);
        await _database.Context.AddEntryAsync(JournalEntryKind.Harvest, Today, verger);

        var harvests = await _service.GetAllAsync(kinds: [JournalEntryKind.Harvest]);
        var potagerCare = await _service.GetAllAsync(
            spaceId: potager.Id,
            kinds: [JournalEntryKind.Watering, JournalEntryKind.Pruning]);

        Assert.Equal(2, harvests.Count);
        Assert.All(harvests, entry => Assert.Equal(JournalEntryKind.Harvest, entry.Kind));
        Assert.Equal(2, potagerCare.Count);
        Assert.All(potagerCare, entry => Assert.Equal(potager.Id, entry.SpaceId));
        Assert.DoesNotContain(potagerCare, entry => entry.Kind == JournalEntryKind.Harvest);
    }

    [Fact]
    public async Task Le_journal_dun_element_comprend_ce_qui_est_note_sur_sa_zone_et_son_espace()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var carre1 = await _database.Context.AddZoneAsync(potager, "Carré 1");
        var carre2 = await _database.Context.AddZoneAsync(potager, "Carré 2");
        var tomate = await _database.Context.AddPlantAsync(potager, carre1, "Tomate");
        var basilic = await _database.Context.AddPlantAsync(potager, carre1, "Basilic");
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard);

        var own = await _database.Context.AddEntryAsync(JournalEntryKind.Pruning, Today, potager, item: tomate);
        var zone = await _database.Context.AddEntryAsync(JournalEntryKind.Watering, Today, potager, carre1);
        var space = await _database.Context.AddEntryAsync(JournalEntryKind.Other, Today, potager);
        await _database.Context.AddEntryAsync(JournalEntryKind.Watering, Today, potager, carre2);
        await _database.Context.AddEntryAsync(JournalEntryKind.Harvest, Today, potager, item: basilic);
        await _database.Context.AddEntryAsync(JournalEntryKind.Watering, Today, verger);

        var journal = await _service.GetAllAsync(itemId: tomate.Id);

        Assert.Equal(
            new[] { own.Id, zone.Id, space.Id }.Order(),
            journal.Select(entry => entry.Id).Order());
    }

    [Fact]
    public async Task Le_journal_dune_zone_comprend_ses_elements_et_ce_qui_est_note_sur_son_espace()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var carre1 = await _database.Context.AddZoneAsync(potager, "Carré 1");
        var carre2 = await _database.Context.AddZoneAsync(potager, "Carré 2");
        var tomate = await _database.Context.AddPlantAsync(potager, carre1, "Tomate");
        var rhubarbe = await _database.Context.AddPlantAsync(potager, null, "Rhubarbe");

        var item = await _database.Context.AddEntryAsync(JournalEntryKind.Harvest, Today, potager, item: tomate);
        var zone = await _database.Context.AddEntryAsync(JournalEntryKind.Watering, Today, potager, carre1);
        var space = await _database.Context.AddEntryAsync(JournalEntryKind.Watering, Today, potager);
        await _database.Context.AddEntryAsync(JournalEntryKind.Watering, Today, potager, carre2);
        await _database.Context.AddEntryAsync(JournalEntryKind.Watering, Today, potager, item: rhubarbe);

        var journal = await _service.GetAllAsync(zoneId: carre1.Id);

        Assert.Equal(
            new[] { item.Id, zone.Id, space.Id }.Order(),
            journal.Select(entry => entry.Id).Order());
    }

    [Fact]
    public async Task Le_journal_se_lit_pour_une_seule_cible()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var carre = await _database.Context.AddZoneAsync(potager, "Carré 1");

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.GetAllAsync(spaceId: potager.Id, zoneId: carre.Id));
    }

    [Fact]
    public async Task Le_journal_dune_cible_inexistante_leve_NotFound()
    {
        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetAllAsync(itemId: 999));
    }
}
