using Jardo.Api.Data;
using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Services;

/// <inheritdoc cref="IObservationService"/>
public class ObservationService : IObservationService
{
    private readonly GardenDbContext _db;
    private readonly TimeProvider _timeProvider;

    public ObservationService(GardenDbContext db, TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    public async Task<List<ObservationResponseDto>> GetByPlantAsync(int plantId, CancellationToken cancellationToken = default)
    {
        await EnsurePlantExistsAsync(plantId, cancellationToken);

        var observations = await _db.Observations
            .AsNoTracking()
            .Where(observation => observation.PlantId == plantId)
            // Deux critères de tri, et le second compte : plusieurs observations peuvent
            // porter la même date. Sans le tri secondaire sur l'Id, leur ordre serait
            // laissé au bon vouloir de SQLite et pourrait changer d'un appel à l'autre.
            // Un ordre instable dans une liste affichée est déroutant à l'usage.
            .OrderByDescending(observation => observation.ObservedAt)
            .ThenByDescending(observation => observation.Id)
            .ToListAsync(cancellationToken);

        return observations.Select(ObservationResponseDto.FromEntity).ToList();
    }

    public async Task<ObservationResponseDto> CreateAsync(
        int plantId,
        CreateObservationDto dto,
        CancellationToken cancellationToken = default)
    {
        await EnsurePlantExistsAsync(plantId, cancellationToken);

        var today = _timeProvider.Today();
        var observedAt = dto.ObservedAt ?? today;

        // Même raisonnement que pour l'arrosage : on n'observe pas dans le futur.
        if (observedAt > today)
        {
            throw new BusinessRuleException(
                $"La date d'observation ({observedAt:yyyy-MM-dd}) est dans le futur.");
        }

        var observation = new Observation
        {
            PlantId = plantId,
            ObservedAt = observedAt,
            Note = Text.Required(dto.Note, "Note"),
            HeightCm = dto.HeightCm,
            ProblemNote = Text.Optional(dto.ProblemNote),
            Treatment = Text.Optional(dto.Treatment)
        };

        _db.Observations.Add(observation);
        await _db.SaveChangesAsync(cancellationToken);

        return ObservationResponseDto.FromEntity(observation);
    }

    public async Task DeleteAsync(int observationId, CancellationToken cancellationToken = default)
    {
        var observation = await _db.Observations
            .FirstOrDefaultAsync(candidate => candidate.Id == observationId, cancellationToken)
            ?? throw NotFoundException.For("Observation", observationId);

        _db.Observations.Remove(observation);
        await _db.SaveChangesAsync(cancellationToken);
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
