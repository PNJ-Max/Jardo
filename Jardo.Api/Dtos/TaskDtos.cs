using System.ComponentModel.DataAnnotations;
using Jardo.Api.Models;

namespace Jardo.Api.Dtos;

/// <summary>
/// Corps de requête pour créer ou modifier une tâche. La cible suit les règles du journal : un
/// espace, et éventuellement une de ses zones ou un de ses éléments.
/// </summary>
public class SaveTaskDto
{
    /// <summary>
    /// Le type d'intervention qui fait la tâche : Watering, Sowing, Planting, Pruning, Treatment,
    /// Fertilizing, Harvest, Observation, WoodSupply, WoodConsumption ou Other.
    /// </summary>
    [Required]
    [EnumDataType(typeof(JournalEntryKind))]
    public JournalEntryKind? Kind { get; set; }

    /// <summary>Facultatif, sauf pour une tâche Other.</summary>
    [MaxLength(100)]
    public string? Title { get; set; }

    /// <summary>EveryNDays, Yearly ou Once.</summary>
    [Required]
    [EnumDataType(typeof(TaskRecurrence))]
    public TaskRecurrence? Recurrence { get; set; }

    /// <summary>Obligatoire pour EveryNDays, refusé sinon.</summary>
    [Range(1, 365)]
    public int? IntervalDays { get; set; }

    /// <summary>
    /// EveryNDays : première échéance. Yearly : la date anniversaire, à partir de cette année-là.
    /// Once : le jour prévu.
    /// </summary>
    [Required]
    public DateOnly? StartDate { get; set; }

    [Range(1, int.MaxValue)]
    public int SpaceId { get; set; }

    [Range(1, int.MaxValue)]
    public int? ZoneId { get; set; }

    /// <summary>Si l'élément est dans une zone, la tâche la prend d'office.</summary>
    [Range(1, int.MaxValue)]
    public int? ItemId { get; set; }
}

/// <summary>Corps de requête de l'action « Fait ». Tous les champs sont optionnels.</summary>
public class CompleteTaskDto
{
    /// <summary>Jour où la tâche a été faite. Si absent, la date du jour ; une date future est refusée.</summary>
    public DateOnly? Date { get; set; }

    /// <summary>La note de l'entrée du journal. Si absente, le titre de la tâche.</summary>
    [MaxLength(1000)]
    public string? Note { get; set; }
}

/// <summary>Réponse de l'action « Fait ».</summary>
public class TaskCompletionResponseDto
{
    /// <summary>La tâche, échéance recalculée.</summary>
    public TaskResponseDto Task { get; set; } = null!;

    /// <summary>L'entrée notée au journal : la supprimer annule le « Fait ».</summary>
    public JournalEntryResponseDto Entry { get; set; } = null!;
}

/// <summary>Jusqu'où regarder les tâches dues.</summary>
public enum DueHorizon
{
    /// <summary>À faire aujourd'hui ou en retard.</summary>
    Today = 0,

    /// <summary>Les sept prochains jours, aujourd'hui compris, plus les retards.</summary>
    Week = 1
}

/// <summary>Une tâche telle que renvoyée par l'API, avec le nom de sa cible et son échéance.</summary>
public class TaskResponseDto
{
    public int Id { get; set; }
    public JournalEntryKind Kind { get; set; }
    public string? Title { get; set; }
    public TaskRecurrence Recurrence { get; set; }
    public int? IntervalDays { get; set; }
    public DateOnly StartDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public int SpaceId { get; set; }
    public string SpaceName { get; set; } = string.Empty;
    public int? ZoneId { get; set; }
    public string? ZoneName { get; set; }

    /// <summary>Null pour une tâche sur une zone ou sur tout l'espace.</summary>
    public int? ItemId { get; set; }

    public string? ItemName { get; set; }

    /// <summary>Plant ou WoodPile ; null sans élément visé.</summary>
    public ItemKind? ItemKind { get; set; }

    // Échéance : recalculée à chaque lecture, jamais stockée.

    /// <summary>La dernière intervention de même type qui vaut pour la cible.</summary>
    public DateOnly? LastDoneOn { get; set; }

    /// <summary>Null pour une tâche ponctuelle faite.</summary>
    public DateOnly? NextDueDate { get; set; }

    /// <summary>Ok (vert), DueSoon (orange, échéance aujourd'hui), Overdue (rouge).</summary>
    public DueStatus Status { get; set; }

    /// <summary>Jours de retard, 0 si l'échéance n'est pas dépassée.</summary>
    public int DaysOverdue { get; set; }

    /// <summary>Vrai pour une tâche ponctuelle faite.</summary>
    public bool IsCompleted => NextDueDate is null;
}
