using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Jardo.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Tests;

public class SpaceServiceTests : IDisposable
{
    private readonly TestDatabase _database = new();
    private readonly SpaceService _service;

    public SpaceServiceTests()
    {
        _service = new SpaceService(_database.Context, new FakeTimeProvider(new DateOnly(2026, 6, 15)));
    }

    public void Dispose() => _database.Dispose();

    [Fact]
    public async Task Deux_espaces_ne_peuvent_pas_porter_le_meme_nom()
    {
        await _service.CreateAsync(new SaveSpaceDto { Name = "Potager", Kind = SpaceKind.VegetableGarden });

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(
            new SaveSpaceDto { Name = " Potager ", Kind = SpaceKind.Orchard }));
    }

    [Fact]
    public async Task Renommer_un_espace_avec_le_nom_dun_espace_archive_est_refuse()
    {
        await _database.Context.AddSpaceAsync("Serre", isArchived: true);
        var potager = await _database.Context.AddSpaceAsync("Potager");

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.UpdateAsync(
            potager.Id, new SaveSpaceDto { Name = "Serre", Kind = SpaceKind.VegetableGarden }));
    }

    [Fact]
    public async Task Un_espace_avec_des_plantes_ne_peut_pas_devenir_bois_de_chauffage()
    {
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard);
        await _database.Context.AddPlantAsync(verger, null, "Vieux poirier", isArchived: true);

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.UpdateAsync(
            verger.Id, new SaveSpaceDto { Name = "Verger", Kind = SpaceKind.Firewood }));
    }

    [Fact]
    public async Task Un_espace_dont_le_journal_ne_convient_pas_au_nouveau_type_ne_peut_pas_en_changer()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        await _database.Context.AddEntryAsync(JournalEntryKind.Watering, new DateOnly(2026, 6, 1), potager);

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.UpdateAsync(
            potager.Id, new SaveSpaceDto { Name = "Potager", Kind = SpaceKind.Firewood }));

        var updated = await _service.UpdateAsync(
            potager.Id, new SaveSpaceDto { Name = "Potager", Kind = SpaceKind.Greenhouse });

        Assert.Equal(SpaceKind.Greenhouse, updated.Kind);
    }

    [Fact]
    public async Task Un_espace_vide_peut_changer_de_type()
    {
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard);

        var updated = await _service.UpdateAsync(
            verger.Id, new SaveSpaceDto { Name = "Bûcher", Kind = SpaceKind.Firewood });

        Assert.Equal(SpaceKind.Firewood, updated.Kind);
    }

    [Fact]
    public async Task Le_compteur_delements_ignore_les_elements_archives()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        await _database.Context.AddZoneAsync(potager, "Carré 1");
        await _database.Context.AddPlantAsync(potager, null, "Tomate");
        await _database.Context.AddPlantAsync(potager, null, "Radis", isArchived: true);

        var space = await _service.GetByIdAsync(potager.Id);

        Assert.Equal(1, space.ItemCount);
        Assert.Equal(1, space.ZoneCount);
    }

    [Fact]
    public async Task La_liste_par_defaut_exclut_les_espaces_archives()
    {
        await _database.Context.AddSpaceAsync("Potager");
        await _database.Context.AddSpaceAsync("Serre", isArchived: true);

        var active = await _service.GetAllAsync();
        var all = await _service.GetAllAsync(includeArchived: true);

        Assert.Equal("Potager", Assert.Single(active).Name);
        Assert.Equal(2, all.Count);
    }

    [Fact]
    public async Task Supprimer_un_espace_qui_contient_un_element_archive_est_refuse()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        await _database.Context.AddPlantAsync(potager, null, "Radis", isArchived: true);

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.DeleteAsync(potager.Id));
    }

    [Fact]
    public async Task Supprimer_un_espace_vide_emporte_ses_zones()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        await _database.Context.AddZoneAsync(potager, "Carré 1");

        await _service.DeleteAsync(potager.Id);

        Assert.False(await _database.Context.Zones.AnyAsync());
    }

    [Fact]
    public async Task Un_espace_compte_ses_taches_dues_hors_elements_archives()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard);
        var tomate = await _database.Context.AddPlantAsync(potager, null, "Tomate");
        var radis = await _database.Context.AddPlantAsync(potager, null, "Radis", isArchived: true);
        var dueToday = new DateOnly(2026, 6, 15);
        var tomorrow = new DateOnly(2026, 6, 16);
        await _database.Context.AddTaskAsync(JournalEntryKind.Watering, TaskRecurrence.Once, dueToday, potager, item: tomate);
        await _database.Context.AddTaskAsync(JournalEntryKind.Watering, TaskRecurrence.Once, dueToday, potager, item: radis);
        await _database.Context.AddTaskAsync(JournalEntryKind.Pruning, TaskRecurrence.Once, dueToday, potager);
        await _database.Context.AddTaskAsync(JournalEntryKind.Pruning, TaskRecurrence.Once, tomorrow, verger);

        var spaces = await _service.GetAllAsync();

        Assert.Equal(new[] { 2, 0 }, spaces.Select(space => space.DueTaskCount).ToArray());
    }

    [Fact]
    public async Task Un_espace_dont_les_taches_ne_conviennent_pas_au_nouveau_type_ne_peut_pas_en_changer()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        await _database.Context.AddTaskAsync(
            JournalEntryKind.Watering, TaskRecurrence.EveryNDays, new DateOnly(2026, 6, 1), potager, intervalDays: 2);

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.UpdateAsync(
            potager.Id, new SaveSpaceDto { Name = "Potager", Kind = SpaceKind.Firewood }));
    }
}
