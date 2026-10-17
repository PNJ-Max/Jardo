using Jardo.Api.Dtos;
using Jardo.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Jardo.Api.Controllers;

/// <summary>
/// Arrosages : ce qui a été fait, et ce qui reste à faire.
/// </summary>
[ApiController]
[Route("api")]
[Produces("application/json")]
public class WateringsController : ControllerBase
{
    private readonly IWateringService _wateringService;

    public WateringsController(IWateringService wateringService)
    {
        _wateringService = wateringService;
    }

    /// <summary>
    /// Les plantes à arroser aujourd'hui, les plus en retard d'abord.
    /// </summary>
    [HttpGet("watering/needed")]
    [ProducesResponseType<List<PlantResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<PlantResponseDto>>> GetPlantsNeedingWater(CancellationToken cancellationToken)
        => await _wateringService.GetPlantsNeedingWaterAsync(cancellationToken);

    /// <summary>
    /// Historique des arrosages d'une plante, du plus récent au plus ancien.
    /// </summary>
    [HttpGet("plants/{plantId:int}/waterings")]
    [ProducesResponseType<List<WateringLogResponseDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<WateringLogResponseDto>>> GetHistory(
        int plantId,
        CancellationToken cancellationToken)
        => await _wateringService.GetHistoryAsync(plantId, cancellationToken);

    /// <summary>
    /// Enregistre l'arrosage d'une plante.
    /// </summary>
    /// <remarks>
    /// Le corps est optionnel : « {} » enregistre un arrosage à la date du jour.
    /// Une date passée est acceptée, une date future est refusée.
    /// </remarks>
    [HttpPost("plants/{plantId:int}/waterings")]
    [ProducesResponseType<WateringLogResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WateringLogResponseDto>> WaterPlant(
        int plantId,
        CreateWateringDto dto,
        CancellationToken cancellationToken)
    {
        var log = await _wateringService.WaterPlantAsync(plantId, dto, cancellationToken);

        // Location vers l'historique : il n'existe pas d'endpoint pour un arrosage seul.
        return CreatedAtAction(nameof(GetHistory), new { plantId }, log);
    }
}
