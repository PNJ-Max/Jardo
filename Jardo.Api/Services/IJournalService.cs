using Jardo.Api.Dtos;
using Jardo.Api.Models;

namespace Jardo.Api.Services;

/// <summary>
/// Le journal d'interventions : ce qui a été fait au jardin, sur un espace, une zone ou un élément.
/// </summary>
public interface IJournalService
{
    /// <summary>
    /// Le journal, du plus récent au plus ancien. Sans cible, tout le jardin. Pour une cible, ce
    /// qui la concerne : ses entrées, celles de ce qu'elle contient, et celles notées sur la zone ou
    /// l'espace qui la contient (voir <see cref="LatestInterventions"/>).
    /// </summary>
    /// <param name="spaceId">Le journal de cet espace.</param>
    /// <param name="zoneId">Le journal de cette zone.</param>
    /// <param name="itemId">Le journal de cet élément.</param>
    /// <param name="kinds">Ne garder que ces types d'intervention. Vide ou null = tous.</param>
    /// <exception cref="Infrastructure.NotFoundException">La cible n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">Plusieurs cibles sont données.</exception>
    Task<List<JournalEntryResponseDto>> GetAllAsync(
        int? spaceId = null,
        int? zoneId = null,
        int? itemId = null,
        IReadOnlyCollection<JournalEntryKind>? kinds = null,
        CancellationToken cancellationToken = default);

    /// <exception cref="Infrastructure.NotFoundException">L'entrée n'existe pas.</exception>
    Task<JournalEntryResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>Note une intervention.</summary>
    /// <exception cref="Infrastructure.BusinessRuleException">
    /// Date future ; cible incohérente, archivée ou qui n'accueille pas ce type ; champs qui ne
    /// conviennent pas au type.
    /// </exception>
    Task<JournalEntryResponseDto> CreateAsync(SaveJournalEntryDto dto, CancellationToken cancellationToken = default);

    /// <summary>
    /// Corrige une entrée, cible comprise. Une entrée d'un élément ou d'un espace archivé reste
    /// corrigeable ; seule une nouvelle cible archivée est refusée.
    /// </summary>
    /// <exception cref="Infrastructure.NotFoundException">L'entrée n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">Mêmes règles qu'à la création.</exception>
    Task<JournalEntryResponseDto> UpdateAsync(int id, SaveJournalEntryDto dto, CancellationToken cancellationToken = default);

    /// <exception cref="Infrastructure.NotFoundException">L'entrée n'existe pas.</exception>
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
