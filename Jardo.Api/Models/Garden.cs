namespace Jardo.Api.Models;

/// <summary>
/// Le jardin : la racine de tout ce qu'on suit. Un seul au MVP, créé par la migration ; l'entité
/// existe pour accueillir plus tard plusieurs jardins et le partage au sein d'un foyer.
/// </summary>
public class Garden
{
    /// <summary>Identifiant du jardin unique du MVP. Chaque usage est à revoir avec le multi-jardin.</summary>
    public const int DefaultId = 1;

    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<Space> Spaces { get; set; } = new List<Space>();
}
