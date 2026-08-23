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
        int? zoneId = null,
        bool includeArchived = false,
        CancellationToken cancellationToken = default)
    {
        var today = _timeProvider.Today();

        // AsQueryable() est nécessaire, et pas décoratif : sans lui, "query" serait typé
        // DbSet<Plant> et la réaffectation query = query.Where(...) ne compilerait pas.
        //
        // Tant qu'on n'a pas appelé ToListAsync, rien n'est parti vers la base : on
        // assemble une requête. Les filtres ci-dessous finiront donc dans la clause WHERE
        // du SQL, et non appliqués en mémoire sur une liste déjà chargée — ce qui serait
        // le cas si on avait matérialisé trop tôt.
        var query = _db.Plants.AsNoTracking().AsQueryable();

        if (zoneId.HasValue)
        {
            query = query.Where(plant => plant.ZoneId == zoneId.Value);
        }

        if (!includeArchived)
        {
            query = query.Where(plant => !plant.IsArchived);
        }

        var rows = await query
            .OrderBy(plant => plant.Zone.Name)
            .ThenBy(plant => plant.Name)
            .SelectWithWatering()
            .ToListAsync(cancellationToken);

        return rows.Select(row => row.ToDto(today)).ToList();
    }

    public async Task<PlantResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var today = _timeProvider.Today();

        var row = await _db.Plants
            .AsNoTracking()
            .Where(plant => plant.Id == id)
            .SelectWithWatering()
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw NotFoundException.For("Plant", id);

        return row.ToDto(today);
    }

    public async Task<PlantResponseDto> CreateAsync(CreatePlantDto dto, CancellationToken cancellationToken = default)
    {
        // On récupère la zone plutôt que de tester seulement son existence : son nom est
        // nécessaire pour construire la réponse. Autant une seule requête que deux.
        var zoneName = await GetZoneNameOrThrowAsync(dto.ZoneId, cancellationToken);

        var plant = new Plant
        {
            Name = Text.Required(dto.Name, "Nom"),
            Species = Text.Optional(dto.Species),
            PlantedDate = dto.PlantedDate,
            WateringIntervalDays = dto.WateringIntervalDays,
            ZoneId = dto.ZoneId,
            IsArchived = false,
            CreatedAt = _timeProvider.GetUtcNow()
        };

        _db.Plants.Add(plant);
        await _db.SaveChangesAsync(cancellationToken);

        // Plante neuve : aucun arrosage enregistré, d'où le null. Le calculateur partira
        // donc de la date de plantation, ou d'aujourd'hui si elle n'est pas renseignée.
        var state = WateringCalculator.Calculate(
            plant.WateringIntervalDays,
            lastWateredAt: null,
            plant.PlantedDate,
            _timeProvider.Today());

        return PlantResponseDto.FromEntity(plant, state, zoneName);
    }

    public async Task<PlantResponseDto> UpdateAsync(int id, UpdatePlantDto dto, CancellationToken cancellationToken = default)
    {
        var plant = await _db.Plants.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("Plant", id);

        // La zone cible peut différer de l'actuelle : modifier une plante permet de la
        // déplacer. Il faut donc revalider l'existence de la zone à chaque modification,
        // et non seulement à la création.
        await GetZoneNameOrThrowAsync(dto.ZoneId, cancellationToken);

        plant.Name = Text.Required(dto.Name, "Nom");
        plant.Species = Text.Optional(dto.Species);
        plant.PlantedDate = dto.PlantedDate;
        plant.WateringIntervalDays = dto.WateringIntervalDays;
        plant.ZoneId = dto.ZoneId;

        await _db.SaveChangesAsync(cancellationToken);

        // Relecture pour renvoyer l'état complet et à jour (nom de la nouvelle zone,
        // échéance recalculée avec le nouvel intervalle). Un aller-retour de plus, mais
        // la réponse est ainsi garantie cohérente avec ce qui est réellement en base.
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

        // Les arrosages et observations partent avec la plante, par la cascade déclarée
        // dans GardenDbContext. C'est voulu ici : un historique rattaché à une plante qui
        // n'existe plus n'a aucun usage. C'est aussi pourquoi l'archivage existe, et
        // pourquoi c'est lui qu'il faut préférer.
        _db.Plants.Remove(plant);
        await _db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Vérifie qu'une zone existe et renvoie son nom.
    /// </summary>
    /// <remarks>
    /// BusinessRuleException (400) et non NotFoundException (404) : la ressource demandée
    /// est la plante, pas la zone. Un 404 signifierait « l'URL que tu appelles ne
    /// correspond à rien », alors que le problème réel est « le ZoneId que tu as envoyé
    /// dans le corps est invalide ». C'est une erreur de contenu de requête, donc un 400.
    /// </remarks>
    private async Task<string> GetZoneNameOrThrowAsync(int zoneId, CancellationToken cancellationToken)
    {
        // On ne sélectionne que le nom : inutile de rapatrier toute l'entité Zone
        // (description, dates) pour une seule chaîne.
        var zoneName = await _db.Zones
            .AsNoTracking()
            .Where(zone => zone.Id == zoneId)
            .Select(zone => zone.Name)
            .FirstOrDefaultAsync(cancellationToken);

        if (zoneName is null)
        {
            throw new BusinessRuleException($"La zone {zoneId} n'existe pas.");
        }

        return zoneName;
    }
}
