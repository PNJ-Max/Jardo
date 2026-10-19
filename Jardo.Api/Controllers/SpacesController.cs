using Jardo.Api.Dtos;
using Jardo.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Jardo.Api.Controllers;

/// <summary>
/// Les espaces du jardin : potager, verger, petits fruits, bois de chauffage.
/// </summary>
[ApiController]
[Route("api/spaces")]
[Produces("application/json")]
public class SpacesController : ControllerBase
{
    private readonly ISpaceService _spaceService;

    public SpacesController(ISpaceService spaceService)
    {
        _spaceService = spaceService;
    }

    /// <summary>
    /// Liste les espaces, avec leur nombre de zones, d'éléments actifs et de tâches dues.
    /// </summary>
    /// <param name="includeArchived">Inclure les espaces archivés (faux par défaut).</param>
    [HttpGet]
    [ProducesResponseType<List<SpaceResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<SpaceResponseDto>>> GetSpaces(
        [FromQuery] bool includeArchived = false,
        CancellationToken cancellationToken = default)
        => await _spaceService.GetAllAsync(includeArchived, cancellationToken);

    /// <summary>
    /// Récupère un espace par son identifiant.
    /// </summary>
    [HttpGet("{id:int}", Name = nameof(GetSpace))]
    [ProducesResponseType<SpaceResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SpaceResponseDto>> GetSpace(int id, CancellationToken cancellationToken)
        => await _spaceService.GetByIdAsync(id, cancellationToken);

    /// <summary>
    /// Crée un espace. Le nom doit être unique dans le jardin.
    /// </summary>
    [HttpPost]
    [ProducesResponseType<SpaceResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SpaceResponseDto>> CreateSpace(
        SaveSpaceDto dto,
        CancellationToken cancellationToken)
    {
        var space = await _spaceService.CreateAsync(dto, cancellationToken);

        return CreatedAtAction(nameof(GetSpace), new { id = space.Id }, space);
    }

    /// <summary>
    /// Modifie un espace. Changer de type est refusé si le contenu actuel n'y est pas autorisé.
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType<SpaceResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SpaceResponseDto>> UpdateSpace(
        int id,
        SaveSpaceDto dto,
        CancellationToken cancellationToken)
        => await _spaceService.UpdateAsync(id, dto, cancellationToken);

    /// <summary>
    /// Archive un espace : il sort de la liste par défaut et n'accueille plus rien de nouveau.
    /// </summary>
    /// <remarks>
    /// Son contenu et son historique sont conservés ; ses tâches ne sont plus dues.
    /// </remarks>
    [HttpPost("{id:int}/archive")]
    [ProducesResponseType<SpaceResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SpaceResponseDto>> ArchiveSpace(int id, CancellationToken cancellationToken)
        => await _spaceService.SetArchivedAsync(id, isArchived: true, cancellationToken);

    /// <summary>
    /// Réactive un espace archivé.
    /// </summary>
    [HttpPost("{id:int}/unarchive")]
    [ProducesResponseType<SpaceResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SpaceResponseDto>> UnarchiveSpace(int id, CancellationToken cancellationToken)
        => await _spaceService.SetArchivedAsync(id, isArchived: false, cancellationToken);

    /// <summary>
    /// Supprime un espace, ses zones et son journal. Refusé s'il contient encore des éléments, même archivés.
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteSpace(int id, CancellationToken cancellationToken)
    {
        await _spaceService.DeleteAsync(id, cancellationToken);

        return NoContent();
    }
}
