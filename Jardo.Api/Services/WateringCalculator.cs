using Jardo.Api.Models;

namespace Jardo.Api.Services;

/// <summary>
/// Le calcul du voyant d'arrosage. C'est le cœur métier du projet.
/// </summary>
/// <remarks>
/// Classe <b>statique et pure</b> : elle ne dépend de rien — ni base de données, ni
/// horloge, ni configuration. Tout ce dont elle a besoin lui est passé en paramètre,
/// y compris la date du jour.
///
/// C'est un choix délibéré et c'est ce qui la rend testable sans aucune installation :
/// pas de base à monter, pas d'horloge à simuler. Un test se résume à « avec ces
/// valeurs, j'attends ce résultat ». Si <c>today</c> était lu ici via DateTime.Now,
/// il deviendrait impossible d'écrire un test fiable sur « en retard de 3 jours » —
/// le test passerait ou échouerait selon le jour où on le lance.
///
/// La règle générale à retenir : une fonction qui lit l'horloge, le système de
/// fichiers ou le réseau ne peut pas être testée simplement. Il faut donc pousser ces
/// lectures vers l'extérieur, et garder le calcul au centre.
/// </remarks>
public static class WateringCalculator
{
    /// <summary>
    /// Détermine l'état d'arrosage d'une plante.
    /// </summary>
    /// <param name="wateringIntervalDays">Nombre de jours entre deux arrosages.</param>
    /// <param name="lastWateredAt">Date du dernier arrosage, ou null si jamais arrosée.</param>
    /// <param name="plantedDate">Date de plantation, utilisée comme point de départ à défaut d'arrosage.</param>
    /// <param name="today">La date du jour, fournie par l'appelant.</param>
    public static WateringState Calculate(
        int wateringIntervalDays,
        DateOnly? lastWateredAt,
        DateOnly? plantedDate,
        DateOnly today)
    {
        // Garde-fou : un intervalle nul ou négatif produirait une échéance absurde
        // (voire une boucle infinie si on itérait dessus). La validation des DTOs
        // l'interdit déjà en entrée, mais une donnée peut venir d'ailleurs — d'un
        // import, d'une migration, d'une modification manuelle en base. Une fonction
        // de calcul se protège toujours elle-même.
        var interval = Math.Max(1, wateringIntervalDays);

        // Point de départ du décompte, par ordre de préférence :
        //   1. le dernier arrosage — l'information la plus fiable ;
        //   2. la date de plantation — pour une plante jamais arrosée ;
        //   3. aujourd'hui — cas d'une plante saisie sans date de plantation. Elle
        //      apparaîtra donc comme « à arroser » dans `interval` jours, ce qui est
        //      le comportement le moins surprenant : on ne veut ni la signaler en
        //      retard à tort, ni l'oublier indéfiniment.
        var referenceDate = lastWateredAt ?? plantedDate ?? today;

        var nextDueDate = referenceDate.AddDays(interval);

        // DayNumber convertit une date en nombre de jours depuis le 1er janvier de
        // l'an 1. Soustraire deux DayNumber donne donc un écart en jours entiers,
        // sans aucune arithmétique de calendrier à gérer (mois de 30 ou 31 jours,
        // années bissextiles).
        var daysLate = today.DayNumber - nextDueDate.DayNumber;

        var status = daysLate switch
        {
            > 0 => WateringStatus.Overdue,   // l'échéance est passée
            0 => WateringStatus.DueSoon,     // c'est aujourd'hui
            _ => WateringStatus.Ok           // encore du temps
        };

        return new WateringState(
            LastWateredAt: lastWateredAt,
            NextDueDate: nextDueDate,
            Status: status,
            // On ne renvoie jamais un retard négatif : « -3 jours de retard » n'a
            // aucun sens pour celui qui lit la réponse.
            DaysOverdue: Math.Max(0, daysLate));
    }
}
