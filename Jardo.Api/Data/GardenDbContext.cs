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

    public DbSet<Garden> Gardens => Set<Garden>();
    public DbSet<Space> Spaces => Set<Space>();
    public DbSet<Zone> Zones => Set<Zone>();
    public DbSet<GardenItem> GardenItems => Set<GardenItem>();
    public DbSet<Plant> Plants => Set<Plant>();
    public DbSet<WateringLog> WateringLogs => Set<WateringLog>();
    public DbSet<Observation> Observations => Set<Observation>();

    // Contraintes en Fluent API (et non en attributs) pour que Models reste indépendant d'EF Core.
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Garden>(garden =>
        {
            garden.Property(g => g.Name).IsRequired().HasMaxLength(100);

            // Le jardin unique du MVP fait partie du schéma : il existe dès la première migration,
            // sans dépendre du seeder.
            garden.HasData(new Garden
            {
                Id = Garden.DefaultId,
                Name = "Mon jardin",
                CreatedAt = new DateTimeOffset(2026, 10, 18, 0, 0, 0, TimeSpan.Zero)
            });
        });

        modelBuilder.Entity<Space>(space =>
        {
            space.Property(s => s.Name).IsRequired().HasMaxLength(100);
            space.Property(s => s.Description).HasMaxLength(500);

            // En texte : la base reste lisible et l'ordre de l'énumération peut changer.
            space.Property(s => s.Kind).HasConversion<string>().HasMaxLength(30);

            space.HasOne(s => s.Garden)
                 .WithMany(g => g.Spaces)
                 .HasForeignKey(s => s.GardenId);

            space.HasIndex(s => new { s.GardenId, s.Name }).IsUnique();
        });

        modelBuilder.Entity<Zone>(zone =>
        {
            zone.Property(z => z.Name).IsRequired().HasMaxLength(100);
            zone.Property(z => z.Description).HasMaxLength(500);

            // Un espace ne se supprime que vide d'éléments (SpaceService) : ses zones partent avec lui.
            zone.HasOne(z => z.Space)
                .WithMany(s => s.Zones)
                .HasForeignKey(z => z.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);

            zone.HasIndex(z => new { z.SpaceId, z.Name }).IsUnique();
        });

        modelBuilder.Entity<GardenItem>(item =>
        {
            item.ToTable("GardenItems");

            item.HasDiscriminator<string>("ItemType")
                .HasValue<Plant>("Plant");

            item.Property("ItemType").HasMaxLength(30);
            item.Property(i => i.Name).IsRequired().HasMaxLength(100);

            // Restrict : supprimer un espace ou une zone ne doit jamais emporter un élément et son
            // historique. Les services refusent avant, avec un message clair.
            item.HasOne(i => i.Space)
                .WithMany(s => s.Items)
                .HasForeignKey(i => i.SpaceId)
                .OnDelete(DeleteBehavior.Restrict);

            item.HasOne(i => i.Zone)
                .WithMany(z => z.Items)
                .HasForeignKey(i => i.ZoneId)
                .OnDelete(DeleteBehavior.Restrict);

            item.HasIndex(i => new { i.SpaceId, i.IsArchived });
        });

        modelBuilder.Entity<Plant>(plant =>
        {
            plant.Property(p => p.Species).HasMaxLength(100);
            plant.Property(p => p.Variety).HasMaxLength(100);
            plant.Property(p => p.QuantityUnit).HasConversion<string>().HasMaxLength(30);
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
