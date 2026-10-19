using Jardo.Api.Data;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Services;

/// <summary>
/// La cible d'une entrée du journal ou d'une tâche : un espace, et éventuellement une de ses zones
/// ou un de ses éléments. Un élément situé dans une zone emporte cette zone.
/// </summary>
public record InterventionTarget(int SpaceId, int? ZoneId, int? ItemId)
{
    /// <summary>
    /// Vérifie que la cible demandée est cohérente et accueille ce type d'intervention. Une cible
    /// archivée n'est refusée que si elle change : ce qui y est déjà reste corrigeable.
    /// </summary>
    /// <param name="current">La cible actuelle pour une modification, null pour une création.</param>
    /// <param name="action">Ce que l'archivage empêche, pour le message : « noter une intervention ».</param>
    /// <exception cref="BusinessRuleException">
    /// Identifiant inexistant, zone ou élément hors de l'espace, type refusé par l'espace, cible archivée.
    /// </exception>
    public static async Task<InterventionTarget> ResolveAsync(
        GardenDbContext db,
        int spaceId,
        int? zoneId,
        int? itemId,
        JournalEntryKind kind,
        InterventionTarget? current,
        string action,
        CancellationToken cancellationToken)
    {
        // 400 et non 404 : ce sont les identifiants du corps qui sont invalides.
        var space = await db.Spaces
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == spaceId, cancellationToken)
            ?? throw new BusinessRuleException($"L'espace {spaceId} n'existe pas.");

        if (!kind.IsAllowedIn(space.Kind))
        {
            throw new BusinessRuleException(
                $"L'espace « {space.Name} » est un espace {space.Kind.Label()} : " +
                $"il n'accueille pas d'intervention « {kind.Label()} ».");
        }

        if (zoneId is { } requestedZoneId)
        {
            var zone = await db.Zones
                .AsNoTracking()
                .FirstOrDefaultAsync(candidate => candidate.Id == requestedZoneId, cancellationToken)
                ?? throw new BusinessRuleException($"La zone {requestedZoneId} n'existe pas.");

            if (zone.SpaceId != space.Id)
            {
                throw new BusinessRuleException(
                    $"La zone « {zone.Name} » n'appartient pas à l'espace « {space.Name} ».");
            }
        }

        var target = new InterventionTarget(space.Id, zoneId, ItemId: null);
        GardenItem? item = null;

        if (itemId is { } requestedItemId)
        {
            item = await db.GardenItems
                .AsNoTracking()
                .FirstOrDefaultAsync(candidate => candidate.Id == requestedItemId, cancellationToken)
                ?? throw new BusinessRuleException($"L'élément {requestedItemId} n'existe pas.");

            if (item.SpaceId != space.Id)
            {
                throw new BusinessRuleException(
                    $"L'élément « {item.Name} » n'est pas dans l'espace « {space.Name} ».");
            }

            if (zoneId.HasValue && item.ZoneId != zoneId)
            {
                throw new BusinessRuleException(
                    $"L'élément « {item.Name} » n'est pas dans la zone {zoneId}.");
            }

            target = new InterventionTarget(space.Id, item.ZoneId, item.Id);
        }

        if (target == current)
        {
            return target;
        }

        if (space.IsArchived)
        {
            throw new BusinessRuleException(
                $"L'espace « {space.Name} » est archivé : réactivez-le avant d'y {action}.");
        }

        if (item is { IsArchived: true })
        {
            throw new BusinessRuleException(
                $"L'élément « {item.Name} » est archivé : réactivez-le avant d'y {action}.");
        }

        return target;
    }
}
