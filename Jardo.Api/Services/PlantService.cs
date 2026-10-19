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
        int? spaceId = null,
        int? zoneId = null,
        bool includeArchived = false,
        CancellationToken cancellationToken = default)
    {
        var today = _timeProvider.Today();

        var query = _db.Plants.AsNoTracking().AsQueryable();

        if (spaceId.HasValue)
        {
            query = query.Where(plant => plant.SpaceId == spaceId.Value);
        }

        if (zoneId.HasValue)
        {
            query = query.Where(plant => plant.ZoneId == zoneId.Value);
        }

        if (!includeArchived)
        {
            query = query.Where(plant => !plant.IsArchived && !plant.Space.IsArchived);
        }

        var rows = await query
            .OrderBy(plant => plant.Space.Name)
            .ThenBy(plant => plant.Zone!.Name)
            .ThenBy(plant => plant.Name)
            .SelectWithNames()
            .ToListAsync(cancellationToken);

        var waterings = await LatestInterventions.LoadAsync(_db.JournalEntries, JournalEntryKind.Watering, cancellationToken);

        return rows.Select(row => row.ToDto(waterings, today)).ToList();
    }

    public async Task<PlantResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var today = _timeProvider.Today();

        var row = await _db.Plants
            .AsNoTracking()
            .Where(plant => plant.Id == id)
            .SelectWithNames()
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw NotFoundException.For("Plant", id);

        var waterings = await LatestInterventions.LoadAsync(
            _db.JournalEntries.Where(entry => entry.SpaceId == row.Plant.SpaceId),
            JournalEntryKind.Watering,
            cancellationToken);

        return row.ToDto(waterings, today);
    }

    public async Task<PlantResponseDto> CreateAsync(SavePlantDto dto, CancellationToken cancellationToken = default)
    {
        await EnsurePlacementIsValidAsync(dto.SpaceId, dto.ZoneId, isNewToSpace: true, cancellationToken);

        var plant = new Plant
        {
            SpaceId = dto.SpaceId,
            ZoneId = dto.ZoneId,
            IsArchived = false,
            CreatedAt = _timeProvider.GetUtcNow()
        };

        Apply(dto, plant);

        _db.Plants.Add(plant);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(plant.Id, cancellationToken);
    }

    public async Task<PlantResponseDto> UpdateAsync(int id, SavePlantDto dto, CancellationToken cancellationToken = default)
    {
        var plant = await _db.Plants.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("Plant", id);

        await EnsurePlacementIsValidAsync(
            dto.SpaceId,
            dto.ZoneId,
            isNewToSpace: dto.SpaceId != plant.SpaceId,
            cancellationToken);

        Apply(dto, plant);

        if (plant.SpaceId != dto.SpaceId || plant.ZoneId != dto.ZoneId)
        {
            // Le journal d'un élément le suit : ses entrées restent dans son espace et sa zone, ce
            // qui permet de supprimer sans perte un espace ou une zone vidés de leurs éléments.
            var entries = await _db.JournalEntries
                .Where(entry => entry.ItemId == id)
                .ToListAsync(cancellationToken);

            foreach (var entry in entries)
            {
                entry.SpaceId = dto.SpaceId;
                entry.ZoneId = dto.ZoneId;
            }
        }

        plant.SpaceId = dto.SpaceId;
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

        // Ses entrées de journal partent avec la plante, par la cascade de GardenDbContext.
        _db.Plants.Remove(plant);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static void Apply(SavePlantDto dto, Plant plant)
    {
        if (!dto.QuantityUnit.Accepts(dto.Quantity))
        {
            throw new BusinessRuleException(
                $"La quantité {dto.Quantity} ne convient pas : elle doit être positive, " +
                "et un nombre de pieds est entier.");
        }

        plant.Name = Text.Required(dto.Name, "Nom");
        plant.Species = Text.Optional(dto.Species);
        plant.Variety = Text.Optional(dto.Variety);
        plant.Quantity = dto.Quantity;
        plant.QuantityUnit = dto.QuantityUnit;
        plant.SownDate = dto.SownDate;
        plant.PlantedDate = dto.PlantedDate;
        plant.WateringIntervalDays = dto.WateringIntervalDays;
    }

    // 400 et non 404 : la ressource demandée est la plante, ce sont les identifiants du corps qui
    // sont invalides. Un espace archivé garde ses plantes mais n'en reçoit plus de nouvelles.
    private async Task EnsurePlacementIsValidAsync(
        int spaceId,
        int? zoneId,
        bool isNewToSpace,
        CancellationToken cancellationToken)
    {
        var space = await _db.Spaces
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == spaceId, cancellationToken)
            ?? throw new BusinessRuleException($"L'espace {spaceId} n'existe pas.");

        if (!space.Kind.AcceptsPlants())
        {
            throw new BusinessRuleException(
                $"L'espace « {space.Name} » est un espace {space.Kind.Label()} : il n'accueille pas de plantes.");
        }

        if (isNewToSpace && space.IsArchived)
        {
            throw new BusinessRuleException(
                $"L'espace « {space.Name} » est archivé : réactivez-le avant d'y ajouter une plante.");
        }

        if (zoneId is null)
        {
            return;
        }

        var zoneSpaceId = await _db.Zones
            .AsNoTracking()
            .Where(zone => zone.Id == zoneId.Value)
            .Select(zone => (int?)zone.SpaceId)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new BusinessRuleException($"La zone {zoneId} n'existe pas.");

        if (zoneSpaceId != spaceId)
        {
            throw new BusinessRuleException(
                $"La zone {zoneId} n'appartient pas à l'espace « {space.Name} ».");
        }
    }
}
