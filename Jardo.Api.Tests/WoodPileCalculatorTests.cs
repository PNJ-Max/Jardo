using Jardo.Api.Models;
using Jardo.Api.Services;

namespace Jardo.Api.Tests;

public class WoodPileCalculatorTests
{
    private static WoodMovement Supply(double steres) => new(JournalEntryKind.WoodSupply, steres);

    private static WoodMovement Consumption(double steres) => new(JournalEntryKind.WoodConsumption, steres);

    [Fact]
    public void Un_tas_sans_mouvement_garde_son_volume_initial()
    {
        Assert.Equal(8, WoodPileCalculator.RemainingSteres(8, []));
    }

    [Fact]
    public void Les_apports_sajoutent_au_volume_initial_et_les_consommations_sen_retranchent()
    {
        var stock = WoodPileCalculator.RemainingSteres(
            8, [Consumption(1), Supply(2), Consumption(1.5), Consumption(3)]);

        Assert.Equal(4.5, stock);
    }

    [Fact]
    public void Consommer_tout_le_stock_le_laisse_a_zero_sans_reste_de_virgule_flottante()
    {
        var stock = WoodPileCalculator.RemainingSteres(0.3, [Consumption(0.1), Consumption(0.2)]);

        Assert.Equal(0, stock);
    }

    [Fact]
    public void Une_consommation_au_dela_du_stock_donne_un_stock_negatif()
    {
        Assert.Equal(-0.5, WoodPileCalculator.RemainingSteres(2, [Consumption(2.5)]));
    }

    [Fact]
    public void Une_intervention_autre_que_du_bois_ne_compte_pas_dans_un_stock()
    {
        Assert.Throws<ArgumentOutOfRangeException>(
            () => WoodPileCalculator.RemainingSteres(2, [new WoodMovement(JournalEntryKind.Harvest, 1)]));
    }

    // Coupé le 15 janvier 2026, six mois de séchage : prêt le 15 juillet.
    [Theory]
    [InlineData("2026-07-14", DryingStatus.Drying)]
    [InlineData("2026-07-15", DryingStatus.Ready)]
    [InlineData("2026-07-16", DryingStatus.Ready)]
    public void Le_bois_est_pret_le_jour_ou_sa_duree_de_sechage_est_ecoulee(string today, DryingStatus expected)
    {
        var state = WoodPileCalculator.Drying(new DateOnly(2026, 1, 15), 6, DateOnly.Parse(today));

        Assert.Equal(expected, state.Status);
        Assert.Equal(new DateOnly(2026, 7, 15), state.ReadyOn);
    }

    [Fact]
    public void Du_bois_achete_sec_est_pret_le_jour_de_sa_coupe()
    {
        var cutDate = new DateOnly(2026, 3, 1);

        var state = WoodPileCalculator.Drying(cutDate, 0, cutDate);

        Assert.Equal(DryingStatus.Ready, state.Status);
        Assert.Equal(cutDate, state.ReadyOn);
    }

    [Fact]
    public void Un_mois_de_sechage_depuis_le_31_janvier_se_termine_en_fin_de_fevrier()
    {
        var state = WoodPileCalculator.Drying(new DateOnly(2026, 1, 31), 1, new DateOnly(2026, 2, 27));

        Assert.Equal(DryingStatus.Drying, state.Status);
        Assert.Equal(new DateOnly(2026, 2, 28), state.ReadyOn);
    }
}
