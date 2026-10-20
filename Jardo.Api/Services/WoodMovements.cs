using Jardo.Api.Data;
using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Services;

/// <summary>
/// Lecture des apports et consommations de bois du journal : seules comptent les entrées qui visent
/// un tas. Une entrée notée sur l'espace ou une zone, sans tas, n'entre dans le stock d'aucun.
/// </summary>
public static class WoodMovements
{
    /// <param name="excludingEntryId">
    /// Une entrée à ignorer, pour vérifier un stock en y substituant l'entrée qu'on s'apprête à écrire.
    /// </param>
    public static async Task<Dictionary<int, List<WoodMovement>>> LoadAsync(
        GardenDbContext db,
        IReadOnlyCollection<int> pileIds,
        int? excludingEntryId,
        CancellationToken cancellationToken)
    {
        var query = db.JournalEntries
            .AsNoTracking()
            .Where(entry =>
                entry.ItemId != null
                && pileIds.Contains(entry.ItemId.Value)
                && (entry.Kind == JournalEntryKind.WoodSupply || entry.Kind == JournalEntryKind.WoodConsumption));

        if (excludingEntryId is { } excluded)
        {
            query = query.Where(entry => entry.Id != excluded);
        }

        var rows = await query
            .Select(entry => new { ItemId = entry.ItemId!.Value, entry.Kind, entry.Quantity })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(row => row.ItemId)
            .ToDictionary(
                group => group.Key,
                group => group.Select(row => new WoodMovement(row.Kind, row.Quantity ?? 0)).ToList());
    }
}
