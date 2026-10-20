using Jardo.Api.Dtos;

namespace Jardo.Api.Services;

/// <summary>
/// Gestion des tas de bois de chauffage. Stock restant et état de séchage sont calculés à chaque lecture.
/// </summary>
public interface IWoodPileService
{
    /// <summary>
    /// Liste les tas de bois.
    /// </summary>
    /// <param name="spaceId">Ne garder que les tas de cet espace. Null = tous les espaces.</param>
    /// <param name="zoneId">Ne garder que les tas de cette zone. Null = toutes les zones.</param>
    /// <param name="includeArchived">Inclure les tas archivés et ceux des espaces archivés. Faux par défaut.</param>
    Task<List<WoodPileResponseDto>> GetAllAsync(
        int? spaceId = null,
        int? zoneId = null,
        bool includeArchived = false,
        CancellationToken cancellationToken = default);

    /// <summary>Un tas par son identifiant.</summary>
    /// <exception cref="Infrastructure.NotFoundException">Le tas n'existe pas.</exception>
    Task<WoodPileResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>Crée un tas dans un espace bois de chauffage, et éventuellement dans une de ses zones.</summary>
    /// <exception cref="Infrastructure.BusinessRuleException">
    /// L'espace n'existe pas, est archivé ou n'est pas un espace bois de chauffage ; ou la zone
    /// n'appartient pas à l'espace.
    /// </exception>
    Task<WoodPileResponseDto> CreateAsync(SaveWoodPileDto dto, CancellationToken cancellationToken = default);

    /// <summary>
    /// Modifie un tas. Permet aussi de le déplacer vers un autre espace bois de chauffage ou une autre
    /// zone ; ses entrées de journal et ses tâches le suivent.
    /// </summary>
    /// <exception cref="Infrastructure.NotFoundException">Le tas n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">
    /// Mêmes règles qu'à la création ; ou le nouveau volume initial laisserait un stock négatif.
    /// </exception>
    Task<WoodPileResponseDto> UpdateAsync(int id, SaveWoodPileDto dto, CancellationToken cancellationToken = default);

    /// <summary>
    /// Archive ou réactive un tas. Un tas archivé sort des tâches dues mais conserve tout son historique.
    /// </summary>
    /// <exception cref="Infrastructure.NotFoundException">Le tas n'existe pas.</exception>
    Task<WoodPileResponseDto> SetArchivedAsync(int id, bool isArchived, CancellationToken cancellationToken = default);

    /// <summary>
    /// Supprime définitivement un tas, ainsi que ses entrées de journal et ses tâches.
    /// Pour un tas épuisé, préférer <see cref="SetArchivedAsync"/>.
    /// </summary>
    /// <exception cref="Infrastructure.NotFoundException">Le tas n'existe pas.</exception>
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
