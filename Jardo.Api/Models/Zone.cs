namespace Jardo.Api.Models;

/// <summary>
/// Une zone du potager : un carré, une plate-bande, une serre…
/// </summary>
public class Zone
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<Plant> Plants { get; set; } = new List<Plant>();
}
