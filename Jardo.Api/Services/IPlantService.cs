using Jardo.Api.Dtos;

namespace Jardo.Api.Services;

/// <summary>
/// Gestion des plantes du potager.
/// </summary>
public interface IPlantService
{
    /// <summary>
    /// Liste les plantes, avec leur voyant d'arrosage.
    /// </summary>
    /// <param name="zoneId">Ne garder que les plantes de cette zone. Null = toutes les zones.</param>
    /// <param name="includeArchived">Inclure les plantes archivées. Faux par défaut.</param>
    Task<List<PlantResponseDto>> GetAllAsync(
        int? zoneId = null,
        bool includeArchived = false,
        CancellationToken cancellationToken = default);

    /// <summary>Une plante par son identifiant.</summary>
    /// <exception cref="Infrastructure.NotFoundException">La plante n'existe pas.</exception>
    Task<PlantResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>Crée une plante dans une zone existante.</summary>
    /// <exception cref="Infrastructure.BusinessRuleException">La zone visée n'existe pas.</exception>
    Task<PlantResponseDto> CreateAsync(CreatePlantDto dto, CancellationToken cancellationToken = default);

    /// <summary>Modifie une plante. Permet aussi de la déplacer vers une autre zone.</summary>
    /// <exception cref="Infrastructure.NotFoundException">La plante n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">La zone visée n'existe pas.</exception>
    Task<PlantResponseDto> UpdateAsync(int id, UpdatePlantDto dto, CancellationToken cancellationToken = default);

    /// <summary>
    /// Archive ou réactive une plante. Une plante archivée sort des calculs d'arrosage
    /// mais conserve tout son historique.
    /// </summary>
    /// <exception cref="Infrastructure.NotFoundException">La plante n'existe pas.</exception>
    Task<PlantResponseDto> SetArchivedAsync(int id, bool isArchived, CancellationToken cancellationToken = default);

    /// <summary>
    /// Supprime définitivement une plante, ainsi que ses arrosages et observations.
    /// </summary>
    /// <remarks>
    /// À réserver aux erreurs de saisie. Pour une plante en fin de vie, préférer
    /// <see cref="SetArchivedAsync"/> qui préserve l'historique de la saison.
    /// </remarks>
    /// <exception cref="Infrastructure.NotFoundException">La plante n'existe pas.</exception>
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
