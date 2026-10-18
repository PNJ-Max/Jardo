using Jardo.Api.Dtos;
using Jardo.Api.Models;

namespace Jardo.Api.Services;

/// <summary>
/// Une plante avec le nom de son espace et de sa zone, et la date de son dernier arrosage
/// (null si jamais arrosée).
/// </summary>
public record PlantWithWatering(Plant Plant, string SpaceName, string? ZoneName, DateOnly? LastWateredAt);

/// <summary>
/// Requêtes composables partagées par PlantService et WateringService ; extensions d'IQueryable,
/// donc une seule instruction SQL au ToListAsync final.
/// </summary>
public static class PlantQueries
{
    public static IQueryable<PlantWithWatering> SelectWithWatering(this IQueryable<Plant> query)
        => query.Select(plant => new PlantWithWatering(
            plant,
            plant.Space.Name,
            plant.Zone == null ? null : plant.Zone.Name,
            // Le cast en DateOnly? évite l'échec de Max sur une plante sans arrosage.
            plant.WateringLogs.Max(log => (DateOnly?)log.WateredAt)));

    public static PlantResponseDto ToDto(this PlantWithWatering row, DateOnly today)
    {
        var state = WateringCalculator.Calculate(
            row.Plant.WateringIntervalDays,
            row.LastWateredAt,
            row.Plant.PlantedDate,
            today);

        return PlantResponseDto.FromEntity(row.Plant, state, row.SpaceName, row.ZoneName);
    }
}
