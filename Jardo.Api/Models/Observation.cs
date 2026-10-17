namespace Jardo.Api.Models;

/// <summary>
/// Une entrée du journal de suivi d'une plante. Note, mesure et problème constaté sont une seule
/// entité : ils se saisissent d'un même geste. Pas de photo dans le MVP.
/// </summary>
public class Observation
{
    public int Id { get; set; }

    public int PlantId { get; set; }

    public Plant Plant { get; set; } = null!;

    public DateOnly ObservedAt { get; set; }

    public string Note { get; set; } = string.Empty;

    public int? HeightCm { get; set; }

    public string? ProblemNote { get; set; }

    public string? Treatment { get; set; }
}
