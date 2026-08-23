using Jardo.Api.Dtos;

namespace Jardo.Api.Services;

/// <summary>
/// Le journal de suivi des plantes : notes, mesures et problèmes constatés.
/// </summary>
/// <remarks>
/// Service volontairement mince, et c'est assumé : il n'y a ici aucune règle métier
/// au-delà de « la plante doit exister » et « la date ne peut pas être dans le futur ».
///
/// Alors pourquoi une couche de service ? Parce qu'elle donne un endroit évident où
/// atterrir le jour où une règle apparaîtra — et il en apparaîtra : interdire deux
/// observations le même jour, marquer une plante comme malade dès qu'un problème est
/// signalé, alerter si la hauteur diminue. Sans cette couche, ces règles se
/// retrouveraient dans le contrôleur, mélangées à la traduction HTTP, et le jour où un
/// second appelant en aurait besoin il faudrait tout redécouper.
///
/// La comparaison est parlante : IWateringService, lui, porte de vraies règles depuis
/// le premier jour. Une couche de service n'a pas besoin d'être épaisse partout pour
/// être utile — elle a besoin d'être cohérente.
/// </remarks>
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
