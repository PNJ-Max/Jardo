using Jardo.Api.Data;
using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Services;

/// <inheritdoc cref="ITaskService"/>
public class TaskService : ITaskService
{
    private readonly GardenDbContext _db;
    private readonly TimeProvider _timeProvider;
    private readonly IJournalService _journalService;

    public TaskService(GardenDbContext db, TimeProvider timeProvider, IJournalService journalService)
    {
        _db = db;
        _timeProvider = timeProvider;
        _journalService = journalService;
    }

    // Tri en mémoire : l'échéance est calculée, pas stockée. Suffisant pour quelques dizaines de tâches.
    private static List<TaskResponseDto> OrderByDueDate(IEnumerable<TaskResponseDto> tasks)
        => tasks
            .OrderBy(task => task.NextDueDate ?? DateOnly.MaxValue)
            .ThenBy(task => task.SpaceName)
            .ThenBy(task => task.Id)
            .ToList();

    public async Task<List<TaskResponseDto>> GetAllAsync(
        int? spaceId = null,
        int? zoneId = null,
        int? itemId = null,
        CancellationToken cancellationToken = default)
    {
        if (new[] { spaceId, zoneId, itemId }.Count(id => id.HasValue) > 1)
        {
            throw new BusinessRuleException(
                "Les tâches se lisent pour une seule cible à la fois : un espace, une zone ou un élément.");
        }

        var query = _db.GardenTasks.AsNoTracking();
        var journal = _db.JournalEntries.AsQueryable();

        if (spaceId is { } space)
        {
            if (!await _db.Spaces.AnyAsync(candidate => candidate.Id == space, cancellationToken))
            {
                throw NotFoundException.For("Space", space);
            }

            query = query.Where(task => task.SpaceId == space);
            journal = journal.Where(entry => entry.SpaceId == space);
        }
        else if (zoneId is { } zone)
        {
            var zoneSpaceId = await _db.Zones
                .Where(candidate => candidate.Id == zone)
                .Select(candidate => (int?)candidate.SpaceId)
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw NotFoundException.For("Zone", zone);

            query = query.Where(task =>
                task.ZoneId == zone
                || (task.SpaceId == zoneSpaceId && task.ZoneId == null && task.ItemId == null));
            journal = journal.Where(entry => entry.SpaceId == zoneSpaceId);
        }
        else if (itemId is { } item)
        {
            var position = await _db.GardenItems
                .Where(candidate => candidate.Id == item)
                .Select(candidate => new { candidate.SpaceId, candidate.ZoneId })
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw NotFoundException.For("Item", item);

            query = position.ZoneId is { } itemZoneId
                ? query.Where(task =>
                    task.ItemId == item
                    || (task.ItemId == null && task.ZoneId == itemZoneId)
                    || (task.ItemId == null && task.ZoneId == null && task.SpaceId == position.SpaceId))
                : query.Where(task =>
                    task.ItemId == item
                    || (task.ItemId == null && task.ZoneId == null && task.SpaceId == position.SpaceId));
            journal = journal.Where(entry => entry.SpaceId == position.SpaceId);
        }

        var rows = await query.SelectWithNames().ToListAsync(cancellationToken);

        return OrderByDueDate(await rows.ToDtosAsync(journal, _timeProvider.Today(), cancellationToken));
    }

    public async Task<List<TaskResponseDto>> GetDueAsync(DueHorizon horizon, CancellationToken cancellationToken = default)
    {
        var today = _timeProvider.Today();

        var limit = horizon switch
        {
            DueHorizon.Today => today,
            DueHorizon.Week => today.AddDays(6),
            _ => throw new ArgumentOutOfRangeException(nameof(horizon), horizon, null)
        };

        var rows = await _db.GardenTasks
            .AsNoTracking()
            .Active()
            .SelectWithNames()
            .ToListAsync(cancellationToken);

        var tasks = await rows.ToDtosAsync(_db.JournalEntries, today, cancellationToken);

        return OrderByDueDate(tasks.Where(task => task.NextDueDate <= limit));
    }

    public async Task<TaskResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var row = await _db.GardenTasks
            .AsNoTracking()
            .Where(task => task.Id == id)
            .SelectWithNames()
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw NotFoundException.For("Task", id);

        var journal = _db.JournalEntries.Where(entry => entry.SpaceId == row.Task.SpaceId);

        return (await new[] { row }.ToDtosAsync(journal, _timeProvider.Today(), cancellationToken)).Single();
    }

    public async Task<TaskResponseDto> CreateAsync(SaveTaskDto dto, CancellationToken cancellationToken = default)
    {
        var task = new GardenTask { CreatedAt = _timeProvider.GetUtcNow() };

        await ApplyAsync(dto, task, isNew: true, cancellationToken);

        _db.GardenTasks.Add(task);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(task.Id, cancellationToken);
    }

    public async Task<TaskResponseDto> UpdateAsync(int id, SaveTaskDto dto, CancellationToken cancellationToken = default)
    {
        var task = await _db.GardenTasks.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("Task", id);

        await ApplyAsync(dto, task, isNew: false, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var task = await _db.GardenTasks.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("Task", id);

        _db.GardenTasks.Remove(task);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<TaskResponseDto> CompleteAsync(int id, CompleteTaskDto dto, CancellationToken cancellationToken = default)
    {
        var task = await _db.GardenTasks.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("Task", id);

        var date = dto.Date ?? _timeProvider.Today();

        // Sans cela, une tâche ponctuelle faite en avance resterait due : seule une entrée à sa date
        // ou après la clôt. Le journal partage ce DbContext : son enregistrement emporte ce changement.
        if (task.Recurrence is TaskRecurrence.Once && date < task.StartDate)
        {
            task.StartDate = date;
        }

        await _journalService.CreateAsync(new SaveJournalEntryDto
        {
            Date = date,
            Kind = task.Kind,
            Note = Text.Optional(dto.Note) ?? task.Title,
            SpaceId = task.SpaceId,
            ZoneId = task.ZoneId,
            ItemId = task.ItemId
        }, cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    private async Task ApplyAsync(SaveTaskDto dto, GardenTask task, bool isNew, CancellationToken cancellationToken)
    {
        var kind = dto.Kind!.Value;
        var recurrence = dto.Recurrence!.Value;
        var title = Text.Optional(dto.Title);

        if (recurrence is TaskRecurrence.EveryNDays && dto.IntervalDays is null)
        {
            throw new BusinessRuleException("Une tâche tous les N jours a besoin de son nombre de jours.");
        }

        if (recurrence is not TaskRecurrence.EveryNDays && dto.IntervalDays is not null)
        {
            throw new BusinessRuleException("Seule une tâche tous les N jours a un nombre de jours.");
        }

        if (kind is JournalEntryKind.Other && title is null)
        {
            throw new BusinessRuleException("Une tâche « autre » a besoin d'un titre pour dire ce qu'il y a à faire.");
        }

        var current = isNew ? null : new InterventionTarget(task.SpaceId, task.ZoneId, task.ItemId);
        var target = await InterventionTarget.ResolveAsync(
            _db, dto.SpaceId, dto.ZoneId, dto.ItemId, kind, current, "prévoir une tâche", cancellationToken);

        task.SpaceId = target.SpaceId;
        task.ZoneId = target.ZoneId;
        task.ItemId = target.ItemId;
        task.Kind = kind;
        task.Title = title;
        task.Recurrence = recurrence;
        task.IntervalDays = dto.IntervalDays;
        task.StartDate = dto.StartDate!.Value;
    }
}
