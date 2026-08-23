using Jardo.Api.Dtos;
using Jardo.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Jardo.Api.Controllers;

/// <summary>
/// Les plantes du potager, avec leur voyant d'arrosage.
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
    /// Liste les plantes, éventuellement filtrées par zone.
    /// </summary>
    /// <param name="zoneId">Ne garder que les plantes de cette zone.</param>
    /// <param name="includeArchived">Inclure les plantes archivées (faux par défaut).</param>
    // [FromQuery] est explicite alors qu'ASP.NET Core le déduirait tout seul pour des
    // types simples. C'est écrit pour que la lecture du code suffise à savoir d'où vient
    // la valeur, sans avoir à connaître les règles implicites de liaison de modèle.
    [HttpGet]
    [ProducesResponseType<List<PlantResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<PlantResponseDto>>> GetPlants(
        [FromQuery] int? zoneId,
        [FromQuery] bool includeArchived = false,
        CancellationToken cancellationToken = default)
        => await _plantService.GetAllAsync(zoneId, includeArchived, cancellationToken);

    /// <summary>
    /// Récupère une plante par son identifiant, voyant d'arrosage compris.
    /// </summary>
    [HttpGet("{id:int}", Name = nameof(GetPlant))]
    [ProducesResponseType<PlantResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PlantResponseDto>> GetPlant(int id, CancellationToken cancellationToken)
        => await _plantService.GetByIdAsync(id, cancellationToken);

    /// <summary>
    /// Crée une plante dans une zone existante.
    /// </summary>
    [HttpPost]
    [ProducesResponseType<PlantResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PlantResponseDto>> CreatePlant(
        CreatePlantDto dto,
        CancellationToken cancellationToken)
    {
        var plant = await _plantService.CreateAsync(dto, cancellationToken);

        return CreatedAtAction(nameof(GetPlant), new { id = plant.Id }, plant);
    }

    /// <summary>
    /// Modifie une plante. Envoyer un ZoneId différent la déplace vers cette zone.
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType<PlantResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PlantResponseDto>> UpdatePlant(
        int id,
        UpdatePlantDto dto,
        CancellationToken cancellationToken)
        => await _plantService.UpdateAsync(id, dto, cancellationToken);

    /// <summary>
    /// Archive une plante : fin de saison, arrachée ou morte.
    /// </summary>
    /// <remarks>
    /// Une plante archivée sort des calculs d'arrosage et de la liste par défaut, mais
    /// conserve tout son historique. C'est le geste à préférer à la suppression en fin
    /// de saison.
    ///
    /// Pourquoi POST et non PUT : ce n'est pas le remplacement d'une ressource, c'est
    /// le déclenchement d'une action sur une ressource existante. PUT signifierait
    /// « voici la nouvelle version complète de cette plante ».
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
    /// Supprime définitivement une plante, avec ses arrosages et ses observations.
    /// </summary>
    /// <remarks>
    /// À réserver aux erreurs de saisie. Pour une plante en fin de vie, utiliser
    /// l'archivage, qui préserve l'historique de la saison.
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
