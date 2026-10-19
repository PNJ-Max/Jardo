namespace Jardo.Api.Models;

/// <summary>Le type d'une intervention notée au journal.</summary>
public enum JournalEntryKind
{
    Watering = 0,
    Sowing = 1,
    Planting = 2,
    Pruning = 3,
    Treatment = 4,
    Fertilizing = 5,
    Harvest = 6,
    Observation = 7,
    WoodSupply = 8,
    WoodConsumption = 9,
    Other = 10
}

public static class JournalEntryKindExtensions
{
    public static bool IsWood(this JournalEntryKind kind)
        => kind is JournalEntryKind.WoodSupply or JournalEntryKind.WoodConsumption;

    public static bool AcceptsQuantity(this JournalEntryKind kind)
        => kind is JournalEntryKind.Harvest || kind.IsWood();

    /// <summary>
    /// Le bois ne se note que dans un espace bois de chauffage, les soins aux plantes que là où
    /// l'on peut en avoir ; une observation ou une autre intervention se note partout.
    /// </summary>
    public static bool IsAllowedIn(this JournalEntryKind kind, SpaceKind spaceKind) => kind switch
    {
        JournalEntryKind.WoodSupply or JournalEntryKind.WoodConsumption => spaceKind is SpaceKind.Firewood,
        JournalEntryKind.Observation or JournalEntryKind.Other => true,
        _ => spaceKind.AcceptsPlants()
    };

    /// <summary>Libellé pour les messages renvoyés à l'utilisateur.</summary>
    public static string Label(this JournalEntryKind kind) => kind switch
    {
        JournalEntryKind.Watering => "arrosage",
        JournalEntryKind.Sowing => "semis",
        JournalEntryKind.Planting => "plantation",
        JournalEntryKind.Pruning => "taille",
        JournalEntryKind.Treatment => "traitement",
        JournalEntryKind.Fertilizing => "fertilisation",
        JournalEntryKind.Harvest => "récolte",
        JournalEntryKind.Observation => "observation",
        JournalEntryKind.WoodSupply => "apport de bois",
        JournalEntryKind.WoodConsumption => "consommation de bois",
        JournalEntryKind.Other => "autre",
        _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, null)
    };
}
