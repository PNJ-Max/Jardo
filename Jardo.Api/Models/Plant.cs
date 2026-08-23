namespace Jardo.Api.Models;

/// <summary>
/// Une plante cultivée dans une zone. C'est l'entité centrale du modèle :
/// c'est elle qui porte la fréquence d'arrosage et à laquelle sont rattachés
/// les arrosages et les observations.
/// </summary>
public class Plant
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>Nom botanique, optionnel (ex. « Solanum lycopersicum »).</summary>
    public string? Species { get; set; }

    // DateOnly et non DateTimeOffset : on plante un jour, pas à un instant précis.
    // Utiliser un type qui ne porte pas d'heure évite d'avoir à gérer des heures
    // parasites dans les calculs de dates.
    public DateOnly? PlantedDate { get; set; }

    /// <summary>
    /// Nombre de jours entre deux arrosages (2 pour une tomate, 7 pour un arbuste établi).
    /// C'est la donnée qui alimente tout le calcul du voyant d'arrosage.
    /// </summary>
    public int WateringIntervalDays { get; set; }

    /// <summary>
    /// Plante archivée : fin de saison, arrachée, ou morte.
    /// On archive au lieu de supprimer pour conserver l'historique des saisons
    /// passées. Une plante archivée est exclue des calculs d'arrosage.
    /// </summary>
    public bool IsArchived { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    // --- Relation vers la zone parente ---

    /// <summary>Clé étrangère vers la zone. C'est cette colonne qui existe réellement en base.</summary>
    public int ZoneId { get; set; }

    // Navigation vers la zone. Le "= null!" dit au compilateur « fais-moi confiance,
    // ce ne sera pas null » : c'est EF Core qui la remplira quand on la demandera
    // explicitement (via Include). Sans ce "null!", le compilateur avertirait qu'une
    // propriété non-nullable n'est pas initialisée.
    public Zone Zone { get; set; } = null!;

    // --- Collections enfants ---

    public ICollection<WateringLog> WateringLogs { get; set; } = new List<WateringLog>();

    public ICollection<Observation> Observations { get; set; } = new List<Observation>();
}
