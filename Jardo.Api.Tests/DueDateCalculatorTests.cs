using Jardo.Api.Models;
using Jardo.Api.Services;

namespace Jardo.Api.Tests;

public class DueDateCalculatorTests
{
    private static readonly DateOnly Today = new(2026, 6, 15);

    // La date de création ne compte que pour une tâche ponctuelle.
    private static readonly DateOnly LongAgo = new(2020, 1, 1);

    private static DueState EveryNDays(int intervalDays, DateOnly? lastDoneOn, DateOnly? startDate = null)
        => DueDateCalculator.Calculate(
            TaskRecurrence.EveryNDays, startDate ?? new DateOnly(2026, 1, 1), intervalDays, lastDoneOn, LongAgo, Today);

    private static DueState Yearly(DateOnly startDate, DateOnly? lastDoneOn)
        => DueDateCalculator.Calculate(TaskRecurrence.Yearly, startDate, null, lastDoneOn, LongAgo, Today);

    private static DueState Once(DateOnly date, DateOnly createdOn, DateOnly? lastDoneOn)
        => DueDateCalculator.Calculate(TaskRecurrence.Once, date, null, lastDoneOn, createdOn, Today);

    [Fact]
    public void Une_tache_faite_aujourdhui_est_a_jour_jusqua_la_prochaine_echeance()
    {
        var state = EveryNDays(2, lastDoneOn: Today);

        Assert.Equal(DueStatus.Ok, state.Status);
        Assert.Equal(Today.AddDays(2), state.NextDueDate);
        Assert.Equal(0, state.DaysOverdue);
    }

    [Fact]
    public void Une_tache_dont_lecheance_tombe_aujourdhui_est_DueSoon()
    {
        var state = EveryNDays(3, lastDoneOn: Today.AddDays(-3));

        Assert.Equal(DueStatus.DueSoon, state.Status);
        Assert.Equal(Today, state.NextDueDate);
        Assert.Equal(0, state.DaysOverdue);
    }

    [Theory]
    [InlineData(3, 1)]
    [InlineData(5, 3)]
    [InlineData(30, 28)]
    public void Une_echeance_depassee_donne_le_nombre_de_jours_de_retard(int doneDaysAgo, int expectedDaysOverdue)
    {
        var state = EveryNDays(2, lastDoneOn: Today.AddDays(-doneDaysAgo));

        Assert.Equal(DueStatus.Overdue, state.Status);
        Assert.Equal(expectedDaysOverdue, state.DaysOverdue);
        Assert.Equal(Today.AddDays(-doneDaysAgo), state.LastDoneOn);
    }

    [Fact]
    public void Jamais_faite_lecheance_est_la_date_de_depart()
    {
        Assert.Equal(Today.AddDays(5), EveryNDays(3, lastDoneOn: null, startDate: Today.AddDays(5)).NextDueDate);

        var late = EveryNDays(3, lastDoneOn: null, startDate: Today.AddDays(-4));

        Assert.Equal(DueStatus.Overdue, late.Status);
        Assert.Equal(4, late.DaysOverdue);
    }

    [Fact]
    public void Un_historique_anterieur_a_la_date_de_depart_ne_met_pas_la_tache_en_retard()
    {
        var state = EveryNDays(3, lastDoneOn: Today.AddDays(-10), startDate: Today);

        Assert.Equal(DueStatus.DueSoon, state.Status);
        Assert.Equal(Today, state.NextDueDate);
    }

    [Fact]
    public void Faite_juste_avant_la_date_de_depart_lecheance_suit_lintervalle()
    {
        var state = EveryNDays(3, lastDoneOn: Today.AddDays(-1), startDate: Today);

        Assert.Equal(Today.AddDays(2), state.NextDueDate);
    }

    [Fact]
    public void Une_tache_tous_les_N_jours_sans_intervalle_est_refusee()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => DueDateCalculator.Calculate(
            TaskRecurrence.EveryNDays, Today, intervalDays: null, lastDoneOn: null, LongAgo, Today));
    }

    [Fact]
    public void Une_tache_annuelle_jamais_faite_est_due_depuis_sa_date_de_depart()
    {
        var state = Yearly(new DateOnly(2026, 2, 1), lastDoneOn: null);

        Assert.Equal(new DateOnly(2026, 2, 1), state.NextDueDate);
        Assert.Equal(DueStatus.Overdue, state.Status);
        Assert.Equal(134, state.DaysOverdue);
    }

    [Theory]
    [InlineData("2026-01-25", "2027-02-01")] // Une semaine d'avance : compte pour le 1er février.
    [InlineData("2026-01-02", "2027-02-01")] // 30 jours d'avance : compte encore.
    [InlineData("2026-01-01", "2026-02-01")] // 31 jours d'avance : trop tôt, le 1er février reste dû.
    [InlineData("2026-02-01", "2027-02-01")]
    [InlineData("2026-03-15", "2027-02-01")] // En retard : compte pour le 1er février passé.
    [InlineData("2026-06-10", "2027-02-01")] // Une taille en vert ne fait pas la taille d'hiver suivante.
    [InlineData("2025-06-01", "2026-02-01")] // Avant la date de départ : ne compte pas.
    public void Une_tache_annuelle_compte_ce_qui_est_fait_jusqua_un_mois_avant(string doneOn, string expectedDue)
    {
        var state = Yearly(new DateOnly(2026, 2, 1), DateOnly.Parse(doneOn));

        Assert.Equal(DateOnly.Parse(expectedDue), state.NextDueDate);
    }

    [Theory]
    [InlineData("2024-03-01", "2025-02-28")]
    [InlineData("2027-03-01", "2028-02-29")]
    public void Une_tache_annuelle_du_29_fevrier_revient_le_28_hors_annee_bissextile(string doneOn, string expectedDue)
    {
        var state = Yearly(new DateOnly(2024, 2, 29), DateOnly.Parse(doneOn));

        Assert.Equal(DateOnly.Parse(expectedDue), state.NextDueDate);
    }

    [Fact]
    public void Une_tache_ponctuelle_pas_encore_faite_est_due_a_sa_date()
    {
        Assert.Equal(DueStatus.Ok, Once(Today.AddDays(3), createdOn: Today, lastDoneOn: null).Status);

        var late = Once(Today.AddDays(-2), createdOn: Today.AddDays(-10), lastDoneOn: null);

        Assert.Equal(DueStatus.Overdue, late.Status);
        Assert.Equal(2, late.DaysOverdue);
    }

    [Theory]
    [InlineData(5, 3)]   // Faite en avance : prévue dans 5 jours, faite il y a 3 jours.
    [InlineData(-5, 10)] // Faite le jour de sa création.
    [InlineData(-5, 2)]  // Faite après sa date, en retard.
    public void Une_tache_ponctuelle_est_close_par_une_intervention_depuis_sa_creation(int plannedInDays, int doneDaysAgo)
    {
        var state = Once(Today.AddDays(plannedInDays), createdOn: Today.AddDays(-10), lastDoneOn: Today.AddDays(-doneDaysAgo));

        Assert.Null(state.NextDueDate);
        Assert.Equal(DueStatus.Ok, state.Status);
        Assert.Equal(0, state.DaysOverdue);
    }

    [Fact]
    public void Une_intervention_anterieure_a_la_creation_ne_clot_pas_une_tache_ponctuelle()
    {
        var state = Once(Today.AddDays(3), createdOn: Today, lastDoneOn: Today.AddDays(-1));

        Assert.Equal(Today.AddDays(3), state.NextDueDate);
        Assert.Equal(DueStatus.Ok, state.Status);
        Assert.Equal(Today.AddDays(-1), state.LastDoneOn);
    }
}
