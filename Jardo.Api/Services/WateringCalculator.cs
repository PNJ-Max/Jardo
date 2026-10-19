using Jardo.Api.Models;

namespace Jardo.Api.Services;

/// <summary>
/// Calcul du voyant d'arrosage. Fonction pure : la date du jour est fournie par l'appelant
/// pour que le calcul soit testable sans horloge ni base.
/// </summary>
public static class WateringCalculator
{
    /// <param name="wateringIntervalDays">Nombre de jours entre deux arrosages.</param>
    /// <param name="lastWateredAt">Date du dernier arrosage, ou null si jamais arrosée.</param>
    /// <param name="plantedDate">Point de départ du décompte s'il est plus récent que le dernier arrosage.</param>
    /// <param name="today">La date du jour, fournie par l'appelant.</param>
    public static WateringState Calculate(
        int wateringIntervalDays,
        DateOnly? lastWateredAt,
        DateOnly? plantedDate,
        DateOnly today)
    {
        // La validation des DTOs interdit déjà un intervalle < 1, mais la donnée peut venir d'ailleurs (import, base).
        var interval = Math.Max(1, wateringIntervalDays);

        // Le dernier arrosage peut précéder la plantation : celui d'une zone ou d'un espace vaut pour
        // une plante arrivée depuis, qui ne doit pas naître en retard. Sans arrosage ni date de
        // plantation, le décompte part d'aujourd'hui : la plante n'est ni signalée à tort, ni oubliée.
        var referenceDate = new[] { lastWateredAt, plantedDate }.Max() ?? today;

        var nextDueDate = referenceDate.AddDays(interval);

        var daysLate = today.DayNumber - nextDueDate.DayNumber;

        var status = daysLate switch
        {
            > 0 => WateringStatus.Overdue,
            0 => WateringStatus.DueSoon,
            _ => WateringStatus.Ok
        };

        return new WateringState(
            LastWateredAt: lastWateredAt,
            NextDueDate: nextDueDate,
            Status: status,
            DaysOverdue: Math.Max(0, daysLate));
    }
}
