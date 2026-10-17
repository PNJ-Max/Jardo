using Jardo.Api.Dtos;

namespace Jardo.Api.Services;

/// <summary>
/// Enregistrement des arrosages et calcul du voyant.
///</summary>
public interface IWateringService
{
    /// <summary>
    /// Les plantes dont l'arrosage est dû aujourd'hui ou en retard, les plus urgentes d'abord.
    /// </summary>
    Task<List<PlantResponseDto>> GetPlantsNeedingWaterAsync(CancellationToken cancellationToken = default);

    /// <summary>Historique des arrosages d'une plante, du plus récent au plus ancien.</summary>
    /// <exception cref="Infrastructure.NotFoundException">La plante n'existe pas.</exception>
    Task<List<WateringLogResponseDto>> GetHistoryAsync(int plantId, CancellationToken cancellationToken = default);

    /// <summary>Enregistre l'arrosage d'une plante.</summary>
    /// <exception cref="Infrastructure.NotFoundException">La plante n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">La date est dans le futur, ou la plante est archivée.</exception>
    Task<WateringLogResponseDto> WaterPlantAsync(
        int plantId,
        CreateWateringDto dto,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Enregistre l'arrosage de toutes les plantes actives d'une zone, en une seule opération.
    /// </summary>
    /// <exception cref="Infrastructure.NotFoundException">La zone n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">La date est dans le futur.</exception>
    Task<ZoneWateringResultDto> WaterZoneAsync(
        int zoneId,
        CreateWateringDto dto,
        CancellationToken cancellationToken = default);
}
