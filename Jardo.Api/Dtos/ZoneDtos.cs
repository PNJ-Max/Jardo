using System.ComponentModel.DataAnnotations;
using Jardo.Api.Models;

namespace Jardo.Api.Dtos;

// DTOs regroupés par ressource : contrat d'entrée et de sortie lisibles dans un même fichier.

/// <summary>Corps de requête pour créer une zone.</summary>
public class CreateZoneDto
{
    // [Required] rejette aussi les chaînes d'espaces ; la normalisation (Trim) est faite par le service.
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }
}

/// <summary>Corps de requête pour modifier une zone.</summary>
public class UpdateZoneDto
{
    // Pas d'Id : la ressource est identifiée par l'URL.
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }
}

/// <summary>Représentation d'une zone renvoyée par l'API.</summary>
public class ZoneResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Nombre de plantes actives (non archivées).</summary>
    public int PlantCount { get; set; }

    /// <summary>Nombre de plantes dont l'arrosage est dû ou en retard.</summary>
    public int PlantsNeedingWater { get; set; }

    public static ZoneResponseDto FromEntity(Zone zone, int plantCount, int plantsNeedingWater) => new()
    {
        Id = zone.Id,
        Name = zone.Name,
        Description = zone.Description,
        CreatedAt = zone.CreatedAt,
        PlantCount = plantCount,
        PlantsNeedingWater = plantsNeedingWater
    };
}
