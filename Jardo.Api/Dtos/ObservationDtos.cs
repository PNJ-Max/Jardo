using System.ComponentModel.DataAnnotations;
using Jardo.Api.Models;

namespace Jardo.Api.Dtos;

/// <summary>
/// Corps de requête pour ajouter une entrée au journal d'une plante.
/// </summary>
/// <remarks>
/// Une seule requête porte la note, la mesure et le problème, parce que c'est ainsi
/// qu'on les saisit dans la réalité : « 20 cm, feuilles jaunes, traité au savon noir ».
/// Voir <see cref="Observation"/> pour le raisonnement complet sur ce choix.
/// </remarks>
public class CreateObservationDto
{
    /// <summary>Jour de l'observation. Si absent, le service prend la date du jour.</summary>
    public DateOnly? ObservedAt { get; set; }

    /// <summary>Note libre. Seul champ réellement obligatoire.</summary>
    [Required]
    [StringLength(1000, MinimumLength = 1)]
    public string Note { get; set; } = string.Empty;

    /// <summary>Hauteur mesurée en centimètres, si la mesure a été prise.</summary>
    // 1000 cm = 10 m : au-delà, ce n'est plus un potager. La borne attrape surtout les
    // erreurs de saisie (une virgule oubliée, une valeur en millimètres).
    [Range(0, 1000)]
    public int? HeightCm { get; set; }

    /// <summary>Problème constaté : maladie, parasite, carence.</summary>
    [MaxLength(500)]
    public string? ProblemNote { get; set; }

    /// <summary>Traitement appliqué en réponse au problème.</summary>
    [MaxLength(500)]
    public string? Treatment { get; set; }
}

/// <summary>Une entrée de journal telle que renvoyée par l'API.</summary>
public class ObservationResponseDto
{
    public int Id { get; set; }
    public int PlantId { get; set; }
    public DateOnly ObservedAt { get; set; }
    public string Note { get; set; } = string.Empty;
    public int? HeightCm { get; set; }
    public string? ProblemNote { get; set; }
    public string? Treatment { get; set; }

    public static ObservationResponseDto FromEntity(Observation observation) => new()
    {
        Id = observation.Id,
        PlantId = observation.PlantId,
        ObservedAt = observation.ObservedAt,
        Note = observation.Note,
        HeightCm = observation.HeightCm,
        ProblemNote = observation.ProblemNote,
        Treatment = observation.Treatment
    };
}
