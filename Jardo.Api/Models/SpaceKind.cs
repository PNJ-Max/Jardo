namespace Jardo.Api.Models;

/// <summary>
/// Le type d'un espace. Il décide de ce qu'on peut y ajouter.
/// </summary>
public enum SpaceKind
{
    VegetableGarden = 0,
    Orchard = 1,
    SmallFruit = 2,
    Firewood = 3,
    Greenhouse = 4
}

public static class SpaceKindExtensions
{
    public static bool AcceptsPlants(this SpaceKind kind) => kind is not SpaceKind.Firewood;

    public static bool AcceptsWoodPiles(this SpaceKind kind) => kind is SpaceKind.Firewood;

    /// <summary>Libellé pour les messages renvoyés à l'utilisateur.</summary>
    public static string Label(this SpaceKind kind) => kind switch
    {
        SpaceKind.VegetableGarden => "potager",
        SpaceKind.Orchard => "verger",
        SpaceKind.SmallFruit => "petits fruits",
        SpaceKind.Firewood => "bois de chauffage",
        SpaceKind.Greenhouse => "serre",
        _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, null)
    };
}
