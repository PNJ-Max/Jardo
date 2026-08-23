using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Data;

/// <summary>
/// Remplit la base avec un potager d'exemple, pour pouvoir manipuler l'API dès le
/// premier lancement.
/// </summary>
/// <remarks>
/// Les dates sont calculées <b>relativement à aujourd'hui</b> et non écrites en dur.
/// C'est ce qui permet d'avoir toujours des plantes en retard d'arrosage, quel que soit
/// le jour où on lance le projet. Avec des dates fixes, tout serait « en retard de
/// 400 jours » au bout d'un an, et le jeu de données ne montrerait plus rien.
/// </remarks>
public static class DbSeeder
{
    /// <summary>
    /// Insère les données d'exemple si la base est vide.
    /// </summary>
    /// <remarks>
    /// Le test « la base est vide » rend l'opération idempotente : on peut relancer
    /// l'application autant de fois qu'on veut sans dupliquer le potager. Sans ce test,
    /// chaque démarrage ajouterait trois zones de plus — et le troisième échouerait sur
    /// la contrainte d'unicité des noms.
    /// </remarks>
    public static async Task SeedAsync(GardenDbContext db, TimeProvider timeProvider, CancellationToken cancellationToken = default)
    {
        if (await db.Zones.AnyAsync(cancellationToken))
        {
            return;
        }

        var today = timeProvider.Today();
        var now = timeProvider.GetUtcNow();

        // Fonction locale : raccourci de lecture pour « il y a N jours ».
        // Écrire today.AddDays(-4) partout serait correct mais moins parlant que Ago(4).
        DateOnly Ago(int days) => today.AddDays(-days);

        var potager = new Zone
        {
            Name = "Potager",
            Description = "Carré principal, plein soleil, côté sud.",
            CreatedAt = now
        };

        var serre = new Zone
        {
            Name = "Serre",
            Description = "Sous abri : arrosages plus fréquents, pas de pluie.",
            CreatedAt = now
        };

        var verger = new Zone
        {
            Name = "Verger",
            Description = "Arbustes et petits fruits, en pleine terre.",
            CreatedAt = now
        };

        db.Zones.AddRange(potager, serre, verger);

        // Premier enregistrement : nécessaire pour que les zones reçoivent leur Id,
        // attribué par SQLite. Sans cela, les plantes créées juste après auraient un
        // ZoneId à 0 et l'insertion échouerait sur la clé étrangère.
        //
        // C'est le seul endroit du projet où l'on enchaîne deux SaveChangesAsync, et
        // c'est pour cette raison précise.
        await db.SaveChangesAsync(cancellationToken);

        // Fonction locale de construction, pour ne pas répéter dix fois les mêmes
        // affectations. Les paramètres nommés à l'appel gardent la lisibilité.
        Plant NewPlant(Zone zone, string name, string? species, int intervalDays, int plantedDaysAgo)
            => new()
            {
                ZoneId = zone.Id,
                Name = name,
                Species = species,
                WateringIntervalDays = intervalDays,
                PlantedDate = Ago(plantedDaysAgo),
                IsArchived = false,
                CreatedAt = now
            };

        // --- Le potager ---
        var tomate = NewPlant(potager, "Tomate cerise", "Solanum lycopersicum", 2, 45);
        var courgette = NewPlant(potager, "Courgette", "Cucurbita pepo", 3, 40);
        var salade = NewPlant(potager, "Laitue", "Lactuca sativa", 1, 20);
        var basilic = NewPlant(potager, "Basilic", "Ocimum basilicum", 2, 30);
        var poivron = NewPlant(potager, "Poivron", "Capsicum annuum", 3, 50);

        // --- La serre ---
        var concombre = NewPlant(serre, "Concombre", "Cucumis sativus", 2, 35);
        var aubergine = NewPlant(serre, "Aubergine", "Solanum melongena", 3, 10);

        // --- Le verger ---
        var framboisier = NewPlant(verger, "Framboisier", "Rubus idaeus", 7, 400);
        var pommier = NewPlant(verger, "Pommier", "Malus domestica", 14, 1200);
        var groseillier = NewPlant(verger, "Groseillier", "Ribes rubrum", 7, 3);

        // Une plante archivée, pour vérifier qu'elle est bien exclue des calculs
        // d'arrosage et de la liste par défaut.
        var radis = NewPlant(potager, "Radis (printemps)", "Raphanus sativus", 1, 120);
        radis.IsArchived = true;

        db.Plants.AddRange(
            tomate, courgette, salade, basilic, poivron,
            concombre, aubergine,
            framboisier, pommier, groseillier,
            radis);

        await db.SaveChangesAsync(cancellationToken);

        // --- Les arrosages ---
        //
        // Chaque date est choisie pour produire un état précis. L'échéance étant
        // « dernier arrosage + intervalle », le commentaire indique le résultat attendu :
        // c'est ce qui permet de vérifier d'un coup d'oeil que le calcul est correct.
        WateringLog Watering(Plant plant, int daysAgo, string? note = null)
            => new() { PlantId = plant.Id, WateredAt = Ago(daysAgo), Note = note };

        db.WateringLogs.AddRange(
            // Un peu d'historique sur la tomate, pour que l'endpoint d'historique
            // renvoie plus d'une ligne.
            Watering(tomate, 8),
            Watering(tomate, 6, "Paillage ajouté au pied."),
            Watering(tomate, 4),                       // + 2 j  -> en retard de 2 jours
            Watering(courgette, 3),                    // + 3 j  -> échéance aujourd'hui
            Watering(salade, 1),                       // + 1 j  -> échéance aujourd'hui
            Watering(basilic, 0),                      // + 2 j  -> à jour
            Watering(poivron, 5),                      // + 3 j  -> en retard de 2 jours
            Watering(concombre, 1),                    // + 2 j  -> à jour
            Watering(framboisier, 2),                  // + 7 j  -> à jour
            Watering(pommier, 20, "Arrosage de reprise après la sécheresse.")
            // + 14 j -> en retard de 6 jours

            // Volontairement absentes : aubergine et groseillier n'ont aucun arrosage.
            // Le calcul repart donc de leur date de plantation.
            //   - aubergine : plantée il y a 10 j, intervalle 3 -> en retard de 7 jours
            //   - groseillier : planté il y a 3 j, intervalle 7 -> à jour
            // C'est ce cas-là qui vérifie le repli sur PlantedDate.
        );

        // --- Le journal ---
        db.Observations.AddRange(
            new Observation
            {
                PlantId = tomate.Id,
                ObservedAt = Ago(10),
                Note = "Premières fleurs sur le pied du fond.",
                HeightCm = 45
            },
            new Observation
            {
                PlantId = tomate.Id,
                ObservedAt = Ago(3),
                Note = "Belle croissance, premiers fruits verts.",
                HeightCm = 72
            },
            new Observation
            {
                PlantId = courgette.Id,
                ObservedAt = Ago(2),
                Note = "Taches blanches sur les feuilles les plus basses.",
                ProblemNote = "Oïdium probable, favorisé par l'humidité du matin.",
                Treatment = "Feuilles atteintes retirées, purin de prêle appliqué."
            },
            new Observation
            {
                PlantId = aubergine.Id,
                ObservedAt = Ago(1),
                Note = "Feuilles qui retombent en fin de journée.",
                HeightCm = 22,
                ProblemNote = "Manque d'eau probable : aucun arrosage depuis la plantation."
            }
        );

        await db.SaveChangesAsync(cancellationToken);
    }
}
