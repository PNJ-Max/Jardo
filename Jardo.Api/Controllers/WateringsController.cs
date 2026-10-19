using Jardo.Api.Dtos;
using Jardo.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Jardo.Api.Controllers;

/// <summary>
/// Arrosage : ce qui reste à faire, et un raccourci pour noter un arrosage au journal.
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
    /// <remarks>
    /// Un arrosage noté sur la zone ou sur tout l'espace d'une plante compte comme le sien.
    /// </remarks>
    [HttpGet("watering/needed")]
    [ProducesResponseType<List<PlantResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<PlantResponseDto>>> GetPlantsNeedingWater(CancellationToken cancellationToken)
        => await _wateringService.GetPlantsNeedingWaterAsync(cancellationToken);

    /// <summary>
    /// Note l'arrosage d'une plante au journal.
    /// </summary>
    /// <remarks>
    /// Le corps est optionnel : « {} » note un arrosage à la date du jour.
    /// Une date passée est acceptée, une date future est refusée.
    /// </remarks>
    [HttpPost("plants/{plantId:int}/waterings")]
    [ProducesResponseType<JournalEntryResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<JournalEntryResponseDto>> WaterPlant(
        int plantId,
        CreateWateringDto dto,
        CancellationToken cancellationToken)
    {
        var entry = await _wateringService.WaterPlantAsync(plantId, dto, cancellationToken);

        return CreatedAtAction(nameof(JournalController.GetEntry), "Journal", new { id = entry.Id }, entry);
    }
}
