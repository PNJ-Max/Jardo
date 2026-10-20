using Jardo.Api.Data;
using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Services;

/// <inheritdoc cref="IGardenMapService"/>
public class GardenMapService : IGardenMapService
{
    private readonly GardenDbContext _db;

    public GardenMapService(GardenDbContext db)
    {
        _db = db;
    }

    public async Task<GardenMapResponseDto> GetAsync(CancellationToken cancellationToken = default)
    {
        var layout = await _db.Gardens
            .AsNoTracking()
            .Where(garden => garden.Id == Garden.DefaultId)
            .Select(garden => garden.MapLayout)
            .SingleAsync(cancellationToken);

        var slots = await _db.GardenMapSlots
            .AsNoTracking()
            .Where(slot => slot.GardenId == Garden.DefaultId)
            .OrderBy(slot => slot.SlotKey)
            .Select(slot => new GardenMapSlotResponseDto
            {
                SlotKey = slot.SlotKey,
                SpaceId = slot.SpaceId,
                SpaceName = slot.Space.Name,
                SpaceKind = slot.Space.Kind,
                ZoneId = slot.ZoneId,
                ZoneName = slot.Zone == null ? null : slot.Zone.Name
            })
            .ToListAsync(cancellationToken);

        return new GardenMapResponseDto { Layout = layout, Slots = slots };
    }

    public async Task<GardenMapResponseDto> ReplaceAsync(SaveGardenMapDto dto, CancellationToken cancellationToken = default)
    {
        var layoutKey = Text.Optional(dto.Layout);
        var assignments = await ValidateAsync(layoutKey, dto.Slots, cancellationToken);

        var garden = await _db.Gardens
            .Include(candidate => candidate.MapSlots)
            .SingleAsync(candidate => candidate.Id == Garden.DefaultId, cancellationToken);

        garden.MapLayout = layoutKey;

        // Un seul SaveChanges, donc une seule transaction : la carte est remplacée en entier ou pas
        // du tout. EF Core ordonne les suppressions avant les insertions de l'index unique.
        _db.GardenMapSlots.RemoveRange(garden.MapSlots);
        _db.GardenMapSlots.AddRange(assignments.Select(assignment => new GardenMapSlot
        {
            GardenId = garden.Id,
            SlotKey = assignment.SlotKey,
            SpaceId = assignment.SpaceId,
            ZoneId = assignment.ZoneId
        }));

        await _db.SaveChangesAsync(cancellationToken);

        return await GetAsync(cancellationToken);
    }

    private record Assignment(string SlotKey, int SpaceId, int? ZoneId);

    private async Task<List<Assignment>> ValidateAsync(
        string? layoutKey,
        List<SaveGardenMapSlotDto> slots,
        CancellationToken cancellationToken)
    {
        if (layoutKey is null)
        {
            if (slots.Count > 0)
            {
                throw new BusinessRuleException("Sans modèle de carte, aucun emplacement ne peut être affecté.");
            }

            return [];
        }

        var layout = GardenLayouts.Find(layoutKey)
            ?? throw new BusinessRuleException($"Le modèle de carte « {layoutKey} » n'existe pas.");

        var spaceIds = slots.Select(slot => slot.SpaceId).Distinct().ToList();
        var zoneIds = slots.Where(slot => slot.ZoneId.HasValue).Select(slot => slot.ZoneId!.Value).Distinct().ToList();

        var spaces = await _db.Spaces
            .AsNoTracking()
            .Where(space => spaceIds.Contains(space.Id))
            .ToDictionaryAsync(space => space.Id, cancellationToken);

        var zones = await _db.Zones
            .AsNoTracking()
            .Where(zone => zoneIds.Contains(zone.Id))
            .ToDictionaryAsync(zone => zone.Id, cancellationToken);

        var assignments = new List<Assignment>();
        var usedKeys = new HashSet<string>();
        var usedTargets = new HashSet<(int SpaceId, int? ZoneId)>();

        foreach (var slot in slots)
        {
            var slotKey = Text.Required(slot.SlotKey, "Emplacement");

            var definition = layout.FindSlot(slotKey)
                ?? throw new BusinessRuleException($"L'emplacement « {slotKey} » n'existe pas dans le modèle « {layout.Key} ».");

            if (!usedKeys.Add(slotKey))
            {
                throw new BusinessRuleException($"L'emplacement « {slotKey} » est affecté plusieurs fois.");
            }

            var space = spaces.GetValueOrDefault(slot.SpaceId)
                ?? throw new BusinessRuleException($"L'espace {slot.SpaceId} n'existe pas.");

            if (space.IsArchived)
            {
                throw new BusinessRuleException($"L'espace « {space.Name} » est archivé : réactivez-le avant de le placer sur la carte.");
            }

            if (space.Kind != definition.Kind)
            {
                throw new BusinessRuleException(
                    $"L'emplacement « {slotKey} » n'accepte qu'un espace {definition.Kind.Label()} : " +
                    $"« {space.Name} » est un espace {space.Kind.Label()}.");
            }

            if (!definition.AcceptsZone)
            {
                if (slot.ZoneId.HasValue)
                {
                    throw new BusinessRuleException($"L'emplacement « {slotKey} » accueille un espace entier, pas une zone.");
                }
            }
            else
            {
                if (slot.ZoneId is not { } zoneId)
                {
                    throw new BusinessRuleException($"L'emplacement « {slotKey} » accueille une zone de l'espace {definition.Kind.Label()}.");
                }

                var zone = zones.GetValueOrDefault(zoneId)
                    ?? throw new BusinessRuleException($"La zone {zoneId} n'existe pas.");

                if (zone.SpaceId != space.Id)
                {
                    throw new BusinessRuleException($"La zone « {zone.Name} » n'appartient pas à l'espace « {space.Name} ».");
                }
            }

            if (!usedTargets.Add((slot.SpaceId, slot.ZoneId)))
            {
                throw new BusinessRuleException(
                    $"« {space.Name} » est déjà posé sur la carte : un espace ou une zone n'a qu'un emplacement.");
            }

            assignments.Add(new Assignment(slotKey, slot.SpaceId, slot.ZoneId));
        }

        return assignments;
    }
}
