using Jardo.Api.Dtos;
using Jardo.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Jardo.Api.Controllers;

/// <summary>
/// Les zones du potager : carrés, plates-bandes, serre.
/// </summary>
[ApiController]
[Route("api/zones")]
[Produces("application/json")]
public class ZonesController : ControllerBase
{
    private readonly IZoneService _zoneService;
    private readonly IWateringService _wateringService;

    public ZonesController(IZoneService zoneService, IWateringService wateringService)
    {
        _zoneService = zoneService;
        _wateringService = wateringService;
    }

    /// <summary>
    /// Liste toutes les zones, avec le nombre de plantes et le nombre de plantes à arroser.
    /// </summary>
    [HttpGet]
    [ProducesResponseType<List<ZoneResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ZoneResponseDto>>> GetZones(CancellationToken cancellationToken)
        => await _zoneService.GetAllAsync(cancellationToken);

    /// <summary>
    /// Récupère une zone par son identifiant.
    /// </summary>
    [HttpGet("{id:int}", Name = nameof(GetZone))]
    [ProducesResponseType<ZoneResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ZoneResponseDto>> GetZone(int id, CancellationToken cancellationToken)
        => await _zoneService.GetByIdAsync(id, cancellationToken);

    /// <summary>
    /// Crée une zone. Le nom doit être unique.
    /// </summary>
    [HttpPost]
    [ProducesResponseType<ZoneResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ZoneResponseDto>> CreateZone(
        CreateZoneDto dto,
        CancellationToken cancellationToken)
    {
        var zone = await _zoneService.CreateAsync(dto, cancellationToken);

        return CreatedAtAction(nameof(GetZone), new { id = zone.Id }, zone);
    }

    /// <summary>
    /// Modifie une zone existante.
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType<ZoneResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ZoneResponseDto>> UpdateZone(
        int id,
        UpdateZoneDto dto,
        CancellationToken cancellationToken)
        => await _zoneService.UpdateAsync(id, dto, cancellationToken);

    /// <summary>
    /// Supprime une zone. Refusé si elle contient encore des plantes.
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteZone(int id, CancellationToken cancellationToken)
    {
        await _zoneService.DeleteAsync(id, cancellationToken);

        return NoContent();
    }

    /// <summary>
    /// Arrose toutes les plantes actives de la zone en une seule opération.
    /// </summary>
    /// <remarks>
    /// Un enregistrement est créé par plante, pour que chacune garde son propre historique.
    /// </remarks>
    [HttpPost("{id:int}/waterings")]
    [ProducesResponseType<ZoneWateringResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ZoneWateringResultDto>> WaterZone(
        int id,
        CreateWateringDto dto,
        CancellationToken cancellationToken)
        => await _wateringService.WaterZoneAsync(id, dto, cancellationToken);
}
