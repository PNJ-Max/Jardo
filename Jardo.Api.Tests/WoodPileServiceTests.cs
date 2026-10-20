using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Jardo.Api.Services;

namespace Jardo.Api.Tests;

public class WoodPileServiceTests : IDisposable
{
    private static readonly DateOnly Today = new(2026, 6, 15);

    private readonly TestDatabase _database = new();
    private readonly WoodPileService _service;
    private readonly JournalService _journal;

    public WoodPileServiceTests()
    {
        var clock = new FakeTimeProvider(Today);

        _service = new WoodPileService(_database.Context, clock);
        _journal = new JournalService(_database.Context, clock);
    }

    public void Dispose() => _database.Dispose();

    private static SaveWoodPileDto NewPile(int spaceId, double initialSteres = 8) => new()
    {
        Name = "Chêne du fond",
        WoodSpecies = "Chêne",
        InitialSteres = initialSteres,
        LogLengthCm = 50,
        CutDate = new DateOnly(2025, 1, 15),
        DryingMonths = 24,
        SpaceId = spaceId
    };

    private Task<JournalEntryResponseDto> NoteWoodAsync(
        JournalEntryKind kind,
        double steres,
        Space space,
        WoodPile? pile = null,
        DateOnly? date = null)
        => _journal.CreateAsync(new SaveJournalEntryDto
        {
            Date = date ?? Today,
            Kind = kind,
            Quantity = steres,
            QuantityUnit = MeasureUnit.Steres,
            SpaceId = space.Id,
            ItemId = pile?.Id
        });

    [Theory]
    [InlineData(SpaceKind.VegetableGarden)]
    [InlineData(SpaceKind.Orchard)]
    [InlineData(SpaceKind.SmallFruit)]
    [InlineData(SpaceKind.Greenhouse)]
    public async Task Un_tas_de_bois_est_refuse_hors_dun_espace_bois_de_chauffage(SpaceKind kind)
    {
        var space = await _database.Context.AddSpaceAsync("Ailleurs", kind);

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(NewPile(space.Id)));
    }

    [Fact]
    public async Task Deplacer_un_tas_vers_un_espace_hors_bois_de_chauffage_est_refuse()
    {
        var bois = await _database.Context.AddSpaceAsync("Bois de chauffage", SpaceKind.Firewood);
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var pile = await _database.Context.AddWoodPileAsync(bois, "Chêne");

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.UpdateAsync(pile.Id, NewPile(potager.Id)));
    }

    [Fact]
    public async Task Un_espace_avec_des_tas_ne_peut_pas_cesser_detre_un_espace_bois_de_chauffage()
    {
        var bois = await _database.Context.AddSpaceAsync("Bois de chauffage", SpaceKind.Firewood);
        await _database.Context.AddWoodPileAsync(bois, "Chêne", isArchived: true);

        await Assert.ThrowsAsync<BusinessRuleException>(() => new SpaceService(
                _database.Context, new FakeTimeProvider(Today))
            .UpdateAsync(bois.Id, new SaveSpaceDto { Name = "Bois de chauffage", Kind = SpaceKind.Greenhouse }));
    }

    [Fact]
    public async Task Le_stock_ne_compte_que_les_entrees_qui_visent_le_tas()
    {
        var bois = await _database.Context.AddSpaceAsync("Bois de chauffage", SpaceKind.Firewood);
        var chene = await _database.Context.AddWoodPileAsync(bois, "Chêne", initialSteres: 8);
        var hetre = await _database.Context.AddWoodPileAsync(bois, "Hêtre", initialSteres: 6);

        await NoteWoodAsync(JournalEntryKind.WoodSupply, 2, bois, chene);
        await NoteWoodAsync(JournalEntryKind.WoodConsumption, 3.5, bois, chene);
        await NoteWoodAsync(JournalEntryKind.WoodConsumption, 1, bois, hetre);
        await NoteWoodAsync(JournalEntryKind.WoodConsumption, 4, bois);

        Assert.Equal(6.5, (await _service.GetByIdAsync(chene.Id)).RemainingSteres);
        Assert.Equal(5, (await _service.GetByIdAsync(hetre.Id)).RemainingSteres);
    }

    [Fact]
    public async Task La_lecture_donne_le_sechage_du_jour()
    {
        var bois = await _database.Context.AddSpaceAsync("Bois de chauffage", SpaceKind.Firewood);
        await _database.Context.AddWoodPileAsync(bois, "Sec", cutDate: new DateOnly(2025, 6, 15), dryingMonths: 12);
        await _database.Context.AddWoodPileAsync(bois, "Humide", cutDate: new DateOnly(2025, 6, 16), dryingMonths: 12);

        var piles = (await _service.GetAllAsync(bois.Id)).ToDictionary(pile => pile.Name);

        Assert.Equal(DryingStatus.Ready, piles["Sec"].DryingStatus);
        Assert.Equal(new DateOnly(2026, 6, 15), piles["Sec"].ReadyOn);
        Assert.Equal(DryingStatus.Drying, piles["Humide"].DryingStatus);
        Assert.Equal(new DateOnly(2026, 6, 16), piles["Humide"].ReadyOn);
    }

    [Fact]
    public async Task Une_consommation_au_dela_du_stock_est_refusee_mais_tout_le_stock_peut_partir()
    {
        var bois = await _database.Context.AddSpaceAsync("Bois de chauffage", SpaceKind.Firewood);
        var pile = await _database.Context.AddWoodPileAsync(bois, "Chêne", initialSteres: 5);
        await NoteWoodAsync(JournalEntryKind.WoodConsumption, 3, bois, pile);

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => NoteWoodAsync(JournalEntryKind.WoodConsumption, 2.01, bois, pile));

        await NoteWoodAsync(JournalEntryKind.WoodConsumption, 2, bois, pile);

        Assert.Equal(0, (await _service.GetByIdAsync(pile.Id)).RemainingSteres);
    }

    [Fact]
    public async Task Un_apport_releve_le_stock_que_la_consommation_peut_ensuite_entamer()
    {
        var bois = await _database.Context.AddSpaceAsync("Bois de chauffage", SpaceKind.Firewood);
        var pile = await _database.Context.AddWoodPileAsync(bois, "Chêne", initialSteres: 1);

        await NoteWoodAsync(JournalEntryKind.WoodSupply, 3, bois, pile);
        await NoteWoodAsync(JournalEntryKind.WoodConsumption, 4, bois, pile);

        Assert.Equal(0, (await _service.GetByIdAsync(pile.Id)).RemainingSteres);
    }

    [Fact]
    public async Task Corriger_une_consommation_la_compare_au_stock_sans_elle_meme()
    {
        var bois = await _database.Context.AddSpaceAsync("Bois de chauffage", SpaceKind.Firewood);
        var pile = await _database.Context.AddWoodPileAsync(bois, "Chêne", initialSteres: 5);
        var entry = await NoteWoodAsync(JournalEntryKind.WoodConsumption, 4, bois, pile);

        SaveJournalEntryDto Correction(double steres) => new()
        {
            Date = Today,
            Kind = JournalEntryKind.WoodConsumption,
            Quantity = steres,
            QuantityUnit = MeasureUnit.Steres,
            SpaceId = bois.Id,
            ItemId = pile.Id
        };

        await Assert.ThrowsAsync<BusinessRuleException>(() => _journal.UpdateAsync(entry.Id, Correction(5.5)));

        await _journal.UpdateAsync(entry.Id, Correction(5));

        Assert.Equal(0, (await _service.GetByIdAsync(pile.Id)).RemainingSteres);
    }

    [Fact]
    public async Task Reporter_une_consommation_sur_un_tas_trop_juste_est_refuse()
    {
        var bois = await _database.Context.AddSpaceAsync("Bois de chauffage", SpaceKind.Firewood);
        var grand = await _database.Context.AddWoodPileAsync(bois, "Grand", initialSteres: 10);
        var petit = await _database.Context.AddWoodPileAsync(bois, "Petit", initialSteres: 1);
        var entry = await NoteWoodAsync(JournalEntryKind.WoodConsumption, 4, bois, grand);

        await Assert.ThrowsAsync<BusinessRuleException>(() => _journal.UpdateAsync(entry.Id, new SaveJournalEntryDto
        {
            Date = Today,
            Kind = JournalEntryKind.WoodConsumption,
            Quantity = 4,
            QuantityUnit = MeasureUnit.Steres,
            SpaceId = bois.Id,
            ItemId = petit.Id
        }));
    }

    [Fact]
    public async Task Supprimer_un_apport_deja_consomme_est_refuse()
    {
        var bois = await _database.Context.AddSpaceAsync("Bois de chauffage", SpaceKind.Firewood);
        var pile = await _database.Context.AddWoodPileAsync(bois, "Chêne", initialSteres: 1);
        var supply = await NoteWoodAsync(JournalEntryKind.WoodSupply, 3, bois, pile);
        await NoteWoodAsync(JournalEntryKind.WoodConsumption, 3, bois, pile);

        await Assert.ThrowsAsync<BusinessRuleException>(() => _journal.DeleteAsync(supply.Id));
    }

    [Fact]
    public async Task Baisser_le_volume_initial_sous_ce_qui_a_ete_consomme_est_refuse()
    {
        var bois = await _database.Context.AddSpaceAsync("Bois de chauffage", SpaceKind.Firewood);
        var pile = await _database.Context.AddWoodPileAsync(bois, "Chêne", initialSteres: 8);
        await NoteWoodAsync(JournalEntryKind.WoodConsumption, 5, bois, pile);

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.UpdateAsync(pile.Id, NewPile(bois.Id, 4.99)));

        var updated = await _service.UpdateAsync(pile.Id, NewPile(bois.Id, 5));

        Assert.Equal(0, updated.RemainingSteres);
    }

    [Fact]
    public async Task Le_journal_et_les_taches_existants_fonctionnent_sur_un_tas()
    {
        var bois = await _database.Context.AddSpaceAsync("Bois de chauffage", SpaceKind.Firewood);
        var pile = await _database.Context.AddWoodPileAsync(bois, "Chêne");
        var taskService = new TaskService(
            _database.Context, new FakeTimeProvider(Today), _journal);

        var task = await taskService.CreateAsync(new SaveTaskDto
        {
            Kind = JournalEntryKind.Other,
            Title = "Rentrer le bois",
            Recurrence = TaskRecurrence.Once,
            StartDate = Today.AddDays(3),
            SpaceId = bois.Id,
            ItemId = pile.Id
        });

        var done = (await taskService.CompleteAsync(task.Id, new CompleteTaskDto())).Task;

        Assert.Equal(DueStatus.Ok, done.Status);
        Assert.Null(done.NextDueDate);
    }
}
