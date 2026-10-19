using Jardo.Api.Data;
using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Jardo.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Tests;

public class TaskServiceTests : IDisposable
{
    private static readonly DateOnly Today = new(2026, 6, 15);
    private static readonly DateOnly SeasonStart = new(2026, 4, 1);

    private readonly TestDatabase _database = new();
    private readonly TaskService _service;

    public TaskServiceTests()
    {
        var timeProvider = new FakeTimeProvider(Today);

        _service = new TaskService(Db, timeProvider, new JournalService(Db, timeProvider));
    }

    public void Dispose() => _database.Dispose();

    private GardenDbContext Db => _database.Context;

    private Task<GardenTask> AddWateringAsync(Space space, Zone? zone = null, GardenItem? item = null, int everyDays = 2)
        => Db.AddTaskAsync(JournalEntryKind.Watering, TaskRecurrence.EveryNDays, SeasonStart, space, zone, item, everyDays);

    private async Task<DateOnly?> NextDueDateAsync(GardenTask task)
        => (await _service.GetByIdAsync(task.Id)).NextDueDate;

    [Fact]
    public async Task Une_tache_dun_element_compte_les_interventions_sur_sa_zone_et_son_espace()
    {
        var potager = await Db.AddSpaceAsync("Potager");
        var carre = await Db.AddZoneAsync(potager, "Carré 1");
        var tomate = await Db.AddPlantAsync(potager, carre, "Tomate");
        var task = await AddWateringAsync(potager, item: tomate);

        await Db.AddEntryAsync(JournalEntryKind.Watering, Today.AddDays(-6), potager, item: tomate);
        Assert.Equal(Today.AddDays(-4), await NextDueDateAsync(task));

        await Db.AddEntryAsync(JournalEntryKind.Watering, Today.AddDays(-3), potager, carre);
        Assert.Equal(Today.AddDays(-1), await NextDueDateAsync(task));

        await Db.AddEntryAsync(JournalEntryKind.Watering, Today.AddDays(-1), potager);
        await Db.AddEntryAsync(JournalEntryKind.Observation, Today, potager, item: tomate);
        Assert.Equal(Today.AddDays(1), await NextDueDateAsync(task));
    }

    [Fact]
    public async Task Une_tache_de_zone_compte_lespace_mais_pas_les_elements_ni_les_autres_zones()
    {
        var potager = await Db.AddSpaceAsync("Potager");
        var carre1 = await Db.AddZoneAsync(potager, "Carré 1");
        var carre2 = await Db.AddZoneAsync(potager, "Carré 2");
        var tomate = await Db.AddPlantAsync(potager, carre1, "Tomate");
        var task = await AddWateringAsync(potager, carre1);

        await Db.AddEntryAsync(JournalEntryKind.Watering, Today.AddDays(-5), potager);
        await Db.AddEntryAsync(JournalEntryKind.Watering, Today, potager, item: tomate);
        await Db.AddEntryAsync(JournalEntryKind.Watering, Today, potager, carre2);

        Assert.Equal(Today.AddDays(-3), await NextDueDateAsync(task));
    }

    [Fact]
    public async Task Une_tache_despace_ne_compte_que_les_interventions_sur_tout_lespace()
    {
        var verger = await Db.AddSpaceAsync("Verger", SpaceKind.Orchard);
        var rang = await Db.AddZoneAsync(verger, "Rang 1");
        var pommier = await Db.AddPlantAsync(verger, null, "Pommier");
        var task = await Db.AddTaskAsync(JournalEntryKind.Pruning, TaskRecurrence.Yearly, new DateOnly(2026, 2, 1), verger);

        await Db.AddEntryAsync(JournalEntryKind.Pruning, new DateOnly(2026, 2, 3), verger, rang);
        await Db.AddEntryAsync(JournalEntryKind.Pruning, new DateOnly(2026, 2, 3), verger, item: pommier);

        Assert.Equal(new DateOnly(2026, 2, 1), await NextDueDateAsync(task));

        await Db.AddEntryAsync(JournalEntryKind.Pruning, new DateOnly(2026, 1, 25), verger);

        Assert.Equal(new DateOnly(2027, 2, 1), await NextDueDateAsync(task));
    }

    [Fact]
    public async Task Les_taches_dues_sont_triees_des_plus_en_retard_aux_echeances_du_jour()
    {
        var potager = await Db.AddSpaceAsync("Potager");
        var verger = await Db.AddSpaceAsync("Verger", SpaceKind.Orchard);
        var tomate = await Db.AddPlantAsync(potager, null, "Tomate");
        var carotte = await Db.AddPlantAsync(potager, null, "Carotte");
        var basilic = await Db.AddPlantAsync(potager, null, "Basilic");

        var dueToday = await AddWateringAsync(potager, item: tomate);
        var lateByTwo = await AddWateringAsync(potager, item: carotte);
        var upToDate = await AddWateringAsync(potager, item: basilic);
        var neverPruned = await Db.AddTaskAsync(JournalEntryKind.Pruning, TaskRecurrence.Yearly, new DateOnly(2026, 2, 1), verger);
        var treatment = await Db.AddTaskAsync(JournalEntryKind.Treatment, TaskRecurrence.Once, Today.AddDays(-1), verger);

        await Db.AddEntryAsync(JournalEntryKind.Watering, Today.AddDays(-2), potager, item: tomate);
        await Db.AddEntryAsync(JournalEntryKind.Watering, Today.AddDays(-4), potager, item: carotte);
        await Db.AddEntryAsync(JournalEntryKind.Watering, Today, potager, item: basilic);

        var due = await _service.GetDueAsync(DueHorizon.Today);

        Assert.Equal(
            new[] { neverPruned.Id, lateByTwo.Id, treatment.Id, dueToday.Id },
            due.Select(task => task.Id).ToArray());
        Assert.Equal(
            new[] { DueStatus.Overdue, DueStatus.Overdue, DueStatus.Overdue, DueStatus.DueSoon },
            due.Select(task => task.Status).ToArray());
        Assert.DoesNotContain(due, task => task.Id == upToDate.Id);
    }

    [Fact]
    public async Task Lhorizon_de_la_semaine_ajoute_les_six_prochains_jours()
    {
        var potager = await Db.AddSpaceAsync("Potager");
        var late = await Db.AddTaskAsync(JournalEntryKind.Sowing, TaskRecurrence.Once, Today.AddDays(-1), potager);
        var inSixDays = await Db.AddTaskAsync(JournalEntryKind.Sowing, TaskRecurrence.Once, Today.AddDays(6), potager);
        await Db.AddTaskAsync(JournalEntryKind.Sowing, TaskRecurrence.Once, Today.AddDays(7), potager);

        Assert.Equal(new[] { late.Id }, (await _service.GetDueAsync(DueHorizon.Today)).Select(task => task.Id));
        Assert.Equal(
            new[] { late.Id, inSixDays.Id },
            (await _service.GetDueAsync(DueHorizon.Week)).Select(task => task.Id));
    }

    [Fact]
    public async Task Les_taches_faites_ou_archivees_ne_sont_jamais_dues()
    {
        var potager = await Db.AddSpaceAsync("Potager");
        var tunnel = await Db.AddSpaceAsync("Serre tunnel", SpaceKind.Greenhouse, isArchived: true);
        var radis = await Db.AddPlantAsync(potager, null, "Radis", isArchived: true);
        await AddWateringAsync(potager, item: radis);
        await AddWateringAsync(tunnel);
        await Db.AddTaskAsync(JournalEntryKind.Sowing, TaskRecurrence.Once, Today.AddDays(-3), potager);
        await Db.AddEntryAsync(JournalEntryKind.Sowing, Today.AddDays(-2), potager);

        Assert.Empty(await _service.GetDueAsync(DueHorizon.Week));
    }

    [Fact]
    public async Task Fait_note_lintervention_aujourdhui_sur_la_cible_et_renvoie_la_tache_recalculee()
    {
        var potager = await Db.AddSpaceAsync("Potager");
        var carre = await Db.AddZoneAsync(potager, "Carré 1");
        var tomate = await Db.AddPlantAsync(potager, carre, "Tomate");
        var task = await Db.AddTaskAsync(
            JournalEntryKind.Watering, TaskRecurrence.EveryNDays, SeasonStart, potager, item: tomate,
            intervalDays: 2, title: "Arroser au pied");

        var done = await _service.CompleteAsync(task.Id, new CompleteTaskDto());

        Assert.Equal(DueStatus.Ok, done.Status);
        Assert.Equal(Today, done.LastDoneOn);
        Assert.Equal(Today.AddDays(2), done.NextDueDate);

        var entry = Assert.Single(await Db.JournalEntries.AsNoTracking().ToListAsync());
        Assert.Equal(
            (Today, JournalEntryKind.Watering, potager.Id, (int?)carre.Id, (int?)tomate.Id, "Arroser au pied"),
            (entry.Date, entry.Kind, entry.SpaceId, entry.ZoneId, entry.ItemId, entry.Note));
    }

    [Fact]
    public async Task Fait_a_une_date_passee_recalcule_depuis_cette_date()
    {
        var potager = await Db.AddSpaceAsync("Potager");
        var task = await AddWateringAsync(potager, everyDays: 3);

        var done = await _service.CompleteAsync(task.Id, new CompleteTaskDto { Date = Today.AddDays(-4), Note = "Oublié de le noter" });

        Assert.Equal(DueStatus.Overdue, done.Status);
        Assert.Equal(1, done.DaysOverdue);
        Assert.Equal("Oublié de le noter", (await Db.JournalEntries.SingleAsync()).Note);
    }

    [Fact]
    public async Task Fait_dans_le_futur_est_refuse_sans_rien_noter()
    {
        var potager = await Db.AddSpaceAsync("Potager");
        var task = await AddWateringAsync(potager);

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.CompleteAsync(task.Id, new CompleteTaskDto { Date = Today.AddDays(1) }));

        Assert.Empty(await Db.JournalEntries.ToListAsync());
    }

    [Fact]
    public async Task Une_tache_ponctuelle_faite_en_avance_est_close_mais_pas_par_une_intervention_anterieure()
    {
        var potager = await Db.AddSpaceAsync("Potager");
        var createdThisMorning = new DateTimeOffset(Today.ToDateTime(new TimeOnly(8, 0)), TimeSpan.Zero);
        var task = await Db.AddTaskAsync(
            JournalEntryKind.Treatment, TaskRecurrence.Once, Today.AddDays(4), potager, createdAt: createdThisMorning);
        await Db.AddEntryAsync(JournalEntryKind.Treatment, Today.AddDays(-1), potager);

        Assert.Equal(task.Id, Assert.Single(await _service.GetDueAsync(DueHorizon.Week)).Id);

        var done = await _service.CompleteAsync(task.Id, new CompleteTaskDto());

        Assert.True(done.IsCompleted);
        Assert.Equal(Today.AddDays(4), done.StartDate);
        Assert.Empty(await _service.GetDueAsync(DueHorizon.Week));
    }

    [Fact]
    public async Task Une_tache_sur_un_element_prend_sa_zone_doffice()
    {
        var potager = await Db.AddSpaceAsync("Potager");
        var carre = await Db.AddZoneAsync(potager, "Carré 1");
        var tomate = await Db.AddPlantAsync(potager, carre, "Tomate");

        var task = await _service.CreateAsync(new SaveTaskDto
        {
            Kind = JournalEntryKind.Watering,
            Recurrence = TaskRecurrence.EveryNDays,
            IntervalDays = 2,
            StartDate = Today,
            SpaceId = potager.Id,
            ItemId = tomate.Id
        });

        Assert.Equal(carre.Id, task.ZoneId);
        Assert.Equal(DueStatus.DueSoon, task.Status);
    }

    [Theory]
    [InlineData(TaskRecurrence.EveryNDays, null, JournalEntryKind.Watering, "Arroser")]
    [InlineData(TaskRecurrence.Yearly, 7, JournalEntryKind.Pruning, "Tailler")]
    [InlineData(TaskRecurrence.Once, null, JournalEntryKind.Other, null)]
    [InlineData(TaskRecurrence.Once, null, JournalEntryKind.WoodSupply, "Rentrer du bois")]
    public async Task Une_tache_incoherente_est_refusee(
        TaskRecurrence recurrence,
        int? intervalDays,
        JournalEntryKind kind,
        string? title)
    {
        var potager = await Db.AddSpaceAsync("Potager");

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(new SaveTaskDto
        {
            Kind = kind,
            Title = title,
            Recurrence = recurrence,
            IntervalDays = intervalDays,
            StartDate = Today,
            SpaceId = potager.Id
        }));
    }
}
