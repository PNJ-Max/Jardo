using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Services;

/// <summary>
/// La dernière date d'un type d'intervention pour chaque élément, selon la règle du journal : une
/// entrée sur une zone vaut pour chaque élément de la zone, une entrée sur un espace pour chaque
/// élément de l'espace. « Arroser le carré 2 » compte comme arrosage de chaque plante du carré.
/// L'élément est pris là où il se trouve au moment de la lecture.
/// </summary>
public sealed class LatestInterventions
{
    private readonly Dictionary<int, DateOnly> _byItem = new();
    private readonly Dictionary<int, DateOnly> _byZone = new();
    private readonly Dictionary<int, DateOnly> _bySpace = new();

    private LatestInterventions()
    {
    }

    /// <summary>Une requête, groupée par cible : sa taille suit le nombre de cibles, pas l'historique.</summary>
    public static async Task<LatestInterventions> LoadAsync(
        IQueryable<JournalEntry> journal,
        JournalEntryKind kind,
        CancellationToken cancellationToken = default)
    {
        var rows = await journal
            .Where(entry => entry.Kind == kind)
            .GroupBy(entry => new { entry.SpaceId, entry.ZoneId, entry.ItemId })
            .Select(group => new { group.Key.SpaceId, group.Key.ZoneId, group.Key.ItemId, Last = group.Max(entry => entry.Date) })
            .ToListAsync(cancellationToken);

        var latest = new LatestInterventions();

        foreach (var row in rows)
        {
            var (dates, key) = (row.ItemId, row.ZoneId) switch
            {
                ({ } itemId, _) => (latest._byItem, itemId),
                (null, { } zoneId) => (latest._byZone, zoneId),
                _ => (latest._bySpace, row.SpaceId)
            };

            if (!dates.TryGetValue(key, out var known) || row.Last > known)
            {
                dates[key] = row.Last;
            }
        }

        return latest;
    }

    public DateOnly? ForItem(int itemId, int spaceId, int? zoneId)
    {
        DateOnly? Find(Dictionary<int, DateOnly> dates, int? key)
            => key is { } value && dates.TryGetValue(value, out var date) ? date : null;

        return new[] { Find(_byItem, itemId), Find(_byZone, zoneId), Find(_bySpace, spaceId) }.Max();
    }
}
