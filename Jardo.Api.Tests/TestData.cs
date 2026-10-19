using Jardo.Api.Data;
using Jardo.Api.Models;

namespace Jardo.Api.Tests;

/// <summary>
/// Insertions directes en base pour préparer un test, sans passer par les règles des services.
/// Le jardin unique existe déjà : la migration le crée.
/// </summary>
public static class TestData
{
    public static async Task<Space> AddSpaceAsync(
        this GardenDbContext db,
        string name,
        SpaceKind kind = SpaceKind.VegetableGarden,
        bool isArchived = false)
    {
        var space = new Space
        {
            GardenId = Garden.DefaultId,
            Name = name,
            Kind = kind,
            IsArchived = isArchived,
            CreatedAt = DateTimeOffset.UnixEpoch
        };

        db.Spaces.Add(space);
        await db.SaveChangesAsync();
        return space;
    }

    public static async Task<Zone> AddZoneAsync(this GardenDbContext db, Space space, string name)
    {
        var zone = new Zone { SpaceId = space.Id, Name = name, CreatedAt = DateTimeOffset.UnixEpoch };

        db.Zones.Add(zone);
        await db.SaveChangesAsync();
        return zone;
    }

    public static async Task<Plant> AddPlantAsync(
        this GardenDbContext db,
        Space space,
        Zone? zone,
        string name,
        int wateringIntervalDays = 3,
        bool isArchived = false)
    {
        var plant = new Plant
        {
            SpaceId = space.Id,
            ZoneId = zone?.Id,
            Name = name,
            WateringIntervalDays = wateringIntervalDays,
            IsArchived = isArchived,
            CreatedAt = DateTimeOffset.UnixEpoch
        };

        db.Plants.Add(plant);
        await db.SaveChangesAsync();
        return plant;
    }
}
