using Jardo.Api.Dtos;
using Jardo.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Jardo.Api.Controllers;

/// <summary>
/// Les tâches du jardin : arrosages, tailles, traitements… avec leur échéance.
/// </summary>
[ApiController]
[Route("api/tasks")]
[Produces("application/json")]
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;

    public TasksController(ITaskService taskService)
    {
        _taskService = taskService;
    }

    /// <summary>
    /// Les tâches, les plus en retard d'abord : tout le jardin, ou une seule cible.
    /// </summary>
    /// <remarks>
    /// Comme le journal, les tâches d'une zone comprennent celles de ses éléments et celles de tout
    /// son espace ; celles d'un élément, les tâches de sa zone et de son espace.
    /// </remarks>
    /// <param name="spaceId">Les tâches de cet espace.</param>
    /// <param name="zoneId">Les tâches de cette zone.</param>
    /// <param name="itemId">Les tâches de cet élément.</param>
    [HttpGet]
    [ProducesResponseType<List<TaskResponseDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<TaskResponseDto>>> GetTasks(
        [FromQuery] int? spaceId,
        [FromQuery] int? zoneId,
        [FromQuery] int? itemId,
        CancellationToken cancellationToken = default)
        => await _taskService.GetAllAsync(spaceId, zoneId, itemId, cancellationToken);

    /// <summary>
    /// Les tâches dues de tout le jardin, toutes catégories, les plus en retard d'abord.
    /// </summary>
    /// <remarks>
    /// Les tâches des éléments et des espaces archivés n'y figurent jamais.
    /// </remarks>
    /// <param name="horizon">Today (par défaut) : dues aujourd'hui ou en retard. Week : les sept prochains jours en plus.</param>
    [HttpGet("due")]
    [ProducesResponseType<List<TaskResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<TaskResponseDto>>> GetDueTasks(
        [FromQuery] DueHorizon horizon = DueHorizon.Today,
        CancellationToken cancellationToken = default)
        => await _taskService.GetDueAsync(horizon, cancellationToken);

    /// <summary>
    /// Une tâche, échéance comprise.
    /// </summary>
    [HttpGet("{id:int}", Name = nameof(GetTask))]
    [ProducesResponseType<TaskResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TaskResponseDto>> GetTask(int id, CancellationToken cancellationToken)
        => await _taskService.GetByIdAsync(id, cancellationToken);

    /// <summary>
    /// Prévoit une tâche sur un espace, une de ses zones ou un de ses éléments.
    /// </summary>
    [HttpPost]
    [ProducesResponseType<TaskResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TaskResponseDto>> CreateTask(
        SaveTaskDto dto,
        CancellationToken cancellationToken)
    {
        var task = await _taskService.CreateAsync(dto, cancellationToken);

        return CreatedAtAction(nameof(GetTask), new { id = task.Id }, task);
    }

    /// <summary>
    /// Modifie une tâche, cible et rythme compris.
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType<TaskResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TaskResponseDto>> UpdateTask(
        int id,
        SaveTaskDto dto,
        CancellationToken cancellationToken)
        => await _taskService.UpdateAsync(id, dto, cancellationToken);

    /// <summary>
    /// Supprime une tâche. Le journal n'est pas touché.
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteTask(int id, CancellationToken cancellationToken)
    {
        await _taskService.DeleteAsync(id, cancellationToken);

        return NoContent();
    }

    /// <summary>
    /// « Fait » : note l'intervention au journal et renvoie la tâche recalculée, avec l'entrée notée.
    /// </summary>
    /// <remarks>
    /// Le corps est optionnel : « {} » note l'intervention à la date du jour, avec le titre de la
    /// tâche pour note. Une date passée est acceptée, une date future est refusée. Supprimer l'entrée
    /// renvoyée annule le « Fait ».
    /// </remarks>
    [HttpPost("{id:int}/done")]
    [ProducesResponseType<TaskCompletionResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TaskCompletionResponseDto>> CompleteTask(
        int id,
        CompleteTaskDto dto,
        CancellationToken cancellationToken)
        => await _taskService.CompleteAsync(id, dto, cancellationToken);
}
