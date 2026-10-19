using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;

namespace Jardo.Api.Services;

/// <summary>Une tâche avec le nom de sa cible.</summary>
public record TaskRow(GardenTask Task, string SpaceName, string? ZoneName, string? ItemName);

/// <summary>Requêtes et calcul d'échéance partagés par TaskService et SpaceService.</summary>
public static class TaskQueries
{
    /// <summary>Les tâches qui peuvent être dues : ni leur espace ni leur élément ne sont archivés.</summary>
    public static IQueryable<GardenTask> Active(this IQueryable<GardenTask> tasks)
        => tasks.Where(task => !task.Space.IsArchived && (task.Item == null || !task.Item.IsArchived));

    public static IQueryable<TaskRow> SelectWithNames(this IQueryable<GardenTask> tasks)
        => tasks.Select(task => new TaskRow(
            task,
            task.Space.Name,
            task.Zone == null ? null : task.Zone.Name,
            task.Item == null ? null : task.Item.Name));

    /// <summary>
    /// Calcule l'échéance de chaque tâche : une requête au journal par type d'intervention présent.
    /// </summary>
    public static async Task<List<TaskResponseDto>> ToDtosAsync(
        this IReadOnlyCollection<TaskRow> rows,
        IQueryable<JournalEntry> journal,
        TimeProvider timeProvider,
        CancellationToken cancellationToken = default)
    {
        var today = timeProvider.Today();
        var latestByKind = new Dictionary<JournalEntryKind, LatestInterventions>();

        foreach (var kind in rows.Select(row => row.Task.Kind).Distinct())
        {
            latestByKind[kind] = await LatestInterventions.LoadAsync(journal, kind, cancellationToken);
        }

        return rows.Select(row =>
        {
            var task = row.Task;

            var state = DueDateCalculator.Calculate(
                task.Recurrence,
                task.StartDate,
                task.IntervalDays,
                latestByKind[task.Kind].ForTarget(task.SpaceId, task.ZoneId, task.ItemId),
                timeProvider.LocalDate(task.CreatedAt),
                today);

            return ToDto(row, state);
        }).ToList();
    }

    private static TaskResponseDto ToDto(TaskRow row, DueState state) => new()
    {
        Id = row.Task.Id,
        Kind = row.Task.Kind,
        Title = row.Task.Title,
        Recurrence = row.Task.Recurrence,
        IntervalDays = row.Task.IntervalDays,
        StartDate = row.Task.StartDate,
        CreatedAt = row.Task.CreatedAt,
        SpaceId = row.Task.SpaceId,
        SpaceName = row.SpaceName,
        ZoneId = row.Task.ZoneId,
        ZoneName = row.ZoneName,
        ItemId = row.Task.ItemId,
        ItemName = row.ItemName,
        LastDoneOn = state.LastDoneOn,
        NextDueDate = state.NextDueDate,
        Status = state.Status,
        DaysOverdue = state.DaysOverdue
    };
}
