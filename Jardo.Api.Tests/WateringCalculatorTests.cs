using Jardo.Api.Models;
using Jardo.Api.Services;

namespace Jardo.Api.Tests;

public class WateringCalculatorTests
{
    private static readonly DateOnly Today = new(2026, 6, 15);

    [Fact]
    public void Une_plante_arrosee_aujourdhui_est_a_jour()
    {
        var state = WateringCalculator.Calculate(
            wateringIntervalDays: 2,
            lastWateredAt: Today,
            plantedDate: null,
            today: Today);

        Assert.Equal(WateringStatus.Ok, state.Status);
        Assert.Equal(new DateOnly(2026, 6, 17), state.NextDueDate);
        Assert.Equal(0, state.DaysOverdue);
    }

    [Fact]
    public void Une_plante_dont_lecheance_tombe_aujourdhui_est_DueSoon()
    {
        var state = WateringCalculator.Calculate(
            wateringIntervalDays: 2,
            lastWateredAt: Today.AddDays(-2),
            plantedDate: null,
            today: Today);

        Assert.Equal(WateringStatus.DueSoon, state.Status);
        Assert.Equal(Today, state.NextDueDate);
        Assert.Equal(0, state.DaysOverdue);
    }

    [Theory]
    [InlineData(3, 1)]   // arrosée il y a 3 j, intervalle 2 -> 1 jour de retard
    [InlineData(5, 3)]
    [InlineData(30, 28)]
    public void Une_echeance_depassee_donne_le_bon_nombre_de_jours_de_retard(int wateredDaysAgo, int expectedDaysOverdue)
    {
        var state = WateringCalculator.Calculate(
            wateringIntervalDays: 2,
            lastWateredAt: Today.AddDays(-wateredDaysAgo),
            plantedDate: null,
            today: Today);

        Assert.Equal(WateringStatus.Overdue, state.Status);
        Assert.Equal(expectedDaysOverdue, state.DaysOverdue);
    }

    [Fact]
    public void Sans_arrosage_le_calcul_repart_de_la_date_de_plantation()
    {
        var state = WateringCalculator.Calculate(
            wateringIntervalDays: 3,
            lastWateredAt: null,
            plantedDate: Today.AddDays(-10),
            today: Today);

        Assert.Equal(WateringStatus.Overdue, state.Status);
        Assert.Equal(Today.AddDays(-7), state.NextDueDate);
        Assert.Equal(7, state.DaysOverdue);
    }

    [Fact]
    public void Le_dernier_arrosage_prime_sur_la_date_de_plantation()
    {
        var state = WateringCalculator.Calculate(
            wateringIntervalDays: 3,
            lastWateredAt: Today.AddDays(-1),
            plantedDate: Today.AddDays(-200),
            today: Today);

        Assert.Equal(WateringStatus.Ok, state.Status);
        Assert.Equal(Today.AddDays(2), state.NextDueDate);
    }

    [Fact]
    public void Une_plantation_posterieure_au_dernier_arrosage_relance_le_decompte()
    {
        var state = WateringCalculator.Calculate(
            wateringIntervalDays: 3,
            lastWateredAt: Today.AddDays(-10),
            plantedDate: Today.AddDays(-1),
            today: Today);

        Assert.Equal(WateringStatus.Ok, state.Status);
        Assert.Equal(Today.AddDays(2), state.NextDueDate);
        Assert.Equal(Today.AddDays(-10), state.LastWateredAt);
    }

    [Fact]
    public void Sans_arrosage_ni_date_de_plantation_lecheance_part_daujourdhui()
    {
        var state = WateringCalculator.Calculate(
            wateringIntervalDays: 4,
            lastWateredAt: null,
            plantedDate: null,
            today: Today);

        Assert.Equal(WateringStatus.Ok, state.Status);
        Assert.Equal(Today.AddDays(4), state.NextDueDate);
        Assert.Equal(0, state.DaysOverdue);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void Un_intervalle_invalide_est_ramene_a_un_jour(int invalidInterval)
    {
        var state = WateringCalculator.Calculate(
            wateringIntervalDays: invalidInterval,
            lastWateredAt: Today,
            plantedDate: null,
            today: Today);

        Assert.Equal(Today.AddDays(1), state.NextDueDate);
    }

    [Fact]
    public void Le_retard_nest_jamais_negatif()
    {
        var state = WateringCalculator.Calculate(
            wateringIntervalDays: 10,
            lastWateredAt: Today,
            plantedDate: null,
            today: Today);

        Assert.Equal(0, state.DaysOverdue);
    }

    [Fact]
    public void Le_calcul_traverse_correctement_un_changement_de_mois()
    {
        // 2026 n'est pas bissextile : 28 février + 5 jours = 5 mars.
        var state = WateringCalculator.Calculate(
            wateringIntervalDays: 5,
            lastWateredAt: new DateOnly(2026, 2, 28),
            plantedDate: null,
            today: new DateOnly(2026, 2, 28));

        Assert.Equal(new DateOnly(2026, 3, 5), state.NextDueDate);
    }

    [Fact]
    public void Le_dernier_arrosage_est_repercute_tel_quel_dans_le_resultat()
    {
        var lastWatered = Today.AddDays(-3);

        var state = WateringCalculator.Calculate(
            wateringIntervalDays: 7,
            lastWateredAt: lastWatered,
            plantedDate: null,
            today: Today);

        Assert.Equal(lastWatered, state.LastWateredAt);
    }
}
