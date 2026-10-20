using Jardo.Api.Data;
using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Services;

/// <inheritdoc cref="IPlantService"/>
public class PlantService : IPlantService
{
    private static readonly ItemPlacement.Noun PlantNoun = new("de plantes", "une plante");

    private readonly GardenDbContext _db;
    private readonly TimeProvider _timeProvider;

    public PlantService(GardenDbContext db, TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    private static IQueryable<PlantResponseDto> Project(IQueryable<Plant> plants)
        => plants.Select(plant => new PlantResponseDto
        {
            Id = plant.Id,
            Name = plant.Name,
            Species = plant.Species,
            Variety = plant.Variety,
            Quantity = plant.Quantity,
            QuantityUnit = plant.QuantityUnit,
            SownDate = plant.SownDate,
            PlantedDate = plant.PlantedDate,
            IsArchived = plant.IsArchived,
            CreatedAt = plant.CreatedAt,
            SpaceId = plant.SpaceId,
            SpaceName = plant.Space.Name,
            ZoneId = plant.ZoneId,
            ZoneName = plant.Zone == null ? null : plant.Zone.Name
        });

    public async Task<List<PlantResponseDto>> GetAllAsync(
        int? spaceId = null,
        int? zoneId = null,
        bool includeArchived = false,
        CancellationToken cancellationToken = default)
    {
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

        var ordered = query
            .OrderBy(plant => plant.Space.Name)
            .ThenBy(plant => plant.Zone!.Name)
            .ThenBy(plant => plant.Name);

        return await Project(ordered).ToListAsync(cancellationToken);
    }

    public async Task<PlantResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
        => await Project(_db.Plants.AsNoTracking().Where(plant => plant.Id == id))
               .FirstOrDefaultAsync(cancellationToken)
           ?? throw NotFoundException.For("Plant", id);

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
            await ItemPlacement.MoveHistoryAsync(_db, id, dto.SpaceId, dto.ZoneId, cancellationToken);
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

        // Ses entrées de journal et ses tâches partent avec la plante, par la cascade de GardenDbContext.
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
    }

    private Task EnsurePlacementIsValidAsync(
        int spaceId,
        int? zoneId,
        bool isNewToSpace,
        CancellationToken cancellationToken)
        => ItemPlacement.EnsureValidAsync(
            _db, spaceId, zoneId, isNewToSpace, kind => kind.AcceptsPlants(), PlantNoun, cancellationToken);
}
