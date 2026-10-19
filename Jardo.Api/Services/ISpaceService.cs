using Jardo.Api.Dtos;

namespace Jardo.Api.Services;

/// <summary>
/// Gestion des espaces du jardin.
/// </summary>
public interface ISpaceService
{
    /// <summary>Les espaces, triés par nom, avec leurs compteurs.</summary>
    /// <param name="includeArchived">Inclure les espaces archivés. Faux par défaut.</param>
    Task<List<SpaceResponseDto>> GetAllAsync(bool includeArchived = false, CancellationToken cancellationToken = default);

    /// <exception cref="Infrastructure.NotFoundException">L'espace n'existe pas.</exception>
    Task<SpaceResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>Crée un espace dans le jardin.</summary>
    /// <exception cref="Infrastructure.BusinessRuleException">Un espace porte déjà ce nom.</exception>
    Task<SpaceResponseDto> CreateAsync(SaveSpaceDto dto, CancellationToken cancellationToken = default);

    /// <summary>Modifie un espace, type compris.</summary>
    /// <exception cref="Infrastructure.NotFoundException">L'espace n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">
    /// Un autre espace porte déjà ce nom, ou le nouveau type n'accepte pas le contenu actuel ou le journal.
    /// </exception>
    Task<SpaceResponseDto> UpdateAsync(int id, SaveSpaceDto dto, CancellationToken cancellationToken = default);

    /// <summary>
    /// Archive ou réactive un espace. Archivé, il sort de la liste par défaut et n'accueille plus
    /// rien de nouveau ; son contenu est conservé.
    /// </summary>
    /// <exception cref="Infrastructure.NotFoundException">L'espace n'existe pas.</exception>
    Task<SpaceResponseDto> SetArchivedAsync(int id, bool isArchived, CancellationToken cancellationToken = default);

    /// <summary>Supprime un espace sans élément, avec ses zones et son journal.</summary>
    /// <exception cref="Infrastructure.NotFoundException">L'espace n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">L'espace contient encore des éléments.</exception>
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
