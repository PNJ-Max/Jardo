using Jardo.Api.Models;
using Jardo.Api.Services;

namespace Jardo.Api.Tests;

/// <summary>
/// Tests du calcul du voyant d'arrosage.
/// </summary>
/// <remarks>
/// Aucune base de données, aucune horloge à simuler, aucun conteneur d'injection :
/// WateringCalculator est une fonction pure, on lui donne des valeurs et on vérifie le
/// résultat. C'est exactement le bénéfice recherché en la sortant des services.
///
/// Ces tests sont les seuls du projet à couvrir la logique de calcul, et c'est
/// volontaire : ce sont les seuls qui prouvent quelque chose. Tester que
/// « ZoneService.GetByIdAsync renvoie la zone demandée » ne testerait qu'EF Core.
/// </remarks>
public class WateringCalculatorTests
{
    // Une date de référence arbitraire mais fixe. Tous les tests raisonnent par rapport
    // à elle, ce qui rend les calculs vérifiables de tête à la lecture.
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
        // Arrosée il y a exactement 2 jours, intervalle de 2 : l'échéance est aujourd'hui.
        var state = WateringCalculator.Calculate(
            wateringIntervalDays: 2,
            lastWateredAt: Today.AddDays(-2),
            plantedDate: null,
            today: Today);

        Assert.Equal(WateringStatus.DueSoon, state.Status);
        Assert.Equal(Today, state.NextDueDate);

        // Point important : DueSoon n'est PAS un retard. L'échéance est atteinte,
        // pas dépassée.
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
        // C'est le cas de l'aubergine dans les données d'exemple : plantée, jamais
        // arrosée. Sans ce repli, elle n'aurait aucune échéance et resterait
        // invisible dans la liste des plantes à arroser.
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
        // Plantée il y a longtemps, mais arrosée hier : c'est l'arrosage qui compte.
        var state = WateringCalculator.Calculate(
            wateringIntervalDays: 3,
            lastWateredAt: Today.AddDays(-1),
            plantedDate: Today.AddDays(-200),
            today: Today);

        Assert.Equal(WateringStatus.Ok, state.Status);
        Assert.Equal(Today.AddDays(2), state.NextDueDate);
    }

    [Fact]
    public void Sans_arrosage_ni_date_de_plantation_lecheance_part_daujourdhui()
    {
        // Plante saisie à la va-vite, sans date de plantation. Le comportement attendu
        // est « ni en retard à tort, ni oubliée » : elle devient à arroser dans
        // `interval` jours.
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
        // La validation des DTOs interdit déjà ces valeurs en entrée, mais une donnée
        // peut arriver autrement (import, modification manuelle en base). Le calculateur
        // se protège lui-même plutôt que de produire une échéance absurde.
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
        // Une plante arrosée aujourd'hui avec un intervalle de 10 jours a une échéance
        // dans 10 jours. Le calcul brut donnerait -10 ; on veut 0, parce que
        // « -10 jours de retard » n'a aucun sens pour celui qui lit la réponse.
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
        // Vérifie qu'on ne fait pas d'arithmétique de calendrier à la main :
        // 28 février 2026 + 5 jours = 5 mars (2026 n'est pas bissextile).
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
