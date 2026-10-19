using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Data;

/// <summary>
/// Remplit la base avec un jardin d'exemple : un potager en carrés, un verger, des petits fruits
/// par rang, une serre et un espace bois de chauffage, encore vide ; quelques semaines de journal
/// et des tâches. Les dates sont relatives à aujourd'hui pour qu'il y ait toujours des tâches à
/// jour, à faire aujourd'hui et en retard.
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
        var serre = NewSpace("Serre", SpaceKind.Greenhouse,
            "Serre en polycarbonate de 12 m², contre le garage.");
        var tunnel = NewSpace("Serre tunnel", SpaceKind.Greenhouse,
            "Bâche déchirée par la grêle de juin, démontée.", isArchived: true);

        Zone NewZone(Space space, string name, string? description = null)
            => new() { Space = space, Name = name, Description = description, CreatedAt = now };

        var carre1 = NewZone(potager, "Carré 1", "Solanacées.");
        var carre2 = NewZone(potager, "Carré 2", "Racines.");
        var carre3 = NewZone(potager, "Carré 3", "Cucurbitacées, paillage épais.");
        var carre4 = NewZone(potager, "Carré 4", "Feuilles et poireaux.");
        var rang1 = NewZone(petitsFruits, "Rang 1", "Framboisiers.");
        var rang2 = NewZone(petitsFruits, "Rang 2", "Groseilliers et cassissiers.");
        var tablette = NewZone(serre, "Tablette", "Semis et jeunes plants.");
        var bac = NewZone(serre, "Bac de pleine terre");

        db.Spaces.AddRange(potager, verger, petitsFruits, bois, serre, tunnel);
        db.Zones.AddRange(carre1, carre2, carre3, carre4, rang1, rang2, tablette, bac);

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
                SownDate = sownDaysAgo is null ? null : Ago(sownDaysAgo.Value),
                PlantedDate = plantedDaysAgo is null ? null : Ago(plantedDaysAgo.Value),
                CreatedAt = now
            };

        var tomates = NewPlant(potager, carre1, "Tomates", "Solanum lycopersicum", "Cœur de bœuf",
            6, QuantityUnit.Plants, 100, 45);
        var basilic = NewPlant(potager, carre1, "Basilic", "Ocimum basilicum", "Grand vert",
            4, QuantityUnit.Plants, null, 30);
        var carottes = NewPlant(potager, carre2, "Carottes", "Daucus carota", "Nantaise",
            2, QuantityUnit.Rows, 60, null);
        var radis = NewPlant(potager, carre2, "Radis de printemps", "Raphanus sativus", "National",
            1, QuantityUnit.Rows, 150, null);
        var courgettes = NewPlant(potager, carre3, "Courgettes", "Cucurbita pepo", "Black Beauty",
            2, QuantityUnit.Plants, null, 40);
        var laitues = NewPlant(potager, carre4, "Laitues", "Lactuca sativa", "Batavia blonde",
            12, QuantityUnit.Plants, null, 20);
        var poireaux = NewPlant(potager, carre4, "Poireaux", "Allium porrum", "Bleu de Solaise",
            1.5, QuantityUnit.SquareMeters, 120, 50);
        var rhubarbe = NewPlant(potager, null, "Rhubarbe", "Rheum rhabarbarum", null,
            1, QuantityUnit.Plants, null, 900);

        // Trois arbres identiques suivis ensemble ; les autres arbres du verger sont suivis seuls.
        var pommiers = NewPlant(verger, null, "Pommiers", "Malus domestica", "Golden",
            3, QuantityUnit.Plants, null, 1200);
        var poirier = NewPlant(verger, null, "Poirier", "Pyrus communis", "Conférence",
            1, QuantityUnit.Plants, null, 1100);
        var cerisier = NewPlant(verger, null, "Cerisier", "Prunus avium", "Burlat",
            1, QuantityUnit.Plants, null, 800);
        var prunier = NewPlant(verger, null, "Prunier", "Prunus domestica", "Reine-Claude dorée",
            1, QuantityUnit.Plants, null, 10);

        var framboisiers = NewPlant(petitsFruits, rang1, "Framboisiers", "Rubus idaeus", "Heritage",
            8, QuantityUnit.Plants, null, 400);
        var groseilliers = NewPlant(petitsFruits, rang2, "Groseilliers", "Ribes rubrum", "Jonkheer van Tets",
            3, QuantityUnit.Plants, null, 3);
        var cassissiers = NewPlant(petitsFruits, rang2, "Cassissiers", "Ribes nigrum", "Noir de Bourgogne",
            2, QuantityUnit.Plants, null, 600);

        var piments = NewPlant(serre, tablette, "Piments", "Capsicum annuum", "Espelette",
            12, QuantityUnit.Plants, 15, null);
        var concombres = NewPlant(serre, bac, "Concombres", "Cucumis sativus", "Marketmore",
            3, QuantityUnit.Plants, null, 35);
        var aubergines = NewPlant(serre, bac, "Aubergines", "Solanum melongena", "Violette de Barbentane",
            2, QuantityUnit.Plants, null, 10);

        // Culture finie : archivée, elle reste dans l'historique du carré 2.
        radis.IsArchived = true;

        db.Plants.AddRange(
            tomates, basilic, carottes, radis, courgettes, laitues, poireaux, rhubarbe,
            pommiers, poirier, cerisier, prunier,
            framboisiers, groseilliers, cassissiers,
            piments, concombres, aubergines);

        await db.SaveChangesAsync(cancellationToken);

        JournalEntry Entry(
            JournalEntryKind kind,
            int daysAgo,
            Space space,
            Zone? zone = null,
            Plant? item = null,
            string? note = null,
            double? quantity = null,
            MeasureUnit? unit = null,
            int? heightCm = null,
            string? problem = null,
            string? treatment = null)
            => new()
            {
                Kind = kind,
                Date = Ago(daysAgo),
                Space = space,
                Zone = zone ?? item?.Zone,
                Item = item,
                Note = note,
                Quantity = quantity,
                QuantityUnit = unit,
                HeightCm = heightCm,
                Problem = problem,
                Treatment = treatment,
                CreatedAt = now
            };

        const JournalEntryKind Watering = JournalEntryKind.Watering;

        // Arrosages : la plupart sont notés sur une zone ou un espace et valent pour leurs plantes.
        // Les derniers de chaque cible fixent l'état des tâches d'arrosage, donné plus bas.
        db.JournalEntries.AddRange(
            Entry(Watering, 25, potager, note: "Grand arrosage de tout le potager au jet."),
            Entry(Watering, 14, potager, carre1),
            Entry(Watering, 12, potager, note: "Tout le potager, après trois jours de canicule."),
            Entry(Watering, 11, potager, carre1),
            Entry(Watering, 10, potager, carre2),
            Entry(Watering, 9, serre, bac),
            Entry(Watering, 8, potager, carre1),
            Entry(Watering, 7, serre, tablette),
            Entry(Watering, 6, potager, carre1, note: "Paillage ajouté au pied des tomates."),
            Entry(Watering, 6, potager, carre2),
            Entry(Watering, 4, potager, carre1),
            Entry(Watering, 0, potager, item: basilic),
            Entry(Watering, 3, potager, carre2),
            Entry(Watering, 5, potager, item: courgettes),
            Entry(Watering, 1, potager, carre4),
            Entry(Watering, 3, potager, item: rhubarbe),
            Entry(Watering, 20, verger, note: "Arrosage de reprise après la sécheresse."),
            Entry(Watering, 10, verger, item: poirier),
            Entry(Watering, 14, verger, item: cerisier),
            Entry(Watering, 2, petitsFruits, rang1),
            Entry(Watering, 9, petitsFruits, rang2),
            Entry(Watering, 1, serre, tablette),
            Entry(Watering, 5, serre, bac),
            Entry(Watering, 1, serre, item: concombres)
        );

        db.JournalEntries.AddRange(
            Entry(JournalEntryKind.Sowing, 60, potager, item: carottes,
                note: "Deux rangs, graines en ruban."),
            Entry(JournalEntryKind.Planting, 45, potager, item: tomates,
                note: "Six pieds, tuteurs en spirale."),
            Entry(JournalEntryKind.Harvest, 40, verger, item: cerisier,
                note: "Une partie laissée aux merles.", quantity: 6, unit: MeasureUnit.Kilograms),
            Entry(JournalEntryKind.Pruning, 35, verger,
                note: "Taille en vert de tous les arbres : gourmands et branches qui se croisent."),
            Entry(JournalEntryKind.Fertilizing, 30, potager, carre3,
                note: "Deux seaux de compost mûr avant le paillage."),
            Entry(JournalEntryKind.Harvest, 25, potager, item: radis,
                note: "Fin de la planche, radis creux pour les derniers.", quantity: 30, unit: MeasureUnit.Pieces),
            Entry(JournalEntryKind.Pruning, 21, petitsFruits, item: framboisiers,
                note: "Cannes qui ont fructifié coupées au ras du sol."),
            Entry(JournalEntryKind.Planting, 20, potager, item: laitues,
                note: "Douze plants repiqués, filet contre les oiseaux."),
            Entry(JournalEntryKind.Other, 18, potager,
                note: "Désherbage des allées et tonte des abords."),
            Entry(JournalEntryKind.Sowing, 15, serre, item: piments,
                note: "Douze godets sur la tablette chauffante."),
            Entry(JournalEntryKind.Observation, 15, verger, item: pommiers,
                note: "Belle charge cette année, quelques fruits éclaircis."),
            Entry(JournalEntryKind.Observation, 10, potager, item: tomates,
                note: "Premières fleurs sur le pied du fond.", heightCm: 45),
            Entry(JournalEntryKind.Planting, 10, verger, item: prunier,
                note: "Scion de deux ans, tuteuré face au vent."),
            Entry(JournalEntryKind.Harvest, 6, potager, item: courgettes,
                note: "Les premières, cueillies à 20 cm.", quantity: 3.2, unit: MeasureUnit.Kilograms),
            Entry(JournalEntryKind.Harvest, 4, petitsFruits, item: framboisiers,
                quantity: 650, unit: MeasureUnit.Grams),
            Entry(JournalEntryKind.Observation, 3, potager, item: tomates,
                note: "Belle croissance, premiers fruits verts.", heightCm: 72),
            Entry(JournalEntryKind.Planting, 3, petitsFruits, item: groseilliers,
                note: "Trois pieds en racines nues."),
            Entry(JournalEntryKind.Observation, 2, potager, item: courgettes,
                note: "Taches blanches sur les feuilles les plus basses.",
                problem: "Oïdium probable, favorisé par l'humidité du matin."),
            Entry(JournalEntryKind.Treatment, 1, potager, item: courgettes,
                note: "Feuilles atteintes retirées.",
                problem: "Oïdium",
                treatment: "Purin de prêle pulvérisé en fin de journée."),
            Entry(JournalEntryKind.Observation, 1, petitsFruits, item: groseilliers,
                note: "Reprise correcte, premières feuilles.", heightCm: 35),
            Entry(JournalEntryKind.Harvest, 1, potager, item: tomates,
                note: "Premières cœur de bœuf.", quantity: 2.5, unit: MeasureUnit.Kilograms)
        );

        await db.SaveChangesAsync(cancellationToken);

        GardenTask NewTask(
            JournalEntryKind kind,
            TaskRecurrence recurrence,
            DateOnly startDate,
            Space space,
            Zone? zone = null,
            Plant? item = null,
            int? intervalDays = null,
            string? title = null)
            => new()
            {
                Kind = kind,
                Recurrence = recurrence,
                StartDate = startDate,
                IntervalDays = intervalDays,
                Title = title,
                Space = space,
                Zone = zone ?? item?.Zone,
                Item = item,
                CreatedAt = now
            };

        GardenTask WateringTask(Space space, Zone? zone = null, Plant? item = null, int everyDays = 1, int startedDaysAgo = 60, string? title = null)
            => NewTask(JournalEntryKind.Watering, TaskRecurrence.EveryNDays, Ago(startedDaysAgo), space, zone, item, everyDays, title);

        // L'état de chaque tâche, d'après le journal ci-dessus, est donné en commentaire.
        db.GardenTasks.AddRange(
            // En retard de 2 jours : le carré 1 a été arrosé il y a 4 jours.
            WateringTask(potager, item: tomates, everyDays: 2, startedDaysAgo: 45),
            // À jour : arrosé ce matin, malgré le carré arrosé il y a 4 jours.
            WateringTask(potager, item: basilic, everyDays: 2, startedDaysAgo: 30),
            // À faire aujourd'hui.
            WateringTask(potager, item: carottes, everyDays: 3),
            // En retard de 2 jours.
            WateringTask(potager, item: courgettes, everyDays: 3, startedDaysAgo: 40),
            // Tout le carré 4, tous les jours : à faire aujourd'hui.
            WateringTask(potager, carre4, startedDaysAgo: 20, title: "Laitues et poireaux"),
            // À jour, prochain arrosage dans 4 jours.
            WateringTask(potager, item: rhubarbe, everyDays: 7),
            // En retard de 6 jours : l'arrosage de tout le verger date de 20 jours.
            WateringTask(verger, item: pommiers, everyDays: 14),
            // En retard de 3 jours : la tâche part d'une semaine après la plantation, et l'arrosage
            // du verger, plus ancien, n'y change rien.
            WateringTask(verger, item: prunier, everyDays: 7, startedDaysAgo: 3, title: "Arrosage de reprise"),
            // En retard de 2 jours.
            WateringTask(petitsFruits, rang2, everyDays: 7),
            // À faire aujourd'hui.
            WateringTask(serre, tablette, startedDaysAgo: 15),
            // En retard de 3 jours : l'arrosage des seuls concombres, hier, n'arrose pas le bac.
            WateringTask(serre, bac, everyDays: 2, startedDaysAgo: 35),
            // En retard de 4 jours.
            NewTask(JournalEntryKind.Other, TaskRecurrence.EveryNDays, Ago(60), potager,
                intervalDays: 14, title: "Désherber les allées"),
            // À jour presque toute l'année : la taille en vert d'il y a 35 jours compte, même en retard,
            // pour le dernier 1er février passé ; elle ne fait pas celui qui vient.
            NewTask(JournalEntryKind.Pruning, TaskRecurrence.Yearly, new DateOnly(today.Year, 2, 1), verger,
                title: "Taille d'hiver"),
            // En retard de 10 jours : jamais faite.
            NewTask(JournalEntryKind.Fertilizing, TaskRecurrence.Yearly, Ago(10), petitsFruits,
                title: "Compost au pied des arbustes"),
            // À jour, prévue dans 6 jours.
            NewTask(JournalEntryKind.Treatment, TaskRecurrence.Once, today.AddDays(6), potager, item: courgettes,
                title: "Renouveler le purin de prêle"),
            // Faite : plantés il y a 3 jours.
            NewTask(JournalEntryKind.Planting, TaskRecurrence.Once, Ago(5), petitsFruits, item: groseilliers,
                title: "Planter les groseilliers")
        );

        await db.SaveChangesAsync(cancellationToken);
    }
}
