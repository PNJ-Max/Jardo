using System.ComponentModel.DataAnnotations;
using Jardo.Api.Models;

namespace Jardo.Api.Dtos;

/// <summary>Corps de requête pour ajouter une entrée au journal d'une plante.</summary>
public class CreateObservationDto
{
    /// <summary>Jour de l'observation. Si absent, la date du jour.</summary>
    public DateOnly? ObservedAt { get; set; }

    [Required]
    [StringLength(1000, MinimumLength = 1)]
    public string Note { get; set; } = string.Empty;

    [Range(0, 1000)]
    public int? HeightCm { get; set; }

    [MaxLength(500)]
    public string? ProblemNote { get; set; }

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
