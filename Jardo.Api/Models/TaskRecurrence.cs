namespace Jardo.Api.Models;

/// <summary>Le rythme d'une tâche.</summary>
public enum TaskRecurrence
{
    /// <summary>Tous les N jours après la dernière fois : arroser tous les 3 jours.</summary>
    EveryNDays = 0,

    /// <summary>Chaque année à la même date : tailler chaque 1er février.</summary>
    Yearly = 1,

    /// <summary>Une seule fois, à une date donnée.</summary>
    Once = 2
}
