namespace Jardo.Api.Models;

/// <summary>
/// Résultat du calcul d'arrosage d'une plante à une date donnée. Jamais stocké : il dépend de la date du jour.
/// </summary>
/// <param name="LastWateredAt">Dernier arrosage enregistré, ou null si jamais arrosée.</param>
/// <param name="NextDueDate">Date à laquelle l'arrosage est attendu.</param>
/// <param name="Status">Le voyant : vert, orange ou rouge.</param>
/// <param name="DaysOverdue">Jours de retard. 0 si l'échéance n'est pas dépassée.</param>
public record WateringState(
    DateOnly? LastWateredAt,
    DateOnly NextDueDate,
    WateringStatus Status,
    int DaysOverdue);
