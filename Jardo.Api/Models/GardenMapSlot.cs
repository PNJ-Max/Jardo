namespace Jardo.Api.Models;

/// <summary>
/// Affecte un espace, ou une zone de cet espace, à un emplacement du modèle de carte du jardin.
/// Supprimer l'espace ou la zone libère l'emplacement.
/// </summary>
public class GardenMapSlot
{
    public int Id { get; set; }

    public int GardenId { get; set; }

    public Garden Garden { get; set; } = null!;

    /// <summary>Clé de l'emplacement dans le modèle du jardin (voir <c>GardenLayouts</c>).</summary>
    public string SlotKey { get; set; } = string.Empty;

    public int SpaceId { get; set; }

    public Space Space { get; set; } = null!;

    /// <summary>Renseignée seulement pour un emplacement qui accueille une zone, un carré du potager.</summary>
    public int? ZoneId { get; set; }

    public Zone? Zone { get; set; }
}
