using System.ComponentModel.DataAnnotations;
using Jardo.Api.Models;

namespace Jardo.Api.Dtos;

/// <summary>
/// Corps de requête pour noter ou corriger une intervention. La cible est un espace, et
/// éventuellement une de ses zones ou un de ses éléments. Les champs facultatifs dépendent du type :
/// quantité pour la récolte et le bois, hauteur pour l'observation, problème et traitement pour
/// l'observation et le traitement.
/// </summary>
public class SaveJournalEntryDto
{
    /// <summary>Jour de l'intervention ; une date future est refusée.</summary>
    [Required]
    public DateOnly? Date { get; set; }

    /// <summary>
    /// Watering, Sowing, Planting, Pruning, Treatment, Fertilizing, Harvest, Observation,
    /// WoodSupply, WoodConsumption ou Other.
    /// </summary>
    [Required]
    [EnumDataType(typeof(JournalEntryKind))]
    public JournalEntryKind? Kind { get; set; }

    [MaxLength(1000)]
    public string? Note { get; set; }

    [Range(0.001, 100000)]
    public double? Quantity { get; set; }

    /// <summary>Kilograms, Grams, Pieces ou Steres (le bois se note en stères).</summary>
    [EnumDataType(typeof(MeasureUnit))]
    public MeasureUnit? QuantityUnit { get; set; }

    [Range(0, 1000)]
    public int? HeightCm { get; set; }

    [MaxLength(500)]
    public string? Problem { get; set; }

    [MaxLength(500)]
    public string? Treatment { get; set; }

    [Range(1, int.MaxValue)]
    public int SpaceId { get; set; }

    [Range(1, int.MaxValue)]
    public int? ZoneId { get; set; }

    /// <summary>Si l'élément est dans une zone, l'entrée la prend d'office.</summary>
    [Range(1, int.MaxValue)]
    public int? ItemId { get; set; }
}

/// <summary>Une entrée du journal telle que renvoyée par l'API, avec le nom de sa cible.</summary>
public class JournalEntryResponseDto
{
    public int Id { get; set; }
    public DateOnly Date { get; set; }
    public JournalEntryKind Kind { get; set; }
    public string? Note { get; set; }
    public double? Quantity { get; set; }
    public MeasureUnit? QuantityUnit { get; set; }
    public int? HeightCm { get; set; }
    public string? Problem { get; set; }
    public string? Treatment { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public int SpaceId { get; set; }
    public string SpaceName { get; set; } = string.Empty;
    public int? ZoneId { get; set; }
    public string? ZoneName { get; set; }

    /// <summary>Null pour une entrée sur une zone ou sur tout l'espace.</summary>
    public int? ItemId { get; set; }

    public string? ItemName { get; set; }
}
