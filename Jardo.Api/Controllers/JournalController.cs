using Jardo.Api.Dtos;
using Jardo.Api.Models;
using Jardo.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Jardo.Api.Controllers;

/// <summary>
/// Le journal d'interventions : arrosages, semis, tailles, récoltes, observations, bois…
/// </summary>
[ApiController]
[Route("api/journal")]
[Produces("application/json")]
public class JournalController : ControllerBase
{
    private readonly IJournalService _journalService;

    public JournalController(IJournalService journalService)
    {
        _journalService = journalService;
    }

    /// <summary>
    /// Le journal, du plus récent au plus ancien : tout le jardin, ou une seule cible.
    /// </summary>
    /// <remarks>
    /// Le journal d'une zone comprend les entrées de ses éléments et celles notées sur tout son espace ;
    /// celui d'un élément, les entrées notées sur sa zone ou sur tout son espace, qui valent pour lui.
    /// </remarks>
    /// <param name="spaceId">Le journal de cet espace.</param>
    /// <param name="zoneId">Le journal de cette zone.</param>
    /// <param name="itemId">Le journal de cet élément.</param>
    /// <param name="kinds">Types d'intervention à garder, à répéter : kind=Watering&amp;kind=Harvest.</param>
    [HttpGet]
    [ProducesResponseType<List<JournalEntryResponseDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<JournalEntryResponseDto>>> GetJournal(
        [FromQuery] int? spaceId,
        [FromQuery] int? zoneId,
        [FromQuery] int? itemId,
        [FromQuery(Name = "kind")] JournalEntryKind[]? kinds,
        CancellationToken cancellationToken = default)
        => await _journalService.GetAllAsync(spaceId, zoneId, itemId, kinds, cancellationToken);

    /// <summary>
    /// Une entrée du journal.
    /// </summary>
    [HttpGet("{id:int}", Name = nameof(GetEntry))]
    [ProducesResponseType<JournalEntryResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<JournalEntryResponseDto>> GetEntry(int id, CancellationToken cancellationToken)
        => await _journalService.GetByIdAsync(id, cancellationToken);

    /// <summary>
    /// Note une intervention sur un espace, une de ses zones ou un de ses éléments.
    /// </summary>
    /// <remarks>
    /// La date ne peut pas être dans le futur. Une entrée sur un élément situé dans une zone prend
    /// cette zone d'office.
    /// </remarks>
    [HttpPost]
    [ProducesResponseType<JournalEntryResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<JournalEntryResponseDto>> CreateEntry(
        SaveJournalEntryDto dto,
        CancellationToken cancellationToken)
    {
        var entry = await _journalService.CreateAsync(dto, cancellationToken);

        return CreatedAtAction(nameof(GetEntry), new { id = entry.Id }, entry);
    }

    /// <summary>
    /// Corrige une entrée, cible comprise.
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType<JournalEntryResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<JournalEntryResponseDto>> UpdateEntry(
        int id,
        SaveJournalEntryDto dto,
        CancellationToken cancellationToken)
        => await _journalService.UpdateAsync(id, dto, cancellationToken);

    /// <summary>
    /// Supprime une entrée du journal.
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteEntry(int id, CancellationToken cancellationToken)
    {
        await _journalService.DeleteAsync(id, cancellationToken);

        return NoContent();
    }
}
