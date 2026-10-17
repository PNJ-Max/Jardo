namespace Jardo.Api.Models;

/// <summary>
/// Une plante cultivée dans une zone ; porte la fréquence d'arrosage.
/// </summary>
public class Plant
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>Nom botanique, optionnel.</summary>
    public string? Species { get; set; }

    public DateOnly? PlantedDate { get; set; }

    public int WateringIntervalDays { get; set; }

    /// <summary>
    /// Archivée plutôt que supprimée en fin de saison, pour conserver l'historique.
    /// Une plante archivée est exclue des calculs d'arrosage.
    /// </summary>
    public bool IsArchived { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public int ZoneId { get; set; }

    public Zone Zone { get; set; } = null!;

    public ICollection<WateringLog> WateringLogs { get; set; } = new List<WateringLog>();

    public ICollection<Observation> Observations { get; set; } = new List<Observation>();
}
