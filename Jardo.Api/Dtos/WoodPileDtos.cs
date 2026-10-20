using System.ComponentModel.DataAnnotations;
using Jardo.Api.Models;

namespace Jardo.Api.Dtos;

/// <summary>
/// Corps de requête pour créer ou modifier un tas de bois, dans un espace bois de chauffage.
/// Changer d'espace ou de zone le déplace ; la zone, facultative, doit appartenir à l'espace.
/// </summary>
public class SaveWoodPileDto
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    /// <summary>Essence : chêne, hêtre, charme…</summary>
    [MaxLength(100)]
    public string? WoodSpecies { get; set; }

    /// <summary>
    /// Volume du tas à sa constitution, en stères. Les apports (WoodSupply) s'y ajoutent et les
    /// consommations (WoodConsumption) s'en retranchent. Il ne peut pas descendre sous ce qui a déjà
    /// été consommé.
    /// </summary>
    [Required]
    [Range(0.01, 10000)]
    public double? InitialSteres { get; set; }

    [Range(10, 200)]
    public int? LogLengthCm { get; set; }

    [Required]
    public DateOnly? CutDate { get; set; }

    /// <summary>Durée de séchage à partir de la coupe, en mois ; 0 pour du bois acheté sec.</summary>
    [Required]
    [Range(0, 60)]
    public int? DryingMonths { get; set; }

    [Range(1, int.MaxValue)]
    public int SpaceId { get; set; }

    [Range(1, int.MaxValue)]
    public int? ZoneId { get; set; }
}

/// <summary>Un tas de bois tel que renvoyé par l'API, avec son stock et son séchage calculés.</summary>
public class WoodPileResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? WoodSpecies { get; set; }
    public double InitialSteres { get; set; }
    public int? LogLengthCm { get; set; }
    public DateOnly CutDate { get; set; }
    public int DryingMonths { get; set; }
    public bool IsArchived { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public int SpaceId { get; set; }
    public string SpaceName { get; set; } = string.Empty;
    public int? ZoneId { get; set; }
    public string? ZoneName { get; set; }

    /// <summary>
    /// Stock restant en stères : volume initial, plus les apports, moins les consommations notés au
    /// journal sur ce tas. Une entrée notée sur l'espace ou la zone, sans tas, n'y compte pas.
    /// </summary>
    public double RemainingSteres { get; set; }

    /// <summary>Drying (en séchage) ou Ready (prêt à brûler).</summary>
    public DryingStatus DryingStatus { get; set; }

    /// <summary>Le jour où le bois est prêt à brûler : à venir si en séchage, passé s'il est prêt depuis.</summary>
    public DateOnly ReadyOn { get; set; }
}
