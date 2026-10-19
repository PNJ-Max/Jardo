namespace Jardo.Api.Models;

/// <summary>
/// Une chose à faire au jardin, sur la même cible qu'une entrée du journal. Elle n'a pas de statut
/// « faite » : faire une tâche, c'est noter l'intervention au journal, et l'échéance est recalculée
/// à chaque lecture (voir <see cref="Services.DueDateCalculator"/>).
/// </summary>
public class GardenTask
{
    public int Id { get; set; }

    public int SpaceId { get; set; }

    public Space Space { get; set; } = null!;

    /// <summary>Renseignée pour une tâche sur une zone, et pour une tâche sur un élément situé dans une zone.</summary>
    public int? ZoneId { get; set; }

    public Zone? Zone { get; set; }

    public int? ItemId { get; set; }

    public GardenItem? Item { get; set; }

    /// <summary>Le type d'intervention qui fait la tâche quand il est noté au journal.</summary>
    public JournalEntryKind Kind { get; set; }

    public string? Title { get; set; }

    public TaskRecurrence Recurrence { get; set; }

    /// <summary>Renseigné pour une tâche tous les N jours uniquement.</summary>
    public int? IntervalDays { get; set; }

    /// <summary>
    /// Tous les N jours : première échéance. Chaque année : la date anniversaire, à partir de cette
    /// année-là. Une seule fois : le jour prévu.
    /// </summary>
    public DateOnly StartDate { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
