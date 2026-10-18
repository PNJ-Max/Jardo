using Jardo.Api.Dtos;
using Jardo.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Jardo.Api.Controllers;

/// <summary>
/// Le jardin, unique au MVP.
/// </summary>
[ApiController]
[Route("api/garden")]
[Produces("application/json")]
public class GardenController : ControllerBase
{
    private readonly IGardenService _gardenService;

    public GardenController(IGardenService gardenService)
    {
        _gardenService = gardenService;
    }

    /// <summary>
    /// Le jardin.
    /// </summary>
    [HttpGet]
    [ProducesResponseType<GardenResponseDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<GardenResponseDto>> GetGarden(CancellationToken cancellationToken)
        => await _gardenService.GetAsync(cancellationToken);

    /// <summary>
    /// Renomme le jardin.
    /// </summary>
    [HttpPut]
    [ProducesResponseType<GardenResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<GardenResponseDto>> UpdateGarden(
        UpdateGardenDto dto,
        CancellationToken cancellationToken)
        => await _gardenService.UpdateAsync(dto, cancellationToken);
}
