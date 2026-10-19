using System.ComponentModel.DataAnnotations;
using Jardo.Api.Models;

namespace Jardo.Api.Dtos;

/// <summary>
/// Corps de requête pour créer ou modifier un espace. Changer le type d'un espace existant est
/// refusé si son contenu n'y est pas autorisé.
/// </summary>
public class SaveSpaceDto
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    // Nullable pour qu'un type absent soit refusé au lieu de valoir VegetableGarden ;
    // EnumDataType refuse les valeurs numériques hors énumération.
    /// <summary>VegetableGarden, Orchard, SmallFruit, Firewood ou Greenhouse.</summary>
    [Required]
    [EnumDataType(typeof(SpaceKind))]
    public SpaceKind? Kind { get; set; }
}

/// <summary>Un espace tel que renvoyé par l'API.</summary>
public class SpaceResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public SpaceKind Kind { get; set; }
    public bool IsArchived { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public int ZoneCount { get; set; }

    /// <summary>Nombre d'éléments actifs (non archivés).</summary>
    public int ItemCount { get; set; }

    /// <summary>
    /// Nombre de tâches de l'espace à faire aujourd'hui ou en retard, hors éléments archivés.
    /// Toujours 0 pour un espace archivé.
    /// </summary>
    public int DueTaskCount { get; set; }

    public static SpaceResponseDto FromEntity(Space space, int zoneCount, int itemCount, int dueTaskCount) => new()
    {
        Id = space.Id,
        Name = space.Name,
        Description = space.Description,
        Kind = space.Kind,
        IsArchived = space.IsArchived,
        CreatedAt = space.CreatedAt,
        ZoneCount = zoneCount,
        ItemCount = itemCount,
        DueTaskCount = dueTaskCount
    };
}
