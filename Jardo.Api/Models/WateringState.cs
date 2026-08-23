namespace Jardo.Api.Models;

/// <summary>
/// Résultat du calcul d'arrosage pour une plante, à une date donnée.
/// </summary>
/// <remarks>
/// C'est un « record » : un type dont l'intérêt est uniquement de transporter des
/// valeurs. Le mot-clé génère automatiquement le constructeur, les propriétés en
/// lecture seule, l'égalité par valeur et un ToString() lisible. Écrire l'équivalent
/// en classe demanderait une trentaine de lignes.
///
/// Rien de tout cela n'est stocké en base : ces valeurs dépendent de la date du jour
/// et seraient donc fausses dès demain.
/// </remarks>
/// <param name="LastWateredAt">Dernier arrosage enregistré, ou null si jamais arrosée.</param>
/// <param name="NextDueDate">Date à laquelle l'arrosage est attendu.</param>
/// <param name="Status">Le voyant : vert, orange ou rouge.</param>
/// <param name="DaysOverdue">Jours de retard. 0 si l'échéance n'est pas dépassée.</param>
public record WateringState(
    DateOnly? LastWateredAt,
    DateOnly NextDueDate,
    WateringStatus Status,
    int DaysOverdue);
