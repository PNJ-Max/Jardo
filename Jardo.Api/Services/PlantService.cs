using Jardo.Api.Data;
using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Services;

/// <inheritdoc cref="IPlantService"/>
public class PlantService : IPlantService
{
    private readonly GardenDbContext _db;
    private readonly TimeProvider _timeProvider;

    public PlantService(GardenDbContext db, TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    public async Task<List<PlantResponseDto>> GetAllAsync(
        int? zoneId = null,
        bool includeArchived = false,
        CancellationToken cancellationToken = default)
    {
        var today = _timeProvider.Today();

        var query = _db.Plants.AsNoTracking().AsQueryable();

        if (zoneId.HasValue)
        {
            query = query.Where(plant => plant.ZoneId == zoneId.Value);
        }

        if (!includeArchived)
        {
            query = query.Where(plant => !plant.IsArchived);
        }

        var rows = await query
            .OrderBy(plant => plant.Zone.Name)
            .ThenBy(plant => plant.Name)
            .SelectWithWatering()
            .ToListAsync(cancellationToken);

        return rows.Select(row => row.ToDto(today)).ToList();
    }

    public async Task<PlantResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var today = _timeProvider.Today();

        var row = await _db.Plants
            .AsNoTracking()
            .Where(plant => plant.Id == id)
            .SelectWithWatering()
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw NotFoundException.For("Plant", id);

        return row.ToDto(today);
    }

    public async Task<PlantResponseDto> CreateAsync(CreatePlantDto dto, CancellationToken cancellationToken = default)
    {
        var zoneName = await GetZoneNameOrThrowAsync(dto.ZoneId, cancellationToken);

        var plant = new Plant
        {
            Name = Text.Required(dto.Name, "Nom"),
            Species = Text.Optional(dto.Species),
            PlantedDate = dto.PlantedDate,
            WateringIntervalDays = dto.WateringIntervalDays,
            ZoneId = dto.ZoneId,
            IsArchived = false,
            CreatedAt = _timeProvider.GetUtcNow()
        };

        _db.Plants.Add(plant);
        await _db.SaveChangesAsync(cancellationToken);

        var state = WateringCalculator.Calculate(
            plant.WateringIntervalDays,
            lastWateredAt: null,
            plant.PlantedDate,
            _timeProvider.Today());

        return PlantResponseDto.FromEntity(plant, state, zoneName);
    }

    public async Task<PlantResponseDto> UpdateAsync(int id, UpdatePlantDto dto, CancellationToken cancellationToken = default)
    {
        var plant = await _db.Plants.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("Plant", id);

        await GetZoneNameOrThrowAsync(dto.ZoneId, cancellationToken);

        plant.Name = Text.Required(dto.Name, "Nom");
        plant.Species = Text.Optional(dto.Species);
        plant.PlantedDate = dto.PlantedDate;
        plant.WateringIntervalDays = dto.WateringIntervalDays;
        plant.ZoneId = dto.ZoneId;

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<PlantResponseDto> SetArchivedAsync(int id, bool isArchived, CancellationToken cancellationToken = default)
    {
        var plant = await _db.Plants.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("Plant", id);

        plant.IsArchived = isArchived;
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var plant = await _db.Plants.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("Plant", id);

        // Arrosages et observations partent avec la plante, par la cascade de GardenDbContext.
        _db.Plants.Remove(plant);
        await _db.SaveChangesAsync(cancellationToken);
    }

    // 400 et non 404 : la ressource demandée est la plante, c'est le ZoneId du corps qui est invalide.
    private async Task<string> GetZoneNameOrThrowAsync(int zoneId, CancellationToken cancellationToken)
    {
        var zoneName = await _db.Zones
            .AsNoTracking()
            .Where(zone => zone.Id == zoneId)
            .Select(zone => zone.Name)
            .FirstOrDefaultAsync(cancellationToken);

        if (zoneName is null)
        {
            throw new BusinessRuleException($"La zone {zoneId} n'existe pas.");
        }

        return zoneName;
    }
}
