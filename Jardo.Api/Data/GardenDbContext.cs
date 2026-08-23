using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Data;

/// <summary>
/// Le contexte EF Core : la porte d'entrée unique vers la base de données.
/// </summary>
/// <remarks>
/// À savoir, parce que cela explique une décision d'architecture du projet :
/// un DbContext est <b>déjà</b> un Unit of Work (il suit les modifications et les
/// valide toutes ensemble avec SaveChangesAsync), et chaque DbSet est <b>déjà</b> un
/// repository (une collection interrogeable d'entités). C'est pourquoi il n'y a aucun
/// « IRepository » dans ce projet : ce serait une couche qui réimplémente moins bien
/// ce qu'EF Core fournit déjà.
/// </remarks>
public class GardenDbContext : DbContext
{
    public GardenDbContext(DbContextOptions<GardenDbContext> options)
        : base(options)
    {
    }

    // Chaque DbSet correspond à une table. La syntaxe "=> Set<T>()" est équivalente
    // à une propriété auto-implémentée, mais elle évite l'avertissement du compilateur
    // sur une propriété non-nullable jamais assignée (c'est EF qui l'assigne).
    public DbSet<Zone> Zones => Set<Zone>();
    public DbSet<Plant> Plants => Set<Plant>();
    public DbSet<WateringLog> WateringLogs => Set<WateringLog>();
    public DbSet<Observation> Observations => Set<Observation>();

    /// <summary>
    /// Décrit la forme de la base : longueurs de colonnes, index, comportements de suppression.
    /// </summary>
    /// <remarks>
    /// Ces contraintes sont déclarées ici, et non seulement sur les DTOs. La distinction
    /// est importante : un DTO valide ce qui <i>entre par l'API</i>, la base garantit ce
    /// qui peut <i>exister</i>. Si demain un script ou une autre application écrit dans
    /// cette base, seules les contraintes déclarées ici la protègent.
    ///
    /// On utilise l'API Fluent plutôt que des attributs sur les entités, pour garder les
    /// classes du dossier Models comme de simples porteuses de données, sans dépendance
    /// à EF Core.
    /// </remarks>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Zone>(zone =>
        {
            zone.Property(z => z.Name).IsRequired().HasMaxLength(100);
            zone.Property(z => z.Description).HasMaxLength(500);

            // Deux zones ne peuvent pas porter le même nom : sans cela on se retrouve
            // vite avec trois « Potager » et plus aucun moyen de les distinguer.
            zone.HasIndex(z => z.Name).IsUnique();
        });

        modelBuilder.Entity<Plant>(plant =>
        {
            plant.Property(p => p.Name).IsRequired().HasMaxLength(100);
            plant.Property(p => p.Species).HasMaxLength(100);

            plant.HasOne(p => p.Zone)
                 .WithMany(z => z.Plants)
                 .HasForeignKey(p => p.ZoneId)
                 // Cascade : supprimer une zone supprime ses plantes en base.
                 // C'est assumé, mais dangereux à l'usage — c'est pourquoi ZoneService
                 // refuse de supprimer une zone qui contient encore des plantes.
                 // La règle métier protège l'utilisateur ; la cascade n'est que le
                 // comportement de dernier recours du moteur.
                 .OnDelete(DeleteBehavior.Cascade);

            // Presque toutes les requêtes filtrent sur « les plantes actives ».
            // Cet index composé permet de le faire sans parcourir toute la table.
            plant.HasIndex(p => new { p.ZoneId, p.IsArchived });
        });

        modelBuilder.Entity<WateringLog>(log =>
        {
            log.Property(l => l.Note).HasMaxLength(500);

            log.HasOne(l => l.Plant)
               .WithMany(p => p.WateringLogs)
               .HasForeignKey(l => l.PlantId)
               .OnDelete(DeleteBehavior.Cascade);

            // La requête la plus fréquente du projet est « le dernier arrosage de cette
            // plante ». Cet index (plante, date décroissante) permet à SQLite de la
            // résoudre en lisant une seule ligne au lieu de trier tout l'historique.
            log.HasIndex(l => new { l.PlantId, l.WateredAt })
               .IsDescending(false, true);
        });

        modelBuilder.Entity<Observation>(observation =>
        {
            observation.Property(o => o.Note).IsRequired().HasMaxLength(1000);
            observation.Property(o => o.ProblemNote).HasMaxLength(500);
            observation.Property(o => o.Treatment).HasMaxLength(500);

            observation.HasOne(o => o.Plant)
                       .WithMany(p => p.Observations)
                       .HasForeignKey(o => o.PlantId)
                       .OnDelete(DeleteBehavior.Cascade);

            observation.HasIndex(o => new { o.PlantId, o.ObservedAt })
                       .IsDescending(false, true);
        });
    }
}
