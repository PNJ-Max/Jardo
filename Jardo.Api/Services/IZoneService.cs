using Jardo.Api.Dtos;

namespace Jardo.Api.Services;

/// <summary>
/// Gestion des zones du potager.
/// </summary>
public interface IZoneService
{
    /// <summary>Toutes les zones, triées par nom, avec leurs compteurs de plantes.</summary>
    Task<List<ZoneResponseDto>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Une zone par son identifiant.</summary>
    /// <exception cref="Infrastructure.NotFoundException">La zone n'existe pas.</exception>
    Task<ZoneResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>Crée une zone.</summary>
    /// <exception cref="Infrastructure.BusinessRuleException">Une zone porte déjà ce nom.</exception>
    Task<ZoneResponseDto> CreateAsync(CreateZoneDto dto, CancellationToken cancellationToken = default);

    /// <summary>Modifie une zone existante.</summary>
    /// <exception cref="Infrastructure.NotFoundException">La zone n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">Une autre zone porte déjà ce nom.</exception>
    Task<ZoneResponseDto> UpdateAsync(int id, UpdateZoneDto dto, CancellationToken cancellationToken = default);

    /// <summary>Supprime une zone, à condition qu'elle soit vide.</summary>
    /// <exception cref="Infrastructure.NotFoundException">La zone n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">La zone contient encore des plantes.</exception>
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
