using System.ComponentModel.DataAnnotations;
using Jardo.Api.Models;

namespace Jardo.Api.Dtos;

/// <summary>Corps de requête pour renommer le jardin.</summary>
public class UpdateGardenDto
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;
}

/// <summary>Le jardin tel que renvoyé par l'API.</summary>
public class GardenResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }

    public static GardenResponseDto FromEntity(Garden garden) => new()
    {
        Id = garden.Id,
        Name = garden.Name,
        CreatedAt = garden.CreatedAt
    };
}
