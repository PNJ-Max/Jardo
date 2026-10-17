using Jardo.Api.Dtos;
using Jardo.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Jardo.Api.Controllers;

/// <summary>
/// Le journal de suivi : notes, mesures de hauteur et problèmes constatés.
/// </summary>
[ApiController]
[Route("api")]
[Produces("application/json")]
public class ObservationsController : ControllerBase
{
    private readonly IObservationService _observationService;

    public ObservationsController(IObservationService observationService)
    {
        _observationService = observationService;
    }

    /// <summary>
    /// Le journal d'une plante, du plus récent au plus ancien.
    /// </summary>
    [HttpGet("plants/{plantId:int}/observations", Name = nameof(GetObservations))]
    [ProducesResponseType<List<ObservationResponseDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<ObservationResponseDto>>> GetObservations(
        int plantId,
        CancellationToken cancellationToken)
        => await _observationService.GetByPlantAsync(plantId, cancellationToken);

    /// <summary>
    /// Ajoute une entrée au journal d'une plante.
    /// </summary>
    /// <remarks>
    /// Une même requête porte la note, la hauteur et le problème constaté ; seule la note est obligatoire.
    /// </remarks>
    [HttpPost("plants/{plantId:int}/observations")]
    [ProducesResponseType<ObservationResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ObservationResponseDto>> CreateObservation(
        int plantId,
        CreateObservationDto dto,
        CancellationToken cancellationToken)
    {
        var observation = await _observationService.CreateAsync(plantId, dto, cancellationToken);

        return CreatedAtAction(nameof(GetObservations), new { plantId }, observation);
    }

    /// <summary>
    /// Supprime une entrée du journal.
    /// </summary>
    [HttpDelete("observations/{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteObservation(int id, CancellationToken cancellationToken)
    {
        await _observationService.DeleteAsync(id, cancellationToken);

        return NoContent();
    }
}
