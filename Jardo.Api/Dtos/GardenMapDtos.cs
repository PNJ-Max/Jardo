using System.ComponentModel.DataAnnotations;
using Jardo.Api.Models;

namespace Jardo.Api.Dtos;

/// <summary>
/// Corps de requête pour remplacer la carte du jardin : le modèle et toutes les affectations.
/// Ce qui n'est pas listé est libéré.
/// </summary>
public class SaveGardenMapDto
{
    /// <summary>Clé du modèle de carte, « country-house » ou « terraced-long ». Null pour retirer la carte.</summary>
    [StringLength(50)]
    public string? Layout { get; set; }

    [Required]
    public List<SaveGardenMapSlotDto> Slots { get; set; } = [];
}

/// <summary>Une affectation de la carte : l'espace, ou la zone d'un espace, posé sur un emplacement.</summary>
public class SaveGardenMapSlotDto
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string SlotKey { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int SpaceId { get; set; }

    /// <summary>Obligatoire pour un emplacement de carré du potager, interdite pour les autres.</summary>
    [Range(1, int.MaxValue)]
    public int? ZoneId { get; set; }
}

/// <summary>La carte du jardin : de quoi la dessiner en un appel.</summary>
public class GardenMapResponseDto
{
    /// <summary>Clé du modèle de carte. Null tant que la carte n'est pas configurée.</summary>
    public string? Layout { get; set; }

    public List<GardenMapSlotResponseDto> Slots { get; set; } = [];
}

/// <summary>Un emplacement occupé. Les emplacements libres du modèle n'y figurent pas.</summary>
public class GardenMapSlotResponseDto
{
    public string SlotKey { get; set; } = string.Empty;
    public int SpaceId { get; set; }
    public string SpaceName { get; set; } = string.Empty;
    public SpaceKind SpaceKind { get; set; }
    public int? ZoneId { get; set; }
    public string? ZoneName { get; set; }
}
