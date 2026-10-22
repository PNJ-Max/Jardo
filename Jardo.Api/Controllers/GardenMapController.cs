using Jardo.Api.Dtos;
using Jardo.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Jardo.Api.Controllers;

/// <summary>
/// La carte du jardin : le modèle de scène choisi et les espaces posés sur ses emplacements.
/// </summary>
[ApiController]
[Route("api/garden/map")]
[Produces("application/json")]
public class GardenMapController : ControllerBase
{
    private readonly IGardenMapService _mapService;

    public GardenMapController(IGardenMapService mapService)
    {
        _mapService = mapService;
    }

    /// <summary>
    /// Le modèle de carte et les emplacements occupés, avec de quoi les dessiner et les nommer.
    /// </summary>
    [HttpGet]
    [ProducesResponseType<GardenMapResponseDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<GardenMapResponseDto>> GetMap(CancellationToken cancellationToken)
        => await _mapService.GetAsync(cancellationToken);

    /// <summary>
    /// Remplace le modèle de carte et toutes les affectations, en une transaction.
    /// </summary>
    [HttpPut]
    [ProducesResponseType<GardenMapResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<GardenMapResponseDto>> ReplaceMap(
        SaveGardenMapDto dto,
        CancellationToken cancellationToken)
        => await _mapService.ReplaceAsync(dto, cancellationToken);
}
