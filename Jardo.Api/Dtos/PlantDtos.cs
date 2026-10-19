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

    [Range(1, int.MaxValue)]
    public int SpaceId { get; set; }

    [Range(1, int.MaxValue)]
    public int? ZoneId { get; set; }
}

/// <summary>Représentation d'une plante renvoyée par l'API.</summary>
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
    public bool IsArchived { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public int SpaceId { get; set; }
    public string SpaceName { get; set; } = string.Empty;
    public int? ZoneId { get; set; }
    public string? ZoneName { get; set; }
}
