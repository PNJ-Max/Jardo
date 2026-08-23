using System.ComponentModel.DataAnnotations;
using Jardo.Api.Models;

namespace Jardo.Api.Dtos;

/// <summary>
/// Corps de requête pour enregistrer un arrosage.
/// </summary>
/// <remarks>
/// Toutes les propriétés sont optionnelles : le cas d'usage normal est « je viens
/// d'arroser », donc un POST avec un corps vide doit suffire. Le service prendra la
/// date du jour par défaut. Une API dont le geste le plus fréquent demande le moins de
/// saisie possible est une API agréable à utiliser.
/// </remarks>
public class CreateWateringDto
{
    /// <summary>Jour de l'arrosage. Si absent, le service prend la date du jour.</summary>
    public DateOnly? WateredAt { get; set; }

    [MaxLength(500)]
    public string? Note { get; set; }
}

/// <summary>Un arrosage enregistré, tel que renvoyé par l'API.</summary>
public class WateringLogResponseDto
{
    public int Id { get; set; }
    public int PlantId { get; set; }
    public DateOnly WateredAt { get; set; }
    public string? Note { get; set; }

    public static WateringLogResponseDto FromEntity(WateringLog log) => new()
    {
        Id = log.Id,
        PlantId = log.PlantId,
        WateredAt = log.WateredAt,
        Note = log.Note
    };
}

/// <summary>
/// Résultat d'un arrosage de zone entière : combien de plantes ont été arrosées.
/// </summary>
/// <remarks>
/// Arroser une zone crée un enregistrement par plante active, et non un enregistrement
/// « de zone ». L'historique reste ainsi rattaché à la plante, qui est le seul niveau où
/// le calcul d'échéance a un sens — et une plante déplacée vers une autre zone garde son
/// historique.
/// </remarks>
public class ZoneWateringResultDto
{
    public int ZoneId { get; set; }
    public string ZoneName { get; set; } = string.Empty;
    public DateOnly WateredAt { get; set; }

    /// <summary>Nombre de plantes actives arrosées par l'opération.</summary>
    public int PlantsWatered { get; set; }
}
