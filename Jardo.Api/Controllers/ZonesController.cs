using Jardo.Api.Dtos;
using Jardo.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Jardo.Api.Controllers;

/// <summary>
/// Les zones d'un espace : carrés, planches, rangs.
/// </summary>
[ApiController]
[Route("api")]
[Produces("application/json")]
public class ZonesController : ControllerBase
{
    private readonly IZoneService _zoneService;

    public ZonesController(IZoneService zoneService)
    {
        _zoneService = zoneService;
    }

    /// <summary>
    /// Les zones d'un espace, avec leur nombre d'éléments actifs.
    /// </summary>
    [HttpGet("spaces/{spaceId:int}/zones")]
    [ProducesResponseType<List<ZoneResponseDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<ZoneResponseDto>>> GetZones(int spaceId, CancellationToken cancellationToken)
        => await _zoneService.GetBySpaceAsync(spaceId, cancellationToken);

    /// <summary>
    /// Récupère une zone par son identifiant.
    /// </summary>
    [HttpGet("zones/{id:int}", Name = nameof(GetZone))]
    [ProducesResponseType<ZoneResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ZoneResponseDto>> GetZone(int id, CancellationToken cancellationToken)
        => await _zoneService.GetByIdAsync(id, cancellationToken);

    /// <summary>
    /// Crée une zone dans un espace. Le nom doit être unique dans l'espace.
    /// </summary>
    [HttpPost("spaces/{spaceId:int}/zones")]
    [ProducesResponseType<ZoneResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ZoneResponseDto>> CreateZone(
        int spaceId,
        SaveZoneDto dto,
        CancellationToken cancellationToken)
    {
        var zone = await _zoneService.CreateAsync(spaceId, dto, cancellationToken);

        return CreatedAtAction(nameof(GetZone), new { id = zone.Id }, zone);
    }

    /// <summary>
    /// Modifie une zone existante. Elle reste dans son espace.
    /// </summary>
    [HttpPut("zones/{id:int}")]
    [ProducesResponseType<ZoneResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ZoneResponseDto>> UpdateZone(
        int id,
        SaveZoneDto dto,
        CancellationToken cancellationToken)
        => await _zoneService.UpdateAsync(id, dto, cancellationToken);

    /// <summary>
    /// Supprime une zone et les entrées notées sur elle. Refusé si elle contient encore des éléments.
    /// </summary>
    [HttpDelete("zones/{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteZone(int id, CancellationToken cancellationToken)
    {
        await _zoneService.DeleteAsync(id, cancellationToken);

        return NoContent();
    }
}
