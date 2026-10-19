using Jardo.Api.Data;
using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Services;

/// <inheritdoc cref="IZoneService"/>
public class ZoneService : IZoneService
{
    private readonly GardenDbContext _db;
    private readonly TimeProvider _timeProvider;

    public ZoneService(GardenDbContext db, TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    private record ZoneWithItems(Zone Zone, int ItemCount, List<PlantWateringInfo> ActivePlants);

    private record PlantWateringInfo(int Id, int WateringIntervalDays, DateOnly? PlantedDate);

    // Une seule requête SQL pour zones et éléments. L'appelant filtre et trie avant la projection :
    // un OrderBy sur la projection n'est pas traduisible par EF Core.
    private static IQueryable<ZoneWithItems> Project(IQueryable<Zone> zones)
        => zones
            .Select(zone => new ZoneWithItems(
                zone,
                zone.Items.Count(item => !item.IsArchived),
                zone.Items
                    .OfType<Plant>()
                    .Where(plant => !plant.IsArchived)
                    .Select(plant => new PlantWateringInfo(plant.Id, plant.WateringIntervalDays, plant.PlantedDate))
                    .ToList()));

    private static ZoneResponseDto ToDto(ZoneWithItems row, LatestInterventions waterings, DateOnly today)
    {
        var plantsNeedingWater = row.ActivePlants.Count(plant => WateringCalculator.Calculate(
            plant.WateringIntervalDays,
            waterings.ForItem(plant.Id, row.Zone.SpaceId, row.Zone.Id),
            plant.PlantedDate,
            today).Status != WateringStatus.Ok);

        return ZoneResponseDto.FromEntity(row.Zone, row.ItemCount, plantsNeedingWater);
    }

    private Task<LatestInterventions> LoadWateringsAsync(int spaceId, CancellationToken cancellationToken)
        => LatestInterventions.LoadAsync(
            _db.JournalEntries.Where(entry => entry.SpaceId == spaceId),
            JournalEntryKind.Watering,
            cancellationToken);

    public async Task<List<ZoneResponseDto>> GetBySpaceAsync(int spaceId, CancellationToken cancellationToken = default)
    {
        var today = _timeProvider.Today();

        if (!await _db.Spaces.AnyAsync(space => space.Id == spaceId, cancellationToken))
        {
            throw NotFoundException.For("Space", spaceId);
        }

        var source = _db.Zones
            .AsNoTracking()
            .Where(zone => zone.SpaceId == spaceId)
            .OrderBy(zone => zone.Name);

        var rows = await Project(source).ToListAsync(cancellationToken);
        var waterings = await LoadWateringsAsync(spaceId, cancellationToken);

        return rows.Select(row => ToDto(row, waterings, today)).ToList();
    }

    public async Task<ZoneResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var today = _timeProvider.Today();

        var source = _db.Zones
            .AsNoTracking()
            .Where(zone => zone.Id == id);

        var row = await Project(source).FirstOrDefaultAsync(cancellationToken)
            ?? throw NotFoundException.For("Zone", id);

        var waterings = await LoadWateringsAsync(row.Zone.SpaceId, cancellationToken);

        return ToDto(row, waterings, today);
    }

    public async Task<ZoneResponseDto> CreateAsync(int spaceId, SaveZoneDto dto, CancellationToken cancellationToken = default)
    {
        var name = Text.Required(dto.Name, "Nom");

        var space = await _db.Spaces
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == spaceId, cancellationToken)
            ?? throw NotFoundException.For("Space", spaceId);

        if (space.IsArchived)
        {
            throw new BusinessRuleException(
                $"L'espace « {space.Name} » est archivé : réactivez-le avant d'y ajouter une zone.");
        }

        await EnsureNameIsAvailableAsync(spaceId, name, excludingZoneId: null, cancellationToken);

        var zone = new Zone
        {
            SpaceId = spaceId,
            Name = name,
            Description = Text.Optional(dto.Description),
            CreatedAt = _timeProvider.GetUtcNow()
        };

        _db.Zones.Add(zone);
        await _db.SaveChangesAsync(cancellationToken);

        return ZoneResponseDto.FromEntity(zone, itemCount: 0, plantsNeedingWater: 0);
    }

    public async Task<ZoneResponseDto> UpdateAsync(int id, SaveZoneDto dto, CancellationToken cancellationToken = default)
    {
        var name = Text.Required(dto.Name, "Nom");

        var zone = await _db.Zones.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("Zone", id);

        await EnsureNameIsAvailableAsync(zone.SpaceId, name, excludingZoneId: id, cancellationToken);

        zone.Name = name;
        zone.Description = Text.Optional(dto.Description);

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var zone = await _db.Zones.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("Zone", id);

        // Archivés compris : la base refuserait de toute façon (Restrict). Le détail évite un écart
        // avec le compteur de la zone, qui ne compte que les actifs.
        var activeCount = await _db.GardenItems
            .CountAsync(item => item.ZoneId == id && !item.IsArchived, cancellationToken);

        var archivedCount = await _db.GardenItems
            .CountAsync(item => item.ZoneId == id && item.IsArchived, cancellationToken);

        if (activeCount + archivedCount > 0)
        {
            var detail = archivedCount > 0
                ? $"{activeCount} élément(s) actif(s) et {archivedCount} archivé(s)"
                : $"{activeCount} élément(s)";

            throw new BusinessRuleException(
                $"La zone « {zone.Name} » contient encore {detail}. " +
                "Déplacez-les ou supprimez-les avant de supprimer la zone.");
        }

        _db.Zones.Remove(zone);
        await _db.SaveChangesAsync(cancellationToken);
    }

    // Double l'index unique (SpaceId, Name) pour produire un message clair ; l'index reste le
    // garant en cas de requêtes concurrentes.
    private async Task EnsureNameIsAvailableAsync(
        int spaceId,
        string name,
        int? excludingZoneId,
        CancellationToken cancellationToken)
    {
        var query = _db.Zones
            .AsNoTracking()
            .Where(zone => zone.SpaceId == spaceId && zone.Name == name);

        // Filtre conditionnel et non `Id != excludingZoneId` : avec null, EF Core génère `Id <> NULL`,
        // toujours faux en SQL, et le contrôle ne détecterait aucun doublon à la création.
        if (excludingZoneId.HasValue)
        {
            query = query.Where(zone => zone.Id != excludingZoneId.Value);
        }

        if (await query.AnyAsync(cancellationToken))
        {
            throw new BusinessRuleException($"Une zone nommée « {name} » existe déjà dans cet espace.");
        }
    }
}
