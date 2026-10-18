namespace Jardo.Api.Models;

/// <summary>
/// Subdivision facultative d'un espace : un carré, une planche, un rang.
/// </summary>
public class Zone
{
    public int Id { get; set; }

    public int SpaceId { get; set; }

    public Space Space { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<GardenItem> Items { get; set; } = new List<GardenItem>();
}
