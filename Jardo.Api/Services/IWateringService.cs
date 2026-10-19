using Jardo.Api.Dtos;

namespace Jardo.Api.Services;

/// <summary>
/// Le voyant d'arrosage, et des raccourcis pour noter un arrosage au journal.
/// </summary>
public interface IWateringService
{
    /// <summary>
    /// Les plantes dont l'arrosage est dû aujourd'hui ou en retard, les plus urgentes d'abord.
    /// Les plantes archivées et celles des espaces archivés n'y figurent jamais.
    /// </summary>
    Task<List<PlantResponseDto>> GetPlantsNeedingWaterAsync(CancellationToken cancellationToken = default);

    /// <summary>Note l'arrosage d'une plante au journal.</summary>
    /// <exception cref="Infrastructure.NotFoundException">La plante n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">
    /// La date est dans le futur, ou la plante ou son espace est archivé.
    /// </exception>
    Task<JournalEntryResponseDto> WaterPlantAsync(
        int plantId,
        CreateWateringDto dto,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Note l'arrosage d'une zone : une seule entrée, qui vaut pour chacun de ses éléments.
    /// </summary>
    /// <exception cref="Infrastructure.NotFoundException">La zone n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">
    /// La date est dans le futur, ou l'espace est archivé ou n'accueille pas de plantes.
    /// </exception>
    Task<JournalEntryResponseDto> WaterZoneAsync(
        int zoneId,
        CreateWateringDto dto,
        CancellationToken cancellationToken = default);
}
