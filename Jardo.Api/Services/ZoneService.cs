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

    private record ZoneWithPlants(Zone Zone, List<PlantWateringInfo> ActivePlants);

    private record PlantWateringInfo(int WateringIntervalDays, DateOnly? PlantedDate, DateOnly? LastWateredAt);

    // Une seule requête SQL pour zones, plantes et arrosages. L'appelant filtre et trie avant la
    // projection : un OrderBy sur la projection n'est pas traduisible par EF Core.
    private static IQueryable<ZoneWithPlants> Project(IQueryable<Zone> zones)
        => zones
            .Select(zone => new ZoneWithPlants(
                zone,
                zone.Plants
                    .Where(plant => !plant.IsArchived)
                    .Select(plant => new PlantWateringInfo(
                        plant.WateringIntervalDays,
                        plant.PlantedDate,
                        plant.WateringLogs.Max(log => (DateOnly?)log.WateredAt)))
                    .ToList()));

    private int CountNeedingWater(List<PlantWateringInfo> plants, DateOnly today)
        => plants.Count(plant => WateringCalculator.Calculate(
            plant.WateringIntervalDays,
            plant.LastWateredAt,
            plant.PlantedDate,
            today).Status != WateringStatus.Ok);

    private ZoneResponseDto ToDto(ZoneWithPlants row, DateOnly today)
        => ZoneResponseDto.FromEntity(
            row.Zone,
            plantCount: row.ActivePlants.Count,
            plantsNeedingWater: CountNeedingWater(row.ActivePlants, today));

    public async Task<List<ZoneResponseDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var today = _timeProvider.Today();

        var source = _db.Zones
            .AsNoTracking()
            .OrderBy(zone => zone.Name);

        var rows = await Project(source).ToListAsync(cancellationToken);

        return rows.Select(row => ToDto(row, today)).ToList();
    }

    public async Task<ZoneResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var today = _timeProvider.Today();

        var source = _db.Zones
            .AsNoTracking()
            .Where(zone => zone.Id == id);

        var row = await Project(source).FirstOrDefaultAsync(cancellationToken)
            ?? throw NotFoundException.For("Zone", id);

        return ToDto(row, today);
    }

    public async Task<ZoneResponseDto> CreateAsync(CreateZoneDto dto, CancellationToken cancellationToken = default)
    {
        var name = Text.Required(dto.Name, "Nom");

        await EnsureNameIsAvailableAsync(name, excludingZoneId: null, cancellationToken);

        var zone = new Zone
        {
            Name = name,
            Description = Text.Optional(dto.Description),
            CreatedAt = _timeProvider.GetUtcNow()
        };

        _db.Zones.Add(zone);
        await _db.SaveChangesAsync(cancellationToken);

        return ZoneResponseDto.FromEntity(zone, plantCount: 0, plantsNeedingWater: 0);
    }

    public async Task<ZoneResponseDto> UpdateAsync(int id, UpdateZoneDto dto, CancellationToken cancellationToken = default)
    {
        var name = Text.Required(dto.Name, "Nom");

        var zone = await _db.Zones.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("Zone", id);

        await EnsureNameIsAvailableAsync(name, excludingZoneId: id, cancellationToken);

        zone.Name = name;
        zone.Description = Text.Optional(dto.Description);

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var zone = await _db.Zones.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("Zone", id);

        // La cascade en base détruirait les plantes et leur historique : on refuse tant que la zone
        // en contient, archivées comprises. Le détail évite un écart avec le compteur de la liste
        // des zones, qui ne compte que les actives.
        var activeCount = await _db.Plants
            .CountAsync(plant => plant.ZoneId == id && !plant.IsArchived, cancellationToken);

        var archivedCount = await _db.Plants
            .CountAsync(plant => plant.ZoneId == id && plant.IsArchived, cancellationToken);

        if (activeCount + archivedCount > 0)
        {
            var detail = archivedCount > 0
                ? $"{activeCount} plante(s) active(s) et {archivedCount} archivée(s)"
                : $"{activeCount} plante(s)";

            throw new BusinessRuleException(
                $"La zone « {zone.Name} » contient encore {detail}. " +
                "Déplacez-les ou supprimez-les avant de supprimer la zone.");
        }

        _db.Zones.Remove(zone);
        await _db.SaveChangesAsync(cancellationToken);
    }

    // Double l'index unique de la base pour produire un message clair ; l'index reste le garant
    // en cas de requêtes concurrentes.
    private async Task EnsureNameIsAvailableAsync(string name, int? excludingZoneId, CancellationToken cancellationToken)
    {
        var query = _db.Zones
            .AsNoTracking()
            .Where(zone => zone.Name == name);

        // Filtre conditionnel et non `Id != excludingZoneId` : avec null, EF Core génère `Id <> NULL`,
        // toujours faux en SQL, et le contrôle ne détecterait aucun doublon à la création.
        if (excludingZoneId.HasValue)
        {
            query = query.Where(zone => zone.Id != excludingZoneId.Value);
        }

        if (await query.AnyAsync(cancellationToken))
        {
            throw new BusinessRuleException($"Une zone nommée « {name} » existe déjà.");
        }
    }
}
