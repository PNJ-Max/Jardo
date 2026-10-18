namespace Jardo.Api.Models;

/// <summary>
/// Base commune de tout ce qu'on suit dans un espace. Héritage TPH : le journal et les tâches
/// pointeront vers une seule table.
/// </summary>
public abstract class GardenItem
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public int SpaceId { get; set; }

    public Space Space { get; set; } = null!;

    /// <summary>Facultative ; si renseignée, elle appartient au même espace que l'élément.</summary>
    public int? ZoneId { get; set; }

    public Zone? Zone { get; set; }

    /// <summary>
    /// Archivé plutôt que supprimé (fin de saison, arbre arraché) pour conserver l'historique.
    /// </summary>
    public bool IsArchived { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
