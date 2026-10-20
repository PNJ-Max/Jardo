using Jardo.Api.Data;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Services;

/// <summary>Règles de placement communes aux éléments suivis : plantes et tas de bois.</summary>
internal static class ItemPlacement
{
    /// <param name="Plural">Pour « il n'accueille pas … » : « de plantes ».</param>
    /// <param name="Singular">Pour « avant d'y ajouter … » : « une plante ».</param>
    public record Noun(string Plural, string Singular);

    // 400 et non 404 : la ressource demandée est l'élément, ce sont les identifiants du corps qui
    // sont invalides. Un espace archivé garde ses éléments mais n'en reçoit plus de nouveaux.
    public static async Task EnsureValidAsync(
        GardenDbContext db,
        int spaceId,
        int? zoneId,
        bool isNewToSpace,
        Func<SpaceKind, bool> accepts,
        Noun noun,
        CancellationToken cancellationToken)
    {
        var space = await db.Spaces
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == spaceId, cancellationToken)
            ?? throw new BusinessRuleException($"L'espace {spaceId} n'existe pas.");

        if (!accepts(space.Kind))
        {
            throw new BusinessRuleException(
                $"L'espace « {space.Name} » est un espace {space.Kind.Label()} : il n'accueille pas {noun.Plural}.");
        }

        if (isNewToSpace && space.IsArchived)
        {
            throw new BusinessRuleException(
                $"L'espace « {space.Name} » est archivé : réactivez-le avant d'y ajouter {noun.Singular}.");
        }

        if (zoneId is null)
        {
            return;
        }

        var zoneSpaceId = await db.Zones
            .AsNoTracking()
            .Where(zone => zone.Id == zoneId.Value)
            .Select(zone => (int?)zone.SpaceId)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new BusinessRuleException($"La zone {zoneId} n'existe pas.");

        if (zoneSpaceId != spaceId)
        {
            throw new BusinessRuleException(
                $"La zone {zoneId} n'appartient pas à l'espace « {space.Name} ».");
        }
    }

    /// <summary>
    /// Le journal et les tâches d'un élément le suivent : ils restent dans son espace et sa zone, ce
    /// qui permet de supprimer sans perte un espace ou une zone vidés de leurs éléments.
    /// </summary>
    public static async Task MoveHistoryAsync(
        GardenDbContext db,
        int itemId,
        int spaceId,
        int? zoneId,
        CancellationToken cancellationToken)
    {
        var entries = await db.JournalEntries
            .Where(entry => entry.ItemId == itemId)
            .ToListAsync(cancellationToken);

        foreach (var entry in entries)
        {
            entry.SpaceId = spaceId;
            entry.ZoneId = zoneId;
        }

        var tasks = await db.GardenTasks
            .Where(task => task.ItemId == itemId)
            .ToListAsync(cancellationToken);

        foreach (var task in tasks)
        {
            task.SpaceId = spaceId;
            task.ZoneId = zoneId;
        }
    }
}
