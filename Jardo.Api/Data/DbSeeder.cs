using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Data;

/// <summary>
/// Remplit la base avec un jardin d'exemple : un potager en carrés, un verger, des petits fruits
/// par rang et un espace bois de chauffage, encore vide. Les dates sont relatives à aujourd'hui
/// pour qu'il y ait toujours des plantes en retard d'arrosage.
/// </summary>
public static class DbSeeder
{
    public static async Task SeedAsync(GardenDbContext db, TimeProvider timeProvider, CancellationToken cancellationToken = default)
    {
        if (await db.Spaces.AnyAsync(cancellationToken))
        {
            return;
        }

        var today = timeProvider.Today();
        var now = timeProvider.GetUtcNow();

        DateOnly Ago(int days) => today.AddDays(-days);

        var garden = await db.Gardens.SingleAsync(candidate => candidate.Id == Garden.DefaultId, cancellationToken);
        garden.Name = "Jardin des Tilleuls";

        Space NewSpace(string name, SpaceKind kind, string description, bool isArchived = false)
            => new()
            {
                GardenId = garden.Id,
                Name = name,
                Kind = kind,
                Description = description,
                IsArchived = isArchived,
                CreatedAt = now
            };

        var potager = NewSpace("Potager", SpaceKind.VegetableGarden,
            "Quatre carrés en planches de douglas, plein sud.");
        var verger = NewSpace("Verger", SpaceKind.Orchard,
            "Fond du terrain, en pente douce vers le ruisseau.");
        var petitsFruits = NewSpace("Petits fruits", SpaceKind.SmallFruit,
            "Le long de la clôture est, deux rangs palissés.");
        var bois = NewSpace("Bois de chauffage", SpaceKind.Firewood,
            "Abri ouvert contre le mur nord du garage.");
        var serre = NewSpace("Serre tunnel", SpaceKind.VegetableGarden,
            "Bâche déchirée par la grêle de juin, démontée.", isArchived: true);

        Zone NewZone(Space space, string name, string? description = null)
            => new() { Space = space, Name = name, Description = description, CreatedAt = now };

        var carre1 = NewZone(potager, "Carré 1", "Solanacées.");
        var carre2 = NewZone(potager, "Carré 2", "Racines.");
        var carre3 = NewZone(potager, "Carré 3", "Cucurbitacées, paillage épais.");
        var carre4 = NewZone(potager, "Carré 4", "Feuilles et poireaux.");
        var rang1 = NewZone(petitsFruits, "Rang 1", "Framboisiers.");
        var rang2 = NewZone(petitsFruits, "Rang 2", "Groseilliers et cassissiers.");

        db.Spaces.AddRange(potager, verger, petitsFruits, bois, serre);
        db.Zones.AddRange(carre1, carre2, carre3, carre4, rang1, rang2);

        // Enregistrements par étape : en un seul SaveChanges, EF Core réordonne les insertions et
        // les identifiants ne suivent plus l'ordre du code, dont dépend Jardo.Api.http.
        await db.SaveChangesAsync(cancellationToken);

        Plant NewPlant(
            Space space,
            Zone? zone,
            string name,
            string species,
            string? variety,
            double quantity,
            QuantityUnit unit,
            int intervalDays,
            int? sownDaysAgo,
            int? plantedDaysAgo)
            => new()
            {
                Space = space,
                Zone = zone,
                Name = name,
                Species = species,
                Variety = variety,
                Quantity = quantity,
                QuantityUnit = unit,
                WateringIntervalDays = intervalDays,
                SownDate = sownDaysAgo is null ? null : Ago(sownDaysAgo.Value),
                PlantedDate = plantedDaysAgo is null ? null : Ago(plantedDaysAgo.Value),
                CreatedAt = now
            };

        var tomates = NewPlant(potager, carre1, "Tomates", "Solanum lycopersicum", "Cœur de bœuf",
            6, QuantityUnit.Plants, 2, 100, 45);
        var basilic = NewPlant(potager, carre1, "Basilic", "Ocimum basilicum", "Grand vert",
            4, QuantityUnit.Plants, 2, null, 30);
        var carottes = NewPlant(potager, carre2, "Carottes", "Daucus carota", "Nantaise",
            2, QuantityUnit.Rows, 3, 60, null);
        var radis = NewPlant(potager, carre2, "Radis de printemps", "Raphanus sativus", "National",
            1, QuantityUnit.Rows, 1, 150, null);
        var courgettes = NewPlant(potager, carre3, "Courgettes", "Cucurbita pepo", "Black Beauty",
            2, QuantityUnit.Plants, 3, null, 40);
        var laitues = NewPlant(potager, carre4, "Laitues", "Lactuca sativa", "Batavia blonde",
            12, QuantityUnit.Plants, 1, null, 20);
        var poireaux = NewPlant(potager, carre4, "Poireaux", "Allium porrum", "Bleu de Solaise",
            1.5, QuantityUnit.SquareMeters, 4, 120, 50);
        var rhubarbe = NewPlant(potager, null, "Rhubarbe", "Rheum rhabarbarum", null,
            1, QuantityUnit.Plants, 7, null, 900);

        var pommier = NewPlant(verger, null, "Pommier", "Malus domestica", "Reine des reinettes",
            1, QuantityUnit.Plants, 14, null, 1200);
        var poirier = NewPlant(verger, null, "Poirier", "Pyrus communis", "Conférence",
            1, QuantityUnit.Plants, 14, null, 1100);
        var cerisier = NewPlant(verger, null, "Cerisier", "Prunus avium", "Burlat",
            1, QuantityUnit.Plants, 14, null, 800);
        var prunier = NewPlant(verger, null, "Prunier", "Prunus domestica", "Reine-Claude dorée",
            1, QuantityUnit.Plants, 14, null, 10);

        var framboisiers = NewPlant(petitsFruits, rang1, "Framboisiers", "Rubus idaeus", "Heritage",
            8, QuantityUnit.Plants, 7, null, 400);
        var groseilliers = NewPlant(petitsFruits, rang2, "Groseilliers", "Ribes rubrum", "Jonkheer van Tets",
            3, QuantityUnit.Plants, 7, null, 3);
        var cassissiers = NewPlant(petitsFruits, rang2, "Cassissiers", "Ribes nigrum", "Noir de Bourgogne",
            2, QuantityUnit.Plants, 7, null, 600);

        // Culture finie : archivée, elle reste dans l'historique du carré 2.
        radis.IsArchived = true;

        db.Plants.AddRange(
            tomates, basilic, carottes, radis, courgettes, laitues, poireaux, rhubarbe,
            pommier, poirier, cerisier, prunier,
            framboisiers, groseilliers, cassissiers);

        await db.SaveChangesAsync(cancellationToken);

        // Chaque date produit un état précis ; le commentaire de ligne donne l'échéance obtenue.
        WateringLog Watering(Plant plant, int daysAgo, string? note = null)
            => new() { Plant = plant, WateredAt = Ago(daysAgo), Note = note };

        db.WateringLogs.AddRange(
            Watering(tomates, 8),
            Watering(tomates, 6, "Paillage ajouté au pied."),
            Watering(tomates, 4),                      // + 2 j  -> en retard de 2 jours
            Watering(basilic, 0),                      // + 2 j  -> à jour
            Watering(carottes, 3),                     // + 3 j  -> échéance aujourd'hui
            Watering(courgettes, 5),                   // + 3 j  -> en retard de 2 jours
            Watering(laitues, 1),                      // + 1 j  -> échéance aujourd'hui
            Watering(poireaux, 2),                     // + 4 j  -> à jour
            Watering(rhubarbe, 3),                     // + 7 j  -> à jour
            Watering(pommier, 20, "Arrosage de reprise après la sécheresse."),
                                                       // + 14 j -> en retard de 6 jours
            Watering(poirier, 10),                     // + 14 j -> à jour
            Watering(cerisier, 14),                    // + 14 j -> échéance aujourd'hui
            Watering(framboisiers, 2),                 // + 7 j  -> à jour
            Watering(cassissiers, 9)                   // + 7 j  -> en retard de 2 jours

            // Prunier (à jour) et groseilliers (à jour) n'ont aucun arrosage :
            // l'échéance repart de la date de plantation.
        );

        db.Observations.AddRange(
            new Observation
            {
                Plant = tomates,
                ObservedAt = Ago(10),
                Note = "Premières fleurs sur le pied du fond.",
                HeightCm = 45
            },
            new Observation
            {
                Plant = tomates,
                ObservedAt = Ago(3),
                Note = "Belle croissance, premiers fruits verts.",
                HeightCm = 72
            },
            new Observation
            {
                Plant = courgettes,
                ObservedAt = Ago(2),
                Note = "Taches blanches sur les feuilles les plus basses.",
                ProblemNote = "Oïdium probable, favorisé par l'humidité du matin.",
                Treatment = "Feuilles atteintes retirées, purin de prêle appliqué."
            },
            new Observation
            {
                Plant = pommier,
                ObservedAt = Ago(15),
                Note = "Belle charge cette année, quelques fruits éclaircis."
            },
            new Observation
            {
                Plant = groseilliers,
                ObservedAt = Ago(1),
                Note = "Reprise correcte, premières feuilles.",
                HeightCm = 35
            }
        );

        await db.SaveChangesAsync(cancellationToken);
    }
}
