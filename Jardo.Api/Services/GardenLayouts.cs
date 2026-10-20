using Jardo.Api.Models;

namespace Jardo.Api.Services;

/// <summary>Un emplacement d'un modèle de carte et ce qu'il accepte.</summary>
/// <param name="Key">Clé partagée avec le front, qui dessine l'emplacement sous la même clé.</param>
/// <param name="Kind">Type de l'espace accueilli, ou de l'espace dont on accueille une zone.</param>
/// <param name="AcceptsZone">Vrai si l'emplacement accueille une zone de l'espace plutôt que l'espace.</param>
public record MapSlotDefinition(string Key, SpaceKind Kind, bool AcceptsZone);

/// <param name="Key">Clé stockée dans <see cref="Garden.MapLayout"/>.</param>
public record GardenLayout(string Key, IReadOnlyList<MapSlotDefinition> Slots)
{
    public MapSlotDefinition? FindSlot(string slotKey)
        => Slots.FirstOrDefault(slot => slot.Key == slotKey);
}

/// <summary>
/// Catalogue des modèles de carte. Le dessin et l'emprise de chaque emplacement vivent côté front,
/// sous la même clé : renommer une clé casse le contrat avec lui.
/// </summary>
public static class GardenLayouts
{
    public const string TerracedLong = "terraced-long";

    private static readonly GardenLayout[] All =
    [
        // Maison mitoyenne, jardin en longueur.
        new(TerracedLong,
        [
            new("orchard", SpaceKind.Orchard, AcceptsZone: false),
            new("small-fruit", SpaceKind.SmallFruit, AcceptsZone: false),
            new("vegetable", SpaceKind.VegetableGarden, AcceptsZone: false),
            new("bed-1", SpaceKind.VegetableGarden, AcceptsZone: true),
            new("bed-2", SpaceKind.VegetableGarden, AcceptsZone: true),
            new("bed-3", SpaceKind.VegetableGarden, AcceptsZone: true),
            new("bed-4", SpaceKind.VegetableGarden, AcceptsZone: true),
            new("greenhouse", SpaceKind.Greenhouse, AcceptsZone: false),
            new("firewood", SpaceKind.Firewood, AcceptsZone: false)
        ])
    ];

    public static GardenLayout? Find(string key)
        => All.FirstOrDefault(layout => layout.Key == key);
}
