namespace Jardo.Api.Models;

/// <summary>
/// Un arrosage effectué. Journal en ajout seul : le dernier arrosage d'une plante est la ligne la plus récente.
/// </summary>
public class WateringLog
{
    public int Id { get; set; }

    public int PlantId { get; set; }

    public Plant Plant { get; set; } = null!;

    public DateOnly WateredAt { get; set; }

    public string? Note { get; set; }
}
