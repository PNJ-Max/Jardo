namespace Jardo.Api.Models;

/// <summary>
/// Une intervention faite au jardin. Elle vise toujours un espace, et parfois plus précisément une
/// zone ou un élément de cet espace ; une entrée sur une zone ou un espace vaut pour les éléments
/// qu'ils contiennent (voir <see cref="Services.LatestInterventions"/>).
/// </summary>
public class JournalEntry
{
    public int Id { get; set; }

    public int SpaceId { get; set; }

    public Space Space { get; set; } = null!;

    /// <summary>
    /// Renseignée pour une entrée sur une zone, et pour une entrée sur un élément situé dans une zone :
    /// le journal d'une zone se lit ainsi sans jointure.
    /// </summary>
    public int? ZoneId { get; set; }

    public Zone? Zone { get; set; }

    public int? ItemId { get; set; }

    public GardenItem? Item { get; set; }

    /// <summary>Jour de l'intervention, jamais dans le futur.</summary>
    public DateOnly Date { get; set; }

    public JournalEntryKind Kind { get; set; }

    public string? Note { get; set; }

    /// <summary>Récolte ou bois uniquement, toujours avec son unité.</summary>
    public double? Quantity { get; set; }

    public MeasureUnit? QuantityUnit { get; set; }

    public int? HeightCm { get; set; }

    public string? Problem { get; set; }

    public string? Treatment { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
