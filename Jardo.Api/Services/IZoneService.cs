using Jardo.Api.Dtos;

namespace Jardo.Api.Services;

/// <summary>
/// Gestion des zones, subdivisions facultatives d'un espace.
/// </summary>
public interface IZoneService
{
    /// <summary>Les zones d'un espace, triées par nom, avec leurs compteurs.</summary>
    /// <exception cref="Infrastructure.NotFoundException">L'espace n'existe pas.</exception>
    Task<List<ZoneResponseDto>> GetBySpaceAsync(int spaceId, CancellationToken cancellationToken = default);

    /// <summary>Une zone par son identifiant.</summary>
    /// <exception cref="Infrastructure.NotFoundException">La zone n'existe pas.</exception>
    Task<ZoneResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>Crée une zone dans un espace.</summary>
    /// <exception cref="Infrastructure.NotFoundException">L'espace n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">
    /// L'espace est archivé, ou une de ses zones porte déjà ce nom.
    /// </exception>
    Task<ZoneResponseDto> CreateAsync(int spaceId, SaveZoneDto dto, CancellationToken cancellationToken = default);

    /// <summary>Modifie une zone ; elle reste dans son espace.</summary>
    /// <exception cref="Infrastructure.NotFoundException">La zone n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">Une autre zone de l'espace porte déjà ce nom.</exception>
    Task<ZoneResponseDto> UpdateAsync(int id, SaveZoneDto dto, CancellationToken cancellationToken = default);

    /// <summary>Supprime une zone sans élément, avec les entrées de journal et les tâches notées sur elle.</summary>
    /// <exception cref="Infrastructure.NotFoundException">La zone n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">La zone contient encore des éléments.</exception>
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
