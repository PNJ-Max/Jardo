using Jardo.Api.Dtos;
using Jardo.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Jardo.Api.Controllers;

/// <summary>
/// Les tas de bois de chauffage, avec leur stock restant et leur état de séchage.
/// </summary>
[ApiController]
[Route("api/wood-piles")]
[Produces("application/json")]
public class WoodPilesController : ControllerBase
{
    private readonly IWoodPileService _woodPileService;

    public WoodPilesController(IWoodPileService woodPileService)
    {
        _woodPileService = woodPileService;
    }

    /// <summary>
    /// Liste les tas de bois, éventuellement filtrés par espace et par zone.
    /// </summary>
    /// <param name="spaceId">Ne garder que les tas de cet espace.</param>
    /// <param name="zoneId">Ne garder que les tas de cette zone.</param>
    /// <param name="includeArchived">Inclure les tas archivés et ceux des espaces archivés (faux par défaut).</param>
    [HttpGet]
    [ProducesResponseType<List<WoodPileResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<WoodPileResponseDto>>> GetWoodPiles(
        [FromQuery] int? spaceId,
        [FromQuery] int? zoneId,
        [FromQuery] bool includeArchived = false,
        CancellationToken cancellationToken = default)
        => await _woodPileService.GetAllAsync(spaceId, zoneId, includeArchived, cancellationToken);

    /// <summary>
    /// Récupère un tas de bois par son identifiant.
    /// </summary>
    [HttpGet("{id:int}", Name = nameof(GetWoodPile))]
    [ProducesResponseType<WoodPileResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WoodPileResponseDto>> GetWoodPile(int id, CancellationToken cancellationToken)
        => await _woodPileService.GetByIdAsync(id, cancellationToken);

    /// <summary>
    /// Crée un tas dans un espace bois de chauffage, et éventuellement dans une de ses zones.
    /// </summary>
    [HttpPost]
    [ProducesResponseType<WoodPileResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<WoodPileResponseDto>> CreateWoodPile(
        SaveWoodPileDto dto,
        CancellationToken cancellationToken)
    {
        var pile = await _woodPileService.CreateAsync(dto, cancellationToken);

        return CreatedAtAction(nameof(GetWoodPile), new { id = pile.Id }, pile);
    }

    /// <summary>
    /// Modifie un tas. Un SpaceId ou un ZoneId différent le déplace, avec son journal et ses tâches.
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType<WoodPileResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WoodPileResponseDto>> UpdateWoodPile(
        int id,
        SaveWoodPileDto dto,
        CancellationToken cancellationToken)
        => await _woodPileService.UpdateAsync(id, dto, cancellationToken);

    /// <summary>
    /// Archive un tas : épuisé ou vendu.
    /// </summary>
    /// <remarks>
    /// Un tas archivé sort des tâches dues et de la liste par défaut, mais conserve tout son historique.
    /// </remarks>
    [HttpPost("{id:int}/archive")]
    [ProducesResponseType<WoodPileResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WoodPileResponseDto>> ArchiveWoodPile(int id, CancellationToken cancellationToken)
        => await _woodPileService.SetArchivedAsync(id, isArchived: true, cancellationToken);

    /// <summary>
    /// Réactive un tas archivé : ses tâches reprennent.
    /// </summary>
    [HttpPost("{id:int}/unarchive")]
    [ProducesResponseType<WoodPileResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WoodPileResponseDto>> UnarchiveWoodPile(int id, CancellationToken cancellationToken)
        => await _woodPileService.SetArchivedAsync(id, isArchived: false, cancellationToken);

    /// <summary>
    /// Supprime définitivement un tas, avec ses entrées de journal et ses tâches.
    /// </summary>
    /// <remarks>
    /// À réserver aux erreurs de saisie ; pour un tas épuisé, utiliser l'archivage.
    /// </remarks>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteWoodPile(int id, CancellationToken cancellationToken)
    {
        await _woodPileService.DeleteAsync(id, cancellationToken);

        return NoContent();
    }
}
