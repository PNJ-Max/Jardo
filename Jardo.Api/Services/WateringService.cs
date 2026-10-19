using Jardo.Api.Data;
using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Services;

/// <inheritdoc cref="IWateringService"/>
public class WateringService : IWateringService
{
    private readonly GardenDbContext _db;
    private readonly TimeProvider _timeProvider;
    private readonly IJournalService _journalService;

    public WateringService(GardenDbContext db, TimeProvider timeProvider, IJournalService journalService)
    {
        _db = db;
        _timeProvider = timeProvider;
        _journalService = journalService;
    }

    public async Task<List<PlantResponseDto>> GetPlantsNeedingWaterAsync(CancellationToken cancellationToken = default)
    {
        var today = _timeProvider.Today();

        var rows = await _db.Plants
            .AsNoTracking()
            .Where(plant => !plant.IsArchived && !plant.Space.IsArchived)
            .SelectWithNames()
            .ToListAsync(cancellationToken);

        var waterings = await LatestInterventions.LoadAsync(_db.JournalEntries, JournalEntryKind.Watering, cancellationToken);

        // Filtre et tri en mémoire : l'état d'arrosage est calculé, pas stocké. Suffisant pour
        // quelques dizaines de plantes.
        return rows
            .Select(row => row.ToDto(waterings, today))
            .Where(dto => dto.NeedsWater)
            .OrderByDescending(dto => dto.DaysOverdue)
            .ThenBy(dto => dto.Name)
            .ToList();
    }

    public async Task<JournalEntryResponseDto> WaterPlantAsync(
        int plantId,
        CreateWateringDto dto,
        CancellationToken cancellationToken = default)
    {
        var spaceId = await _db.Plants
            .Where(plant => plant.Id == plantId)
            .Select(plant => (int?)plant.SpaceId)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw NotFoundException.For("Plant", plantId);

        return await _journalService.CreateAsync(ToEntry(dto, spaceId, zoneId: null, itemId: plantId), cancellationToken);
    }

    public async Task<JournalEntryResponseDto> WaterZoneAsync(
        int zoneId,
        CreateWateringDto dto,
        CancellationToken cancellationToken = default)
    {
        var spaceId = await _db.Zones
            .Where(zone => zone.Id == zoneId)
            .Select(zone => (int?)zone.SpaceId)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw NotFoundException.For("Zone", zoneId);

        return await _journalService.CreateAsync(ToEntry(dto, spaceId, zoneId, itemId: null), cancellationToken);
    }

    private SaveJournalEntryDto ToEntry(CreateWateringDto dto, int spaceId, int? zoneId, int? itemId) => new()
    {
        Date = dto.WateredAt ?? _timeProvider.Today(),
        Kind = JournalEntryKind.Watering,
        Note = dto.Note,
        SpaceId = spaceId,
        ZoneId = zoneId,
        ItemId = itemId
    };
}
