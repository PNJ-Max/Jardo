using Jardo.Api.Models;

namespace Jardo.Api.Services;

/// <summary>
/// Stock et séchage d'un tas de bois. Fonctions pures : les mouvements du journal et la date du
/// jour sont fournis par l'appelant, pour que le calcul soit testable sans horloge ni base.
/// </summary>
public static class WoodPileCalculator
{
    /// <summary>
    /// Stock restant : le volume initial, plus les apports et moins les consommations notés au journal
    /// sur ce tas. Arrondi au centième de stère, pour qu'une somme de décimales ne laisse pas un
    /// reste fantôme de 1e-15 qui ferait refuser la dernière bûche.
    /// </summary>
    public static double RemainingSteres(double initialSteres, IEnumerable<WoodMovement> movements)
    {
        var stock = initialSteres;

        foreach (var movement in movements)
        {
            stock += movement.Kind switch
            {
                JournalEntryKind.WoodSupply => movement.Steres,
                JournalEntryKind.WoodConsumption => -movement.Steres,
                _ => throw new ArgumentOutOfRangeException(nameof(movements), movement.Kind, "Seuls l'apport et la consommation de bois changent un stock.")
            };
        }

        return Math.Round(stock, 2);
    }

    /// <summary>
    /// Le bois est prêt à brûler le jour où la durée de séchage est écoulée depuis la coupe, ce jour
    /// compris. Un mois de plus se compte au même quantième, ramené à la fin du mois s'il n'existe
    /// pas : coupé le 31 janvier, séché un mois, le bois est prêt le 28 février.
    /// </summary>
    public static DryingState Drying(DateOnly cutDate, int dryingMonths, DateOnly today)
    {
        var readyOn = cutDate.AddMonths(dryingMonths);

        return new DryingState(today >= readyOn ? DryingStatus.Ready : DryingStatus.Drying, readyOn);
    }
}
