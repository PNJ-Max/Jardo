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
    private readonly ILogger<WateringService> _logger;

    public WateringService(GardenDbContext db, TimeProvider timeProvider, ILogger<WateringService> logger)
    {
        _db = db;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public async Task<List<PlantResponseDto>> GetPlantsNeedingWaterAsync(CancellationToken cancellationToken = default)
    {
        var today = _timeProvider.Today();

        var rows = await _db.Plants
            .AsNoTracking()
            .Where(plant => !plant.IsArchived && !plant.Space.IsArchived)
            .SelectWithWatering()
            .ToListAsync(cancellationToken);

        // Filtre et tri en mémoire : l'état d'arrosage est calculé, pas stocké. Suffisant pour
        // quelques dizaines de plantes.
        return rows
            .Select(row => row.ToDto(today))
            .Where(dto => dto.NeedsWater)
            .OrderByDescending(dto => dto.DaysOverdue)
            .ThenBy(dto => dto.Name)
            .ToList();
    }

    public async Task<List<WateringLogResponseDto>> GetHistoryAsync(int plantId, CancellationToken cancellationToken = default)
    {
        await EnsurePlantExistsAsync(plantId, cancellationToken);

        var logs = await _db.WateringLogs
            .AsNoTracking()
            .Where(log => log.PlantId == plantId)
            .OrderByDescending(log => log.WateredAt)
            .ThenByDescending(log => log.Id)
            .ToListAsync(cancellationToken);

        return logs.Select(WateringLogResponseDto.FromEntity).ToList();
    }

    public async Task<WateringLogResponseDto> WaterPlantAsync(
        int plantId,
        CreateWateringDto dto,
        CancellationToken cancellationToken = default)
    {
        var plant = await _db.Plants
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == plantId, cancellationToken)
            ?? throw NotFoundException.For("Plant", plantId);

        if (plant.IsArchived)
        {
            throw new BusinessRuleException(
                $"La plante « {plant.Name} » est archivée : elle ne peut plus être arrosée. " +
                "Réactivez-la d'abord si elle est de nouveau en culture.");
        }

        var wateredAt = ResolveWateringDate(dto.WateredAt);

        var log = new WateringLog
        {
            PlantId = plantId,
            WateredAt = wateredAt,
            Note = Text.Optional(dto.Note)
        };

        _db.WateringLogs.Add(log);
        await _db.SaveChangesAsync(cancellationToken);

        return WateringLogResponseDto.FromEntity(log);
    }

    public async Task<ZoneWateringResultDto> WaterZoneAsync(
        int zoneId,
        CreateWateringDto dto,
        CancellationToken cancellationToken = default)
    {
        var zone = await _db.Zones
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == zoneId, cancellationToken)
            ?? throw NotFoundException.For("Zone", zoneId);

        var wateredAt = ResolveWateringDate(dto.WateredAt);
        var note = Text.Optional(dto.Note);

        var plantIds = await _db.Plants
            .AsNoTracking()
            .Where(plant => plant.ZoneId == zoneId && !plant.IsArchived)
            .Select(plant => plant.Id)
            .ToListAsync(cancellationToken);

        // Un enregistrement par plante : l'historique reste attaché à la plante, même déplacée de zone.
        var logs = plantIds
            .Select(plantId => new WateringLog
            {
                PlantId = plantId,
                WateredAt = wateredAt,
                Note = note
            })
            .ToList();

        _db.WateringLogs.AddRange(logs);

        // Un seul SaveChanges (donc une transaction) : toute la zone est arrosée, ou aucune plante.
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Zone {ZoneName} arrosée le {Date} : {Count} plante(s).",
            zone.Name, wateredAt, logs.Count);

        return new ZoneWateringResultDto
        {
            ZoneId = zone.Id,
            ZoneName = zone.Name,
            WateredAt = wateredAt,
            PlantsWatered = logs.Count
        };
    }

    // Une date future est refusée : elle repousserait l'échéance et masquerait la plante de la
    // liste « à arroser ». Le passé est accepté (saisie tardive).
    private DateOnly ResolveWateringDate(DateOnly? requested)
    {
        var today = _timeProvider.Today();

        if (requested is null)
        {
            return today;
        }

        if (requested.Value > today)
        {
            throw new BusinessRuleException(
                $"La date d'arrosage ({requested.Value:yyyy-MM-dd}) est dans le futur. " +
                "Un arrosage ne peut être enregistré qu'une fois effectué.");
        }

        return requested.Value;
    }

    private async Task EnsurePlantExistsAsync(int plantId, CancellationToken cancellationToken)
    {
        var exists = await _db.Plants
            .AsNoTracking()
            .AnyAsync(plant => plant.Id == plantId, cancellationToken);

        if (!exists)
        {
            throw NotFoundException.For("Plant", plantId);
        }
    }
}
