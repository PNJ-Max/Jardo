using Jardo.Api.Dtos;

namespace Jardo.Api.Services;

/// <summary>
/// Gestion des plantes : cultures, arbres et arbustes.
/// </summary>
public interface IPlantService
{
    /// <summary>
    /// Liste les plantes.
    /// </summary>
    /// <param name="spaceId">Ne garder que les plantes de cet espace. Null = tous les espaces.</param>
    /// <param name="zoneId">Ne garder que les plantes de cette zone. Null = toutes les zones.</param>
    /// <param name="includeArchived">
    /// Inclure les plantes archivées et celles des espaces archivés. Faux par défaut.
    /// </param>
    Task<List<PlantResponseDto>> GetAllAsync(
        int? spaceId = null,
        int? zoneId = null,
        bool includeArchived = false,
        CancellationToken cancellationToken = default);

    /// <summary>Une plante par son identifiant.</summary>
    /// <exception cref="Infrastructure.NotFoundException">La plante n'existe pas.</exception>
    Task<PlantResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>Crée une plante dans un espace, et éventuellement dans une de ses zones.</summary>
    /// <exception cref="Infrastructure.BusinessRuleException">
    /// L'espace n'existe pas, est archivé ou n'accueille pas de plantes ; ou la zone n'appartient
    /// pas à l'espace.
    /// </exception>
    Task<PlantResponseDto> CreateAsync(SavePlantDto dto, CancellationToken cancellationToken = default);

    /// <summary>
    /// Modifie une plante. Permet aussi de la déplacer vers un autre espace ou une autre zone ; ses
    /// entrées de journal et ses tâches la suivent.
    /// </summary>
    /// <exception cref="Infrastructure.NotFoundException">La plante n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">Mêmes règles qu'à la création.</exception>
    Task<PlantResponseDto> UpdateAsync(int id, SavePlantDto dto, CancellationToken cancellationToken = default);

    /// <summary>
    /// Archive ou réactive une plante. Une plante archivée sort des tâches dues
    /// mais conserve tout son historique.
    /// </summary>
    /// <exception cref="Infrastructure.NotFoundException">La plante n'existe pas.</exception>
    Task<PlantResponseDto> SetArchivedAsync(int id, bool isArchived, CancellationToken cancellationToken = default);

    /// <summary>
    /// Supprime définitivement une plante, ainsi que ses entrées de journal et ses tâches.
    /// Pour une plante en fin de vie, préférer <see cref="SetArchivedAsync"/>.
    /// </summary>
    /// <exception cref="Infrastructure.NotFoundException">La plante n'existe pas.</exception>
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
