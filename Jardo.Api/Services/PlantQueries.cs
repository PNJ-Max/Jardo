using Jardo.Api.Dtos;
using Jardo.Api.Models;

namespace Jardo.Api.Services;

/// <summary>Une plante avec le nom de son espace et de sa zone.</summary>
public record PlantRow(Plant Plant, string SpaceName, string? ZoneName);

/// <summary>Requêtes et projections partagées par PlantService et WateringService.</summary>
public static class PlantQueries
{
    public static IQueryable<PlantRow> SelectWithNames(this IQueryable<Plant> query)
        => query.Select(plant => new PlantRow(
            plant,
            plant.Space.Name,
            plant.Zone == null ? null : plant.Zone.Name));

    public static PlantResponseDto ToDto(this PlantRow row, LatestInterventions waterings, DateOnly today)
    {
        var plant = row.Plant;

        var state = WateringCalculator.Calculate(
            plant.WateringIntervalDays,
            waterings.ForItem(plant.Id, plant.SpaceId, plant.ZoneId),
            plant.PlantedDate,
            today);

        return PlantResponseDto.FromEntity(plant, state, row.SpaceName, row.ZoneName);
    }
}
