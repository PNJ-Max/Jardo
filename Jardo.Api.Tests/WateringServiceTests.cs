using Jardo.Api.Data;
using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Jardo.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Jardo.Api.Tests;

/// <summary>
/// Tests de WateringService : ce que le calculateur pur ne peut pas couvrir, parce que
/// cela dépend de la base — filtrage des plantes archivées, tri, écriture des arrosages.
/// </summary>
public class WateringServiceTests
{
    private static readonly DateOnly Today = new(2026, 6, 15);

    /// <summary>
    /// Construit le service avec une base neuve et une horloge figée au 15 juin 2026.
    /// </summary>
    private static (WateringService Service, GardenDbContext Db, TestDatabase Database) CreateService()
    {
        var database = new TestDatabase();

        var service = new WateringService(
            database.Context,
            new FakeTimeProvider(Today),
            // NullLogger : on ne teste pas la journalisation, mais le service en exige
            // un. C'est l'implémentation officielle « qui ne fait rien », préférable à
            // un logger simulé qu'il faudrait configurer.
            NullLogger<WateringService>.Instance);

        return (service, database.Context, database);
    }

    /// <summary>
    /// Crée une zone avec des plantes, et éventuellement un arrosage par plante.
    /// </summary>
    private static async Task<Zone> SeedZoneAsync(
        GardenDbContext db,
        string zoneName,
        params (string Name, int Interval, int? WateredDaysAgo, bool IsArchived)[] plants)
    {
        var zone = new Zone { Name = zoneName, CreatedAt = DateTimeOffset.UnixEpoch };
        db.Zones.Add(zone);
        await db.SaveChangesAsync();

        foreach (var (name, interval, wateredDaysAgo, isArchived) in plants)
        {
            var plant = new Plant
            {
                ZoneId = zone.Id,
                Name = name,
                WateringIntervalDays = interval,
                IsArchived = isArchived,
                CreatedAt = DateTimeOffset.UnixEpoch
            };

            db.Plants.Add(plant);
            await db.SaveChangesAsync();

            if (wateredDaysAgo.HasValue)
            {
                db.WateringLogs.Add(new WateringLog
                {
                    PlantId = plant.Id,
                    WateredAt = Today.AddDays(-wateredDaysAgo.Value)
                });
            }
        }

        await db.SaveChangesAsync();
        return zone;
    }

    [Fact]
    public async Task Une_plante_archivee_nest_jamais_signalee_a_arroser()
    {
        var (service, db, database) = CreateService();
        using (database)
        {
            await SeedZoneAsync(db, "Potager",
                ("Tomate", 2, 10, false),  // très en retard -> doit apparaître
                ("Radis", 1, 60, true));   // encore plus en retard, mais archivé

            var needingWater = await service.GetPlantsNeedingWaterAsync();

            // C'est la raison d'être de l'archivage : une plante de la saison passée ne
            // doit plus jamais réclamer d'eau, même si son échéance est dépassée depuis
            // des mois. Sans ce filtre, la liste se remplirait de plantes mortes.
            Assert.Single(needingWater);
            Assert.Equal("Tomate", needingWater[0].Name);
        }
    }

    [Fact]
    public async Task Les_plantes_a_arroser_sont_triees_du_plus_urgent_au_moins_urgent()
    {
        var (service, db, database) = CreateService();
        using (database)
        {
            await SeedZoneAsync(db, "Potager",
                ("Peu en retard", 2, 3, false),    // 1 jour de retard
                ("Tres en retard", 2, 20, false),  // 18 jours de retard
                ("Moyennement", 2, 7, false));     // 5 jours de retard

            var needingWater = await service.GetPlantsNeedingWaterAsync();

            // L'ordre est le contrat de l'endpoint : l'écran d'accueil affiche cette
            // liste telle quelle, sans retrier. Le tri se fait en mémoire (DaysOverdue
            // n'existe pas en base), ce test garantit qu'il est bien appliqué.
            Assert.Equal(
                new[] { "Tres en retard", "Moyennement", "Peu en retard" },
                needingWater.Select(plant => plant.Name).ToArray());
        }
    }

    [Fact]
    public async Task Une_plante_a_jour_napparait_pas_dans_la_liste()
    {
        var (service, db, database) = CreateService();
        using (database)
        {
            await SeedZoneAsync(db, "Potager",
                ("Arrosee ce matin", 3, 0, false),
                ("Echeance aujourdhui", 3, 3, false));

            var needingWater = await service.GetPlantsNeedingWaterAsync();

            // Seule celle dont l'échéance tombe aujourd'hui remonte : DueSoon compte
            // comme « à arroser », Ok non.
            Assert.Single(needingWater);
            Assert.Equal("Echeance aujourdhui", needingWater[0].Name);
            Assert.Equal(WateringStatus.DueSoon, needingWater[0].WateringStatus);
        }
    }

    [Fact]
    public async Task Un_arrosage_sans_date_est_enregistre_aujourdhui()
    {
        var (service, db, database) = CreateService();
        using (database)
        {
            await SeedZoneAsync(db, "Potager", ("Tomate", 2, null, false));
            var plantId = await db.Plants.Select(plant => plant.Id).FirstAsync();

            var log = await service.WaterPlantAsync(plantId, new CreateWateringDto());

            Assert.Equal(Today, log.WateredAt);
        }
    }

    [Fact]
    public async Task Un_arrosage_date_dans_le_futur_est_refuse()
    {
        var (service, db, database) = CreateService();
        using (database)
        {
            await SeedZoneAsync(db, "Potager", ("Tomate", 2, null, false));
            var plantId = await db.Plants.Select(plant => plant.Id).FirstAsync();

            var dto = new CreateWateringDto { WateredAt = Today.AddDays(1) };

            // Une date future repousserait l'échéance et ferait disparaître la plante de
            // la liste pendant des jours, sans explication visible.
            await Assert.ThrowsAsync<BusinessRuleException>(
                () => service.WaterPlantAsync(plantId, dto));
        }
    }

    [Fact]
    public async Task Un_arrosage_date_dans_le_passe_est_accepte()
    {
        var (service, db, database) = CreateService();
        using (database)
        {
            await SeedZoneAsync(db, "Potager", ("Tomate", 2, null, false));
            var plantId = await db.Plants.Select(plant => plant.Id).FirstAsync();

            // Cas réel : on saisit le soir un arrosage fait la veille.
            var dto = new CreateWateringDto { WateredAt = Today.AddDays(-1) };

            var log = await service.WaterPlantAsync(plantId, dto);

            Assert.Equal(Today.AddDays(-1), log.WateredAt);
        }
    }

    [Fact]
    public async Task Arroser_une_plante_archivee_est_refuse()
    {
        var (service, db, database) = CreateService();
        using (database)
        {
            await SeedZoneAsync(db, "Potager", ("Radis", 1, null, true));
            var plantId = await db.Plants.Select(plant => plant.Id).FirstAsync();

            await Assert.ThrowsAsync<BusinessRuleException>(
                () => service.WaterPlantAsync(plantId, new CreateWateringDto()));
        }
    }

    [Fact]
    public async Task Arroser_une_plante_inexistante_leve_NotFound()
    {
        var (service, _, database) = CreateService();
        using (database)
        {
            await Assert.ThrowsAsync<NotFoundException>(
                () => service.WaterPlantAsync(9999, new CreateWateringDto()));
        }
    }

    [Fact]
    public async Task Arroser_une_zone_cree_un_enregistrement_par_plante_active()
    {
        var (service, db, database) = CreateService();
        using (database)
        {
            var zone = await SeedZoneAsync(db, "Serre",
                ("Concombre", 2, null, false),
                ("Aubergine", 3, null, false),
                ("Melon fini", 2, null, true));   // archivé : doit être ignoré

            var result = await service.WaterZoneAsync(zone.Id, new CreateWateringDto());

            Assert.Equal(2, result.PlantsWatered);
            Assert.Equal("Serre", result.ZoneName);

            // Vérification côté base : c'est bien un enregistrement par plante, et non
            // un enregistrement « de zone ». C'est ce qui permet à chaque plante de
            // garder son propre historique, même si elle change de zone plus tard.
            var logs = await db.WateringLogs.ToListAsync();
            Assert.Equal(2, logs.Count);
            Assert.All(logs, log => Assert.Equal(Today, log.WateredAt));
        }
    }

    [Fact]
    public async Task Arroser_une_zone_fait_disparaitre_ses_plantes_de_la_liste()
    {
        var (service, db, database) = CreateService();
        using (database)
        {
            var zone = await SeedZoneAsync(db, "Serre",
                ("Concombre", 2, 10, false),
                ("Aubergine", 3, 15, false));

            // Les deux sont très en retard avant l'arrosage.
            Assert.Equal(2, (await service.GetPlantsNeedingWaterAsync()).Count);

            await service.WaterZoneAsync(zone.Id, new CreateWateringDto());

            // Et plus aucune après : c'est le bout-en-bout de la logique métier.
            Assert.Empty(await service.GetPlantsNeedingWaterAsync());
        }
    }

    [Fact]
    public async Task Lhistorique_dune_plante_est_rendu_du_plus_recent_au_plus_ancien()
    {
        var (service, db, database) = CreateService();
        using (database)
        {
            await SeedZoneAsync(db, "Potager", ("Tomate", 2, null, false));
            var plantId = await db.Plants.Select(plant => plant.Id).FirstAsync();

            await service.WaterPlantAsync(plantId, new CreateWateringDto { WateredAt = Today.AddDays(-5) });
            await service.WaterPlantAsync(plantId, new CreateWateringDto { WateredAt = Today.AddDays(-1) });
            await service.WaterPlantAsync(plantId, new CreateWateringDto { WateredAt = Today.AddDays(-3) });

            var history = await service.GetHistoryAsync(plantId);

            Assert.Equal(
                new[] { Today.AddDays(-1), Today.AddDays(-3), Today.AddDays(-5) },
                history.Select(log => log.WateredAt).ToArray());
        }
    }
}
