using Jardo.Api.Data;
using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Services;

/// <inheritdoc cref="IZoneService"/>
public class ZoneService : IZoneService
{
    private readonly GardenDbContext _db;
    private readonly TimeProvider _timeProvider;

    public ZoneService(GardenDbContext db, TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    /// <summary>
    /// Forme intermédiaire : une zone et le minimum d'informations nécessaires pour
    /// compter ses plantes à arroser, sans charger les entités Plant complètes.
    /// </summary>
    private record ZoneWithPlants(Zone Zone, List<PlantWateringInfo> ActivePlants);

    private record PlantWateringInfo(int WateringIntervalDays, DateOnly? PlantedDate, DateOnly? LastWateredAt);

    /// <summary>
    /// Construit la requête de lecture des zones avec les données d'arrosage de leurs plantes.
    /// </summary>
    /// <remarks>
    /// Un seul aller-retour vers la base, malgré les trois niveaux (zone, plantes,
    /// arrosages). EF Core traduit la sous-collection en une requête unique. C'est
    /// exactement le problème « N+1 » qu'on évite ici : la version naïve — charger les
    /// zones, puis pour chacune ses plantes, puis pour chacune ses arrosages — ferait
    /// des dizaines de requêtes pour afficher une simple liste.
    ///
    /// AsNoTracking() parce que ces données ne seront jamais modifiées : elles partent en
    /// JSON et sont oubliées. Sans lui, EF Core garderait chaque entité en mémoire avec
    /// une copie de son état d'origine, pour pouvoir détecter des modifications qui
    /// n'arriveront jamais.
    ///
    /// La méthode prend la requête source en paramètre au lieu de partir de _db.Zones,
    /// et c'est important : cela oblige l'appelant à filtrer et trier AVANT la projection.
    ///
    /// L'ordre n'est pas cosmétique, il conditionne la traduction en SQL. Écrire
    /// .Select(...).OrderBy(row => row.Zone.Name) échoue à l'exécution avec
    /// « The LINQ expression could not be translated » : une fois la projection faite,
    /// EF Core manipule un objet composite contenant une sous-collection, et il ne sait
    /// plus rattacher « row.Zone.Name » à une colonne. En triant d'abord sur l'entité
    /// Zone, la clause ORDER BY porte sur une vraie colonne et tout se traduit.
    ///
    /// Règle à retenir : filtrer et trier sur les entités, projeter en dernier.
    /// </remarks>
    private static IQueryable<ZoneWithPlants> Project(IQueryable<Zone> zones)
        => zones
            .Select(zone => new ZoneWithPlants(
                zone,
                zone.Plants
                    .Where(plant => !plant.IsArchived)
                    .Select(plant => new PlantWateringInfo(
                        plant.WateringIntervalDays,
                        plant.PlantedDate,
                        plant.WateringLogs.Max(log => (DateOnly?)log.WateredAt)))
                    .ToList()));

    /// <summary>
    /// Compte les plantes dont l'arrosage est dû ou en retard.
    /// </summary>
    private int CountNeedingWater(List<PlantWateringInfo> plants, DateOnly today)
        => plants.Count(plant => WateringCalculator.Calculate(
            plant.WateringIntervalDays,
            plant.LastWateredAt,
            plant.PlantedDate,
            today).Status != WateringStatus.Ok);

    private ZoneResponseDto ToDto(ZoneWithPlants row, DateOnly today)
        => ZoneResponseDto.FromEntity(
            row.Zone,
            plantCount: row.ActivePlants.Count,
            plantsNeedingWater: CountNeedingWater(row.ActivePlants, today));

    public async Task<List<ZoneResponseDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var today = _timeProvider.Today();

        // Le tri est appliqué sur l'entité Zone, avant la projection : voir le
        // commentaire de Project() pour la raison.
        var source = _db.Zones
            .AsNoTracking()
            .OrderBy(zone => zone.Name);

        var rows = await Project(source).ToListAsync(cancellationToken);

        return rows.Select(row => ToDto(row, today)).ToList();
    }

    public async Task<ZoneResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var today = _timeProvider.Today();

        var source = _db.Zones
            .AsNoTracking()
            .Where(zone => zone.Id == id);

        var row = await Project(source).FirstOrDefaultAsync(cancellationToken)
            ?? throw NotFoundException.For("Zone", id);

        return ToDto(row, today);
    }

    public async Task<ZoneResponseDto> CreateAsync(CreateZoneDto dto, CancellationToken cancellationToken = default)
    {
        var name = Text.Required(dto.Name, "Nom");

        await EnsureNameIsAvailableAsync(name, excludingZoneId: null, cancellationToken);

        var zone = new Zone
        {
            Name = name,
            Description = Text.Optional(dto.Description),
            CreatedAt = _timeProvider.GetUtcNow()
        };

        _db.Zones.Add(zone);
        await _db.SaveChangesAsync(cancellationToken);

        // Zone toute neuve : aucune plante, donc aucun compteur à calculer.
        return ZoneResponseDto.FromEntity(zone, plantCount: 0, plantsNeedingWater: 0);
    }

    public async Task<ZoneResponseDto> UpdateAsync(int id, UpdateZoneDto dto, CancellationToken cancellationToken = default)
    {
        var name = Text.Required(dto.Name, "Nom");

        // Pas d'AsNoTracking ici, au contraire de la lecture : on veut justement que
        // EF Core suive cette entité, pour qu'il détecte les propriétés modifiées et
        // génère l'UPDATE correspondant au SaveChangesAsync.
        var zone = await _db.Zones.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("Zone", id);

        await EnsureNameIsAvailableAsync(name, excludingZoneId: id, cancellationToken);

        zone.Name = name;
        zone.Description = Text.Optional(dto.Description);

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var zone = await _db.Zones.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("Zone", id);

        // La règle métier qui protège des suppressions catastrophiques.
        //
        // En base, la relation Zone -> Plant est en cascade : supprimer la zone
        // supprimerait toutes ses plantes, et avec elles tout leur historique
        // d'arrosages et d'observations, sans un mot. On refuse donc au niveau du
        // service, avec un message qui dit quoi faire.
        //
        // La cascade reste en place comme filet de sécurité du moteur (elle garantit
        // qu'aucune plante orpheline ne peut exister), mais elle n'est plus le
        // comportement que l'utilisateur peut déclencher par accident.
        // On compte TOUTES les plantes, archivées comprises : ce sont elles qui seraient
        // détruites par la cascade, et une plante archivée reste un historique de saison
        // qu'on ne veut pas perdre.
        //
        // Le détail des archivées est mentionné séparément dans le message, sinon
        // l'utilisateur verrait « 5 plantes » dans la liste des zones (qui, elle, ne
        // compte que les actives) et « 6 plantes » dans l'erreur, sans comprendre l'écart.
        var activeCount = await _db.Plants
            .CountAsync(plant => plant.ZoneId == id && !plant.IsArchived, cancellationToken);

        var archivedCount = await _db.Plants
            .CountAsync(plant => plant.ZoneId == id && plant.IsArchived, cancellationToken);

        if (activeCount + archivedCount > 0)
        {
            var detail = archivedCount > 0
                ? $"{activeCount} plante(s) active(s) et {archivedCount} archivée(s)"
                : $"{activeCount} plante(s)";

            throw new BusinessRuleException(
                $"La zone « {zone.Name} » contient encore {detail}. " +
                "Déplacez-les ou supprimez-les avant de supprimer la zone.");
        }

        _db.Zones.Remove(zone);
        await _db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Vérifie qu'aucune autre zone ne porte déjà ce nom.
    /// </summary>
    /// <param name="excludingZoneId">
    /// Zone à ignorer dans la recherche. Indispensable en modification : sans cela, une
    /// zone se heurterait à son propre nom dès qu'on modifie uniquement sa description.
    /// </param>
    /// <remarks>
    /// La base porte déjà un index unique sur le nom : ce contrôle ne le remplace pas, il
    /// le double pour produire un message compréhensible. Sans lui, l'utilisateur
    /// recevrait une erreur SQLite brute de violation de contrainte.
    ///
    /// Honnêteté sur la limite : entre ce contrôle et l'enregistrement, une autre requête
    /// pourrait insérer le même nom. C'est l'index unique de la base qui reste le garant
    /// final — et c'est bien pour cela qu'on garde les deux.
    /// </remarks>
    private async Task EnsureNameIsAvailableAsync(string name, int? excludingZoneId, CancellationToken cancellationToken)
    {
        var query = _db.Zones
            .AsNoTracking()
            .Where(zone => zone.Name == name);

        // Le filtre d'exclusion est ajouté conditionnellement, et surtout avec
        // excludingZoneId.Value — pas avec le int? directement.
        //
        // Le piège, qui vaut d'être connu une fois pour toutes : écrire
        //     .Where(zone => zone.Id != excludingZoneId)
        // se compile sans broncher, mais quand excludingZoneId vaut null, EF Core le
        // traduit par « Id <> NULL » en SQL. Or en SQL, toute comparaison avec NULL vaut
        // NULL, jamais vrai. La condition serait donc toujours fausse, et ce contrôle
        // d'unicité ne trouverait JAMAIS de doublon à la création.
        //
        // C'est la différence entre la sémantique C# (où 5 != null est vrai) et la
        // logique ternaire de SQL. Composer la requête en deux temps supprime le
        // problème plutôt que d'avoir à s'en souvenir.
        if (excludingZoneId.HasValue)
        {
            query = query.Where(zone => zone.Id != excludingZoneId.Value);
        }

        if (await query.AnyAsync(cancellationToken))
        {
            throw new BusinessRuleException($"Une zone nommée « {name} » existe déjà.");
        }
    }
}
