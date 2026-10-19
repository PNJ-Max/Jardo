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

    private static SpaceResponseDto ToDto(SpaceWithCounts row)
        => SpaceResponseDto.FromEntity(row.Space, row.ZoneCount, row.ItemCount);

    public async Task<List<SpaceResponseDto>> GetAllAsync(bool includeArchived = false, CancellationToken cancellationToken = default)
    {
        var source = _db.Spaces.AsNoTracking();

        if (!includeArchived)
        {
            source = source.Where(space => !space.IsArchived);
        }

        var rows = await Project(source.OrderBy(space => space.Name)).ToListAsync(cancellationToken);

        return rows.Select(ToDto).ToList();
    }

    public async Task<SpaceResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var source = _db.Spaces
            .AsNoTracking()
            .Where(space => space.Id == id);

        var row = await Project(source).FirstOrDefaultAsync(cancellationToken)
            ?? throw NotFoundException.For("Space", id);

        return ToDto(row);
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

        return SpaceResponseDto.FromEntity(space, zoneCount: 0, itemCount: 0);
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
