using Jardo.Api.Dtos;

namespace Jardo.Api.Services;

/// <summary>
/// La carte du jardin : le modèle de scène choisi et les espaces posés sur ses emplacements.
/// </summary>
public interface IGardenMapService
{
    Task<GardenMapResponseDto> GetAsync(CancellationToken cancellationToken = default);

    /// <summary>Remplace le modèle et toutes les affectations, en une transaction.</summary>
    /// <exception cref="Infrastructure.BusinessRuleException">
    /// Modèle ou emplacement inconnu, emplacement affecté deux fois, espace ou zone inexistant,
    /// archivé ou incompatible avec l'emplacement, zone d'un autre espace, cible déjà posée ailleurs.
    /// </exception>
    Task<GardenMapResponseDto> ReplaceAsync(SaveGardenMapDto dto, CancellationToken cancellationToken = default);
}
