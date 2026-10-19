using System.ComponentModel.DataAnnotations;

namespace Jardo.Api.Dtos;

/// <summary>
/// Corps de requête des raccourcis d'arrosage d'une plante ou d'une zone. Tous les champs sont
/// optionnels.
/// </summary>
public class CreateWateringDto
{
    /// <summary>Jour de l'arrosage. Si absent, la date du jour.</summary>
    public DateOnly? WateredAt { get; set; }

    [MaxLength(1000)]
    public string? Note { get; set; }
}
