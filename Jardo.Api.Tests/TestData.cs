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
        bool isArchived = false)
    {
        var plant = new Plant
        {
            SpaceId = space.Id,
            ZoneId = zone?.Id,
            Name = name,
            IsArchived = isArchived,
            CreatedAt = DateTimeOffset.UnixEpoch
        };

        db.Plants.Add(plant);
        await db.SaveChangesAsync();
        return plant;
    }

    /// <summary>Une entrée sur l'élément si donné, sinon sur la zone, sinon sur tout l'espace.</summary>
    public static async Task<JournalEntry> AddEntryAsync(
        this GardenDbContext db,
        JournalEntryKind kind,
        DateOnly date,
        Space space,
        Zone? zone = null,
        GardenItem? item = null)
    {
        var entry = new JournalEntry
        {
            Kind = kind,
            Date = date,
            SpaceId = space.Id,
            ZoneId = item is null ? zone?.Id : item.ZoneId,
            ItemId = item?.Id,
            CreatedAt = DateTimeOffset.UnixEpoch
        };

        db.JournalEntries.Add(entry);
        await db.SaveChangesAsync();
        return entry;
    }

    /// <summary>Une tâche sur l'élément si donné, sinon sur la zone, sinon sur tout l'espace.</summary>
    public static async Task<GardenTask> AddTaskAsync(
        this GardenDbContext db,
        JournalEntryKind kind,
        TaskRecurrence recurrence,
        DateOnly startDate,
        Space space,
        Zone? zone = null,
        GardenItem? item = null,
        int? intervalDays = null,
        string? title = null,
        DateTimeOffset? createdAt = null)
    {
        var task = new GardenTask
        {
            Kind = kind,
            Recurrence = recurrence,
            StartDate = startDate,
            IntervalDays = intervalDays,
            Title = title,
            SpaceId = space.Id,
            ZoneId = item is null ? zone?.Id : item.ZoneId,
            ItemId = item?.Id,
            CreatedAt = createdAt ?? DateTimeOffset.UnixEpoch
        };

        db.GardenTasks.Add(task);
        await db.SaveChangesAsync();
        return task;
    }

    public static async Task<WoodPile> AddWoodPileAsync(
        this GardenDbContext db,
        Space space,
        string name,
        double initialSteres = 10,
        DateOnly? cutDate = null,
        int dryingMonths = 12,
        bool isArchived = false)
    {
        var pile = new WoodPile
        {
            SpaceId = space.Id,
            Name = name,
            InitialSteres = initialSteres,
            CutDate = cutDate ?? new DateOnly(2025, 1, 1),
            DryingMonths = dryingMonths,
            IsArchived = isArchived,
            CreatedAt = DateTimeOffset.UnixEpoch
        };

        db.WoodPiles.Add(pile);
        await db.SaveChangesAsync();
        return pile;
    }
}
