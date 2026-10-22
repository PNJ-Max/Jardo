using Jardo.Api.Data;
using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Services;

/// <inheritdoc cref="ISpaceService"/>
public class SpaceService : ISpaceService
{
    private readonly GardenDbContext _db;
    private readonly TimeProvider _timeProvider;

    public SpaceService(GardenDbContext db, TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    private record SpaceWithCounts(Space Space, int ZoneCount, int ItemCount);

    private static IQueryable<SpaceWithCounts> Project(IQueryable<Space> spaces)
        => spaces.Select(space => new SpaceWithCounts(
            space,
            space.Zones.Count,
            space.Items.Count(item => !item.IsArchived)));

    private static SpaceResponseDto ToDto(SpaceWithCounts row, Dictionary<int, int> dueTaskCounts)
        => SpaceResponseDto.FromEntity(
            row.Space,
            row.ZoneCount,
            row.ItemCount,
            dueTaskCounts.GetValueOrDefault(row.Space.Id));

    // L'échéance n'est pas stockée : il faut la calculer pour chaque tâche avant de compter.
    private async Task<Dictionary<int, int>> CountDueTasksAsync(List<int> spaceIds, CancellationToken cancellationToken)
    {
        var rows = await _db.GardenTasks
            .AsNoTracking()
            .Active()
            .Where(task => spaceIds.Contains(task.SpaceId))
            .SelectWithNames()
            .ToListAsync(cancellationToken);

        var tasks = await rows.ToDtosAsync(
            _db.JournalEntries.Where(entry => spaceIds.Contains(entry.SpaceId)),
            _timeProvider,
            cancellationToken);

        return tasks
            .Where(task => task.Status is not DueStatus.Ok)
            .GroupBy(task => task.SpaceId)
            .ToDictionary(group => group.Key, group => group.Count());
    }

    public async Task<List<SpaceResponseDto>> GetAllAsync(bool includeArchived = false, CancellationToken cancellationToken = default)
    {
        var source = _db.Spaces.AsNoTracking();

        if (!includeArchived)
        {
            source = source.Where(space => !space.IsArchived);
        }

        var rows = await Project(source.OrderBy(space => space.Name)).ToListAsync(cancellationToken);
        var dueTaskCounts = await CountDueTasksAsync(rows.Select(row => row.Space.Id).ToList(), cancellationToken);

        return rows.Select(row => ToDto(row, dueTaskCounts)).ToList();
    }

    public async Task<SpaceResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var source = _db.Spaces
            .AsNoTracking()
            .Where(space => space.Id == id);

        var row = await Project(source).FirstOrDefaultAsync(cancellationToken)
            ?? throw NotFoundException.For("Space", id);

        return ToDto(row, await CountDueTasksAsync([id], cancellationToken));
    }

    public async Task<SpaceResponseDto> CreateAsync(SaveSpaceDto dto, CancellationToken cancellationToken = default)
    {
        var name = Text.Required(dto.Name, "Nom");

        await EnsureNameIsAvailableAsync(name, excludingSpaceId: null, cancellationToken);

        var space = new Space
        {
            GardenId = Garden.DefaultId,
            Name = name,
            Description = Text.Optional(dto.Description),
            Kind = dto.Kind!.Value,
            CreatedAt = _timeProvider.GetUtcNow()
        };

        _db.Spaces.Add(space);
        await _db.SaveChangesAsync(cancellationToken);

        return SpaceResponseDto.FromEntity(space, zoneCount: 0, itemCount: 0, dueTaskCount: 0);
    }

    public async Task<SpaceResponseDto> UpdateAsync(int id, SaveSpaceDto dto, CancellationToken cancellationToken = default)
    {
        var name = Text.Required(dto.Name, "Nom");
        var kind = dto.Kind!.Value;

        var space = await _db.Spaces.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("Space", id);

        await EnsureNameIsAvailableAsync(name, excludingSpaceId: id, cancellationToken);

        if (kind != space.Kind && !kind.AcceptsPlants())
        {
            var plantCount = await _db.Plants.CountAsync(plant => plant.SpaceId == id, cancellationToken);

            if (plantCount > 0)
            {
                throw new BusinessRuleException(
                    $"L'espace « {space.Name} » contient {plantCount} plante(s), archivées comprises : " +
                    $"un espace {kind.Label()} n'accueille pas de plantes.");
            }
        }

        if (kind != space.Kind && !kind.AcceptsWoodPiles())
        {
            var pileCount = await _db.WoodPiles.CountAsync(pile => pile.SpaceId == id, cancellationToken);

            if (pileCount > 0)
            {
                throw new BusinessRuleException(
                    $"L'espace « {space.Name} » contient {pileCount} tas de bois, archivés compris : " +
                    $"un espace {kind.Label()} n'accueille pas de tas de bois.");
            }
        }

        if (kind != space.Kind)
        {
            var journalKinds = await _db.JournalEntries
                .Where(entry => entry.SpaceId == id)
                .Select(entry => entry.Kind)
                .Distinct()
                .ToListAsync(cancellationToken);

            var taskKinds = await _db.GardenTasks
                .Where(task => task.SpaceId == id)
                .Select(task => task.Kind)
                .Distinct()
                .ToListAsync(cancellationToken);

            var refused = journalKinds.Union(taskKinds).Where(entryKind => !entryKind.IsAllowedIn(kind)).ToList();

            if (refused.Count > 0)
            {
                throw new BusinessRuleException(
                    $"Le journal ou les tâches de l'espace « {space.Name} » contiennent des interventions " +
                    $"« {string.Join(" », « ", refused.Select(entryKind => entryKind.Label()))} », " +
                    $"qu'un espace {kind.Label()} n'accueille pas.");
            }
        }

        if (kind != space.Kind)
        {
            await FreeMapSlotsAsync(id, cancellationToken);
        }

        space.Name = name;
        space.Description = Text.Optional(dto.Description);
        space.Kind = kind;

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<SpaceResponseDto> SetArchivedAsync(int id, bool isArchived, CancellationToken cancellationToken = default)
    {
        var space = await _db.Spaces.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("Space", id);

        if (isArchived)
        {
            await FreeMapSlotsAsync(id, cancellationToken);
        }

        space.IsArchived = isArchived;
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var space = await _db.Spaces.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("Space", id);

        // Archivés compris : supprimer l'espace effacerait leur historique.
        var itemCount = await _db.GardenItems.CountAsync(item => item.SpaceId == id, cancellationToken);

        if (itemCount > 0)
        {
            throw new BusinessRuleException(
                $"L'espace « {space.Name} » contient encore {itemCount} élément(s), archivés compris. " +
                "Archivez l'espace plutôt que de le supprimer.");
        }

        _db.Spaces.Remove(space);
        await _db.SaveChangesAsync(cancellationToken);
    }

    // Un espace archivé, ou dont le type change, n'est plus valable sur son emplacement : il passe
    // dans « Hors carte ». Supprimé par SaveChanges avec la modification qui l'a causé.
    private async Task FreeMapSlotsAsync(int spaceId, CancellationToken cancellationToken)
        => _db.GardenMapSlots.RemoveRange(
            await _db.GardenMapSlots.Where(slot => slot.SpaceId == spaceId).ToListAsync(cancellationToken));

    // Double l'index unique de la base pour produire un message clair. Les espaces archivés
    // comptent : les réactiver ne doit pas créer de doublon.
    private async Task EnsureNameIsAvailableAsync(string name, int? excludingSpaceId, CancellationToken cancellationToken)
    {
        var query = _db.Spaces
            .AsNoTracking()
            .Where(space => space.GardenId == Garden.DefaultId && space.Name == name);

        if (excludingSpaceId.HasValue)
        {
            query = query.Where(space => space.Id != excludingSpaceId.Value);
        }

        if (await query.AnyAsync(cancellationToken))
        {
            throw new BusinessRuleException($"Un espace nommé « {name} » existe déjà.");
        }
    }
}
