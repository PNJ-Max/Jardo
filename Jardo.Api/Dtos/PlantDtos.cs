using System.ComponentModel.DataAnnotations;
using Jardo.Api.Models;

namespace Jardo.Api.Dtos;

/// <summary>Corps de requête pour créer une plante.</summary>
public class CreatePlantDto
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Species { get; set; }

    public DateOnly? PlantedDate { get; set; }

    /// <summary>Nombre de jours entre deux arrosages.</summary>
    [Range(1, 365)]
    public int WateringIntervalDays { get; set; } = 3;

    [Range(1, int.MaxValue)]
    public int ZoneId { get; set; }
}

/// <summary>
/// Corps de requête pour modifier une plante. Un ZoneId différent la déplace vers cette zone.
/// </summary>
public class UpdatePlantDto
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Species { get; set; }

    public DateOnly? PlantedDate { get; set; }

    [Range(1, 365)]
    public int WateringIntervalDays { get; set; }

    [Range(1, int.MaxValue)]
    public int ZoneId { get; set; }
}

/// <summary>Représentation d'une plante renvoyée par l'API, état d'arrosage compris.</summary>
public class PlantResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Species { get; set; }
    public DateOnly? PlantedDate { get; set; }
    public int WateringIntervalDays { get; set; }
    public bool IsArchived { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public int ZoneId { get; set; }
    public string ZoneName { get; set; } = string.Empty;

    // Voyant d'arrosage : recalculé à chaque lecture, jamais stocké.
    public DateOnly? LastWateredAt { get; set; }

    public DateOnly NextWateringDate { get; set; }

    /// <summary>Ok (vert), DueSoon (orange, échéance aujourd'hui), Overdue (rouge).</summary>
    public WateringStatus WateringStatus { get; set; }

    /// <summary>Jours de retard, 0 si l'échéance n'est pas dépassée.</summary>
    public int DaysOverdue { get; set; }

    public bool NeedsWater => WateringStatus != Models.WateringStatus.Ok;

    public static PlantResponseDto FromEntity(Plant plant, WateringState state, string zoneName) => new()
    {
        Id = plant.Id,
        Name = plant.Name,
        Species = plant.Species,
        PlantedDate = plant.PlantedDate,
        WateringIntervalDays = plant.WateringIntervalDays,
        IsArchived = plant.IsArchived,
        CreatedAt = plant.CreatedAt,
        ZoneId = plant.ZoneId,
        ZoneName = zoneName,
        LastWateredAt = state.LastWateredAt,
        NextWateringDate = state.NextDueDate,
        WateringStatus = state.Status,
        DaysOverdue = state.DaysOverdue
    };
}
