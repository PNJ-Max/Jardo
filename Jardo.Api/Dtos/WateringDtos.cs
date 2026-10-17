using System.ComponentModel.DataAnnotations;
using Jardo.Api.Models;

namespace Jardo.Api.Dtos;

/// <summary>Corps de requête pour enregistrer un arrosage. Tous les champs sont optionnels.</summary>
public class CreateWateringDto
{
    /// <summary>Jour de l'arrosage. Si absent, la date du jour.</summary>
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

/// <summary>Résultat d'un arrosage de zone entière.</summary>
public class ZoneWateringResultDto
{
    public int ZoneId { get; set; }
    public string ZoneName { get; set; } = string.Empty;
    public DateOnly WateredAt { get; set; }
    public int PlantsWatered { get; set; }
}
