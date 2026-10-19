using System.ComponentModel.DataAnnotations;
using Jardo.Api.Models;

namespace Jardo.Api.Dtos;

// DTOs regroupés par ressource : contrat d'entrée et de sortie lisibles dans un même fichier.

/// <summary>Corps de requête pour créer ou modifier une zone. Son espace est donné par l'URL.</summary>
public class SaveZoneDto
{
    // [Required] rejette aussi les chaînes d'espaces ; la normalisation (Trim) est faite par le service.
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
    public int SpaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Nombre d'éléments actifs (non archivés).</summary>
    public int ItemCount { get; set; }

    /// <summary>Nombre de plantes dont l'arrosage est dû ou en retard.</summary>
    public int PlantsNeedingWater { get; set; }

    public static ZoneResponseDto FromEntity(Zone zone, int itemCount, int plantsNeedingWater) => new()
    {
        Id = zone.Id,
        SpaceId = zone.SpaceId,
        Name = zone.Name,
        Description = zone.Description,
        CreatedAt = zone.CreatedAt,
        ItemCount = itemCount,
        PlantsNeedingWater = plantsNeedingWater
    };
}
