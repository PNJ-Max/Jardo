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

    /// <summary>Jours entre deux arrosages. 2 pour une tomate, 7 pour un arbuste établi.</summary>
    // Le maximum de 365 n'est pas arbitraire : au-delà, la valeur est presque
    // certainement une erreur de saisie, et une borne haute évite les échéances absurdes.
    [Range(1, 365)]
    public int WateringIntervalDays { get; set; } = 3;

    /// <summary>Zone d'accueil. Son existence est vérifiée par le service.</summary>
    [Range(1, int.MaxValue)]
    public int ZoneId { get; set; }
}

/// <summary>
/// Corps de requête pour modifier une plante. Le déplacement vers une autre zone
/// est autorisé : il suffit de renvoyer un ZoneId différent.
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

/// <summary>
/// Représentation d'une plante renvoyée par l'API, état d'arrosage compris.
/// </summary>
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

    /// <summary>
    /// Nom de la zone, recopié ici pour que le front puisse afficher « Tomate — Potager »
    /// sans avoir à faire un second appel pour récupérer la zone.
    /// </summary>
    public string ZoneName { get; set; } = string.Empty;

    // --- Le voyant d'arrosage : recalculé à chaque lecture, jamais stocké ---

    public DateOnly? LastWateredAt { get; set; }

    public DateOnly NextWateringDate { get; set; }

    /// <summary>Ok (vert), DueSoon (orange, échéance aujourd'hui), Overdue (rouge).</summary>
    public WateringStatus WateringStatus { get; set; }

    /// <summary>Jours de retard, 0 si l'échéance n'est pas dépassée. Sert à trier par urgence.</summary>
    public int DaysOverdue { get; set; }

    /// <summary>
    /// Raccourci de confort pour le front : faut-il allumer un voyant ?
    /// Propriété calculée, donc pas de champ à maintenir en cohérence.
    /// </summary>
    public bool NeedsWater => WateringStatus != Models.WateringStatus.Ok;

    /// <summary>
    /// Construit le DTO à partir de l'entité et de son état d'arrosage déjà calculé.
    /// </summary>
    /// <remarks>
    /// L'état est passé en paramètre plutôt que calculé ici : ce mapping doit rester une
    /// simple recopie de champs. Un mapping qui contient du calcul métier est un endroit
    /// où personne ne pense à aller chercher un bug.
    /// </remarks>
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
