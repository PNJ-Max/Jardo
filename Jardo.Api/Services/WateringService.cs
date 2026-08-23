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
            .Where(plant => !plant.IsArchived)
            .SelectWithWatering()
            .ToListAsync(cancellationToken);

        // Le filtrage et le tri se font en mémoire, et c'est inévitable : l'état
        // d'arrosage n'existe pas en base, il est calculé. Aucune clause WHERE SQL ne
        // peut porter sur « DaysOverdue ».
        //
        // Ce serait un problème d'échelle sur des centaines de milliers de lignes — il
        // faudrait alors stocker l'échéance et la recalculer à l'écriture. Sur un potager
        // de quelques dizaines de plantes, c'est parfaitement adapté, et ça évite d'avoir
        // à maintenir une colonne dérivée cohérente.
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

        // On ne charge que les identifiants : créer un WateringLog ne demande rien d'autre
        // de la plante, et rapatrier les entités complètes serait du gaspillage.
        var plantIds = await _db.Plants
            .AsNoTracking()
            .Where(plant => plant.ZoneId == zoneId && !plant.IsArchived)
            .Select(plant => plant.Id)
            .ToListAsync(cancellationToken);

        // Un enregistrement par plante, et non un enregistrement « de zone ».
        //
        // C'est la décision structurante de cette méthode : l'historique reste attaché à
        // la plante, seul niveau où le calcul d'échéance a un sens. Conséquence agréable —
        // une plante déplacée vers une autre zone emporte son historique avec elle.
        var logs = plantIds
            .Select(plantId => new WateringLog
            {
                PlantId = plantId,
                WateredAt = wateredAt,
                Note = note
            })
            .ToList();

        _db.WateringLogs.AddRange(logs);

        // Un seul SaveChangesAsync pour toutes les lignes : EF Core les regroupe dans une
        // seule transaction. Soit toute la zone est arrosée, soit rien ne l'est — on ne
        // peut pas se retrouver avec la moitié des plantes enregistrées.
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

    /// <summary>
    /// Détermine la date d'arrosage à enregistrer, et refuse le futur.
    /// </summary>
    /// <remarks>
    /// Une date d'arrosage dans le futur n'est pas un cas d'usage, c'est une faute de
    /// saisie — et elle est nuisible : elle repousserait l'échéance et ferait disparaître
    /// la plante de la liste des plantes à arroser pendant des jours, sans qu'on comprenne
    /// pourquoi. Mieux vaut refuser franchement.
    ///
    /// Le passé, lui, est autorisé : on saisit souvent le soir un arrosage fait le matin,
    /// ou on rattrape une saisie oubliée de la veille.
    /// </remarks>
    private DateOnly ResolveWateringDate(DateOnly? requested)
    {
        var today = _timeProvider.Today();

        // Rien de fourni : c'est le cas normal, « je viens d'arroser ».
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
