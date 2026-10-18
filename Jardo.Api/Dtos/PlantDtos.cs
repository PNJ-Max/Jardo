using System.ComponentModel.DataAnnotations;
using Jardo.Api.Models;

namespace Jardo.Api.Dtos;

/// <summary>
/// Corps de requête pour créer ou modifier une plante. Changer d'espace ou de zone la déplace ;
/// la zone, facultative, doit appartenir à l'espace.
/// </summary>
public class SavePlantDto
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Species { get; set; }

    [MaxLength(100)]
    public string? Variety { get; set; }

    [Range(0.01, 100000)]
    public double Quantity { get; set; } = 1;

    /// <summary>Plants (pieds), Rows (rangs) ou SquareMeters (m²).</summary>
    [EnumDataType(typeof(QuantityUnit))]
    public QuantityUnit QuantityUnit { get; set; } = QuantityUnit.Plants;

    public DateOnly? SownDate { get; set; }

    public DateOnly? PlantedDate { get; set; }

    /// <summary>Nombre de jours entre deux arrosages.</summary>
    [Range(1, 365)]
    public int WateringIntervalDays { get; set; } = 3;

    [Range(1, int.MaxValue)]
    public int SpaceId { get; set; }

    [Range(1, int.MaxValue)]
    public int? ZoneId { get; set; }
}

/// <summary>Représentation d'une plante renvoyée par l'API, état d'arrosage compris.</summary>
public class PlantResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Species { get; set; }
    public string? Variety { get; set; }
    public double Quantity { get; set; }
    public QuantityUnit QuantityUnit { get; set; }
    public DateOnly? SownDate { get; set; }
    public DateOnly? PlantedDate { get; set; }
    public int WateringIntervalDays { get; set; }
    public bool IsArchived { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public int SpaceId { get; set; }
    public string SpaceName { get; set; } = string.Empty;
    public int? ZoneId { get; set; }
    public string? ZoneName { get; set; }

    // Voyant d'arrosage : recalculé à chaque lecture, jamais stocké.
    public DateOnly? LastWateredAt { get; set; }

    public DateOnly NextWateringDate { get; set; }

    /// <summary>Ok (vert), DueSoon (orange, échéance aujourd'hui), Overdue (rouge).</summary>
    public WateringStatus WateringStatus { get; set; }

    /// <summary>Jours de retard, 0 si l'échéance n'est pas dépassée.</summary>
    public int DaysOverdue { get; set; }

    public bool NeedsWater => WateringStatus != Models.WateringStatus.Ok;

    public static PlantResponseDto FromEntity(
        Plant plant,
        WateringState state,
        string spaceName,
        string? zoneName) => new()
    {
        Id = plant.Id,
        Name = plant.Name,
        Species = plant.Species,
        Variety = plant.Variety,
        Quantity = plant.Quantity,
        QuantityUnit = plant.QuantityUnit,
        SownDate = plant.SownDate,
        PlantedDate = plant.PlantedDate,
        WateringIntervalDays = plant.WateringIntervalDays,
        IsArchived = plant.IsArchived,
        CreatedAt = plant.CreatedAt,
        SpaceId = plant.SpaceId,
        SpaceName = spaceName,
        ZoneId = plant.ZoneId,
        ZoneName = zoneName,
        LastWateredAt = state.LastWateredAt,
        NextWateringDate = state.NextDueDate,
        WateringStatus = state.Status,
        DaysOverdue = state.DaysOverdue
    };
}
