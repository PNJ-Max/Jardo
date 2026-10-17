using Jardo.Api.Dtos;

namespace Jardo.Api.Services;

/// <summary>
/// Le journal de suivi des plantes : notes, mesures et problèmes constatés.
/// </summary>
public interface IObservationService
{
    /// <summary>Le journal d'une plante, du plus récent au plus ancien.</summary>
    /// <exception cref="Infrastructure.NotFoundException">La plante n'existe pas.</exception>
    Task<List<ObservationResponseDto>> GetByPlantAsync(int plantId, CancellationToken cancellationToken = default);

    /// <summary>Ajoute une entrée au journal d'une plante.</summary>
    /// <exception cref="Infrastructure.NotFoundException">La plante n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">La date est dans le futur.</exception>
    Task<ObservationResponseDto> CreateAsync(
        int plantId,
        CreateObservationDto dto,
        CancellationToken cancellationToken = default);

    /// <summary>Supprime une entrée du journal.</summary>
    /// <exception cref="Infrastructure.NotFoundException">L'observation n'existe pas.</exception>
    Task DeleteAsync(int observationId, CancellationToken cancellationToken = default);
}
