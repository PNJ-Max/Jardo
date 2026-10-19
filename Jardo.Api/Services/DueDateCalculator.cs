using Jardo.Api.Models;

namespace Jardo.Api.Services;

/// <summary>
/// L'échéance d'une tâche. Fonction pure : la dernière intervention et la date du jour sont
/// fournies par l'appelant, pour que le calcul soit testable sans horloge ni base.
/// </summary>
public static class DueDateCalculator
{
    /// <summary>
    /// Une tâche annuelle faite jusqu'à un mois avant sa date compte pour cette année-là : tailler le
    /// 25 janvier fait la taille du 1er février, et la suivante tombe le 1er février de l'an prochain.
    /// Une taille en vert de septembre, elle, ne fait pas celle de février.
    /// </summary>
    public const int YearlyEarlyToleranceDays = 30;

    /// <param name="recurrence">Le rythme de la tâche.</param>
    /// <param name="startDate">Première échéance, date anniversaire ou jour prévu, selon le rythme.</param>
    /// <param name="intervalDays">Le nombre de jours d'une tâche tous les N jours, au moins 1.</param>
    /// <param name="lastDoneOn">La dernière intervention de même type qui vaut pour la cible, ou null.</param>
    /// <param name="today">La date du jour, fournie par l'appelant.</param>
    public static DueState Calculate(
        TaskRecurrence recurrence,
        DateOnly startDate,
        int? intervalDays,
        DateOnly? lastDoneOn,
        DateOnly today)
    {
        DateOnly? nextDueDate = recurrence switch
        {
            TaskRecurrence.EveryNDays => NextEveryNDays(startDate, intervalDays, lastDoneOn),
            TaskRecurrence.Yearly => NextYearly(startDate, lastDoneOn),
            TaskRecurrence.Once => lastDoneOn >= startDate ? null : startDate,
            _ => throw new ArgumentOutOfRangeException(nameof(recurrence), recurrence, null)
        };

        if (nextDueDate is not { } due)
        {
            return new DueState(lastDoneOn, NextDueDate: null, DueStatus.Ok, DaysOverdue: 0);
        }

        var daysLate = today.DayNumber - due.DayNumber;

        var status = daysLate switch
        {
            > 0 => DueStatus.Overdue,
            0 => DueStatus.DueSoon,
            _ => DueStatus.Ok
        };

        return new DueState(lastDoneOn, due, status, Math.Max(0, daysLate));
    }

    // La date de départ prime sur un historique plus ancien : une tâche créée pour une plante
    // arrivée dans un carré arrosé il y a dix jours ne naît pas en retard.
    private static DateOnly NextEveryNDays(DateOnly startDate, int? intervalDays, DateOnly? lastDoneOn)
    {
        if (intervalDays is not >= 1)
        {
            throw new ArgumentOutOfRangeException(nameof(intervalDays), intervalDays, "Une tâche tous les N jours a un intervalle d'au moins 1 jour.");
        }

        return lastDoneOn is { } last && last.AddDays(intervalDays.Value) > startDate
            ? last.AddDays(intervalDays.Value)
            : startDate;
    }

    // La dernière intervention fait la plus récente date anniversaire qu'elle précède d'un mois au
    // plus, même en retard ; l'échéance est la date anniversaire d'après. Sans intervention qui
    // compte, c'est la date de départ, même passée depuis longtemps.
    private static DateOnly NextYearly(DateOnly startDate, DateOnly? lastDoneOn)
    {
        if (lastDoneOn is not { } last)
        {
            return startDate;
        }

        var covered = last.AddDays(YearlyEarlyToleranceDays);

        if (covered < startDate)
        {
            return startDate;
        }

        // AddYears depuis la date de départ, et non d'année en année : un 29 février revient en
        // 29 février les années bissextiles.
        var years = covered.Year - startDate.Year;
        var candidate = startDate.AddYears(years);

        return candidate > covered ? candidate : startDate.AddYears(years + 1);
    }
}
