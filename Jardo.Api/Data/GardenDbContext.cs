using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Data;

// Pas de Repository : le DbContext fait déjà office d'unité de travail.
public class GardenDbContext : DbContext
{
    public GardenDbContext(DbContextOptions<GardenDbContext> options)
        : base(options)
    {
    }

    public DbSet<Zone> Zones => Set<Zone>();
    public DbSet<Plant> Plants => Set<Plant>();
    public DbSet<WateringLog> WateringLogs => Set<WateringLog>();
    public DbSet<Observation> Observations => Set<Observation>();

    // Contraintes en Fluent API (et non en attributs) pour que Models reste indépendant d'EF Core.
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Zone>(zone =>
        {
            zone.Property(z => z.Name).IsRequired().HasMaxLength(100);
            zone.Property(z => z.Description).HasMaxLength(500);

            zone.HasIndex(z => z.Name).IsUnique();
        });

        modelBuilder.Entity<Plant>(plant =>
        {
            plant.Property(p => p.Name).IsRequired().HasMaxLength(100);
            plant.Property(p => p.Species).HasMaxLength(100);

            plant.HasOne(p => p.Zone)
                 .WithMany(z => z.Plants)
                 .HasForeignKey(p => p.ZoneId)
                 // Doublée par une règle métier : ZoneService refuse de supprimer une zone non vide.
                 .OnDelete(DeleteBehavior.Cascade);

            plant.HasIndex(p => new { p.ZoneId, p.IsArchived });
        });

        modelBuilder.Entity<WateringLog>(log =>
        {
            log.Property(l => l.Note).HasMaxLength(500);

            log.HasOne(l => l.Plant)
               .WithMany(p => p.WateringLogs)
               .HasForeignKey(l => l.PlantId)
               .OnDelete(DeleteBehavior.Cascade);

            // Sert la requête « dernier arrosage d'une plante ».
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
