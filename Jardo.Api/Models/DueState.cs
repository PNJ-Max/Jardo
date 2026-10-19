namespace Jardo.Api.Models;

/// <summary>Le voyant d'une tâche. Recalculé à chaque lecture, jamais persisté.</summary>
public enum DueStatus
{
    /// <summary>Vert : l'échéance est dans le futur, ou la tâche ponctuelle est faite.</summary>
    Ok = 0,

    /// <summary>Orange : l'échéance est aujourd'hui.</summary>
    DueSoon = 1,

    /// <summary>Rouge : l'échéance est dépassée.</summary>
    Overdue = 2
}

/// <summary>
/// L'échéance d'une tâche à une date donnée. Jamais stockée : elle dépend du journal et de la date du jour.
/// </summary>
/// <param name="LastDoneOn">La dernière intervention de même type qui vaut pour la cible, ou null.</param>
/// <param name="NextDueDate">La prochaine échéance ; null pour une tâche ponctuelle faite.</param>
/// <param name="Status">Le voyant : vert, orange ou rouge.</param>
/// <param name="DaysOverdue">Jours de retard. 0 si l'échéance n'est pas dépassée.</param>
public record DueState(
    DateOnly? LastDoneOn,
    DateOnly? NextDueDate,
    DueStatus Status,
    int DaysOverdue);
