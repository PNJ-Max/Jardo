namespace Jardo.Api.Models;

/// <summary>
/// Une partie typée du jardin : le potager, le verger, le bois de chauffage…
/// </summary>
public class Space
{
    public int Id { get; set; }

    public int GardenId { get; set; }

    public Garden Garden { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public SpaceKind Kind { get; set; }

    /// <summary>
    /// Un espace archivé disparaît de la liste par défaut et n'accueille plus rien de nouveau ;
    /// son contenu et son historique sont conservés.
    /// </summary>
    public bool IsArchived { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<Zone> Zones { get; set; } = new List<Zone>();

    public ICollection<GardenItem> Items { get; set; } = new List<GardenItem>();
}
