using Jardo.Api.Dtos;
using Jardo.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Jardo.Api.Controllers;

/// <summary>
/// Les plantes du jardin (cultures, arbres, arbustes), avec leur voyant d'arrosage.
/// </summary>
[ApiController]
[Route("api/plants")]
[Produces("application/json")]
public class PlantsController : ControllerBase
{
    private readonly IPlantService _plantService;

    public PlantsController(IPlantService plantService)
    {
        _plantService = plantService;
    }

    /// <summary>
    /// Liste les plantes, éventuellement filtrées par espace et par zone.
    /// </summary>
    /// <param name="spaceId">Ne garder que les plantes de cet espace.</param>
    /// <param name="zoneId">Ne garder que les plantes de cette zone.</param>
    /// <param name="includeArchived">Inclure les plantes archivées et celles des espaces archivés (faux par défaut).</param>
    [HttpGet]
    [ProducesResponseType<List<PlantResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<PlantResponseDto>>> GetPlants(
        [FromQuery] int? spaceId,
        [FromQuery] int? zoneId,
        [FromQuery] bool includeArchived = false,
        CancellationToken cancellationToken = default)
        => await _plantService.GetAllAsync(spaceId, zoneId, includeArchived, cancellationToken);

    /// <summary>
    /// Récupère une plante par son identifiant, voyant d'arrosage compris.
    /// </summary>
    [HttpGet("{id:int}", Name = nameof(GetPlant))]
    [ProducesResponseType<PlantResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PlantResponseDto>> GetPlant(int id, CancellationToken cancellationToken)
        => await _plantService.GetByIdAsync(id, cancellationToken);

    /// <summary>
    /// Crée une plante dans un espace, et éventuellement dans une de ses zones.
    /// </summary>
    [HttpPost]
    [ProducesResponseType<PlantResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PlantResponseDto>> CreatePlant(
        SavePlantDto dto,
        CancellationToken cancellationToken)
    {
        var plant = await _plantService.CreateAsync(dto, cancellationToken);

        return CreatedAtAction(nameof(GetPlant), new { id = plant.Id }, plant);
    }

    /// <summary>
    /// Modifie une plante. Un SpaceId ou un ZoneId différent la déplace, avec son journal.
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType<PlantResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PlantResponseDto>> UpdatePlant(
        int id,
        SavePlantDto dto,
        CancellationToken cancellationToken)
        => await _plantService.UpdateAsync(id, dto, cancellationToken);

    /// <summary>
    /// Archive une plante : fin de saison, arrachée ou morte.
    /// </summary>
    /// <remarks>
    /// Une plante archivée sort des calculs d'arrosage et de la liste par défaut, mais
    /// conserve tout son historique.
    /// </remarks>
    [HttpPost("{id:int}/archive")]
    [ProducesResponseType<PlantResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PlantResponseDto>> ArchivePlant(int id, CancellationToken cancellationToken)
        => await _plantService.SetArchivedAsync(id, isArchived: true, cancellationToken);

    /// <summary>
    /// Réactive une plante archivée : elle réintègre les calculs d'arrosage.
    /// </summary>
    [HttpPost("{id:int}/unarchive")]
    [ProducesResponseType<PlantResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PlantResponseDto>> UnarchivePlant(int id, CancellationToken cancellationToken)
        => await _plantService.SetArchivedAsync(id, isArchived: false, cancellationToken);

    /// <summary>
    /// Supprime définitivement une plante, avec ses entrées de journal.
    /// </summary>
    /// <remarks>
    /// À réserver aux erreurs de saisie ; pour une plante en fin de vie, utiliser l'archivage.
    /// </remarks>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeletePlant(int id, CancellationToken cancellationToken)
    {
        await _plantService.DeleteAsync(id, cancellationToken);

        return NoContent();
    }
}
