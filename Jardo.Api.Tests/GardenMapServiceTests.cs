using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Jardo.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Tests;

public class GardenMapServiceTests : IDisposable
{
    private const string Layout = GardenLayouts.TerracedLong;

    private readonly TestDatabase _database = new();
    private readonly GardenMapService _service;

    public GardenMapServiceTests()
    {
        _service = new GardenMapService(_database.Context);
    }

    public void Dispose() => _database.Dispose();

    private static SaveGardenMapDto Map(params SaveGardenMapSlotDto[] slots)
        => new() { Layout = Layout, Slots = [.. slots] };

    private static SaveGardenMapSlotDto Slot(string key, Space space, Zone? zone = null)
        => new() { SlotKey = key, SpaceId = space.Id, ZoneId = zone?.Id };

    [Fact]
    public async Task Une_carte_neuve_na_ni_modele_ni_emplacement()
    {
        var map = await _service.GetAsync();

        Assert.Null(map.Layout);
        Assert.Empty(map.Slots);
    }

    [Fact]
    public async Task Remplacer_la_carte_renvoie_les_emplacements_avec_leurs_noms()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var carre = await _database.Context.AddZoneAsync(potager, "Carré 1");
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard);

        var map = await _service.ReplaceAsync(Map(
            Slot("vegetable", potager),
            Slot("bed-1", potager, carre),
            Slot("orchard", verger)));

        Assert.Equal(Layout, map.Layout);
        Assert.Collection(
            map.Slots,
            bed => Assert.Equal(("bed-1", potager.Id, "Potager", carre.Id, "Carré 1"),
                (bed.SlotKey, bed.SpaceId, bed.SpaceName, bed.ZoneId, bed.ZoneName)),
            orchard => Assert.Equal(("orchard", SpaceKind.Orchard, null), (orchard.SlotKey, orchard.SpaceKind, orchard.ZoneId)),
            vegetable => Assert.Equal(("vegetable", null), (vegetable.SlotKey, vegetable.ZoneId)));
    }

    [Fact]
    public async Task Remplacer_la_carte_libere_ce_qui_nest_pas_relu()
    {
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard);
        var serre = await _database.Context.AddSpaceAsync("Serre", SpaceKind.Greenhouse);
        await _service.ReplaceAsync(Map(Slot("orchard", verger), Slot("greenhouse", serre)));

        var map = await _service.ReplaceAsync(Map(Slot("orchard", verger)));

        Assert.Equal("orchard", Assert.Single(map.Slots).SlotKey);
    }

    [Fact]
    public async Task Retirer_le_modele_vide_la_carte()
    {
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard);
        await _service.ReplaceAsync(Map(Slot("orchard", verger)));

        var map = await _service.ReplaceAsync(new SaveGardenMapDto { Layout = null });

        Assert.Null(map.Layout);
        Assert.Empty(map.Slots);
    }

    [Fact]
    public async Task Sans_modele_aucun_emplacement_nest_accepte()
    {
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard);

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.ReplaceAsync(new SaveGardenMapDto { Layout = null, Slots = [Slot("orchard", verger)] }));
    }

    [Fact]
    public async Task Un_modele_inconnu_est_refuse()
    {
        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.ReplaceAsync(new SaveGardenMapDto { Layout = "loft" }));
    }

    [Fact]
    public async Task Une_cle_demplacement_inconnue_est_refusee()
    {
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard);

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.ReplaceAsync(Map(Slot("bed-5", verger))));
    }

    [Fact]
    public async Task Un_espace_dun_autre_type_que_lemplacement_est_refuse()
    {
        var serre = await _database.Context.AddSpaceAsync("Serre", SpaceKind.Greenhouse);

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.ReplaceAsync(Map(Slot("orchard", serre))));
    }

    [Fact]
    public async Task Un_carre_demande_une_zone()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.ReplaceAsync(Map(Slot("bed-1", potager))));
    }

    [Fact]
    public async Task Un_emplacement_despace_refuse_une_zone()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var carre = await _database.Context.AddZoneAsync(potager, "Carré 1");

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.ReplaceAsync(Map(Slot("vegetable", potager, carre))));
    }

    [Fact]
    public async Task Une_zone_dun_autre_espace_est_refusee()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var autrePotager = await _database.Context.AddSpaceAsync("Potager du fond");
        var carreDuFond = await _database.Context.AddZoneAsync(autrePotager, "Carré 1");

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.ReplaceAsync(Map(Slot("bed-1", potager, carreDuFond))));
    }

    [Fact]
    public async Task Un_emplacement_affecte_deux_fois_est_refuse()
    {
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard);
        var vergerDuHaut = await _database.Context.AddSpaceAsync("Verger du haut", SpaceKind.Orchard);

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.ReplaceAsync(Map(Slot("orchard", verger), Slot("orchard", vergerDuHaut))));
    }

    [Fact]
    public async Task Un_espace_ne_prend_pas_deux_emplacements()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var carre = await _database.Context.AddZoneAsync(potager, "Carré 1");

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.ReplaceAsync(Map(Slot("bed-1", potager, carre), Slot("bed-2", potager, carre))));
    }

    [Fact]
    public async Task Un_espace_archive_ne_se_pose_pas_sur_la_carte()
    {
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard, isArchived: true);

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.ReplaceAsync(Map(Slot("orchard", verger))));
    }

    [Fact]
    public async Task Un_espace_inexistant_est_refuse()
    {
        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.ReplaceAsync(Map(new SaveGardenMapSlotDto { SlotKey = "orchard", SpaceId = 999 })));
    }

    [Fact]
    public async Task Un_remplacement_refuse_laisse_la_carte_intacte()
    {
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard);
        var serre = await _database.Context.AddSpaceAsync("Serre", SpaceKind.Greenhouse);
        await _service.ReplaceAsync(Map(Slot("orchard", verger)));

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.ReplaceAsync(Map(Slot("greenhouse", serre), Slot("orchard", serre))));

        var map = await _service.GetAsync();
        Assert.Equal("orchard", Assert.Single(map.Slots).SlotKey);
    }

    [Fact]
    public async Task Supprimer_un_espace_libere_son_emplacement()
    {
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard);
        await _service.ReplaceAsync(Map(Slot("orchard", verger)));

        _database.Context.Spaces.Remove(verger);
        await _database.Context.SaveChangesAsync();

        Assert.Empty((await _service.GetAsync()).Slots);
    }

    [Fact]
    public async Task Supprimer_une_zone_libere_son_carre_sans_toucher_au_potager()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var carre = await _database.Context.AddZoneAsync(potager, "Carré 1");
        await _service.ReplaceAsync(Map(Slot("vegetable", potager), Slot("bed-1", potager, carre)));

        _database.Context.Zones.Remove(carre);
        await _database.Context.SaveChangesAsync();

        var map = await _service.GetAsync();
        Assert.Equal("vegetable", Assert.Single(map.Slots).SlotKey);
    }

    [Fact]
    public async Task Archiver_un_espace_le_sort_de_la_carte()
    {
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard);
        await _service.ReplaceAsync(Map(Slot("orchard", verger)));
        var spaces = new SpaceService(_database.Context, new FakeTimeProvider(new DateOnly(2026, 6, 15)));

        await spaces.SetArchivedAsync(verger.Id, true);

        Assert.Empty((await _service.GetAsync()).Slots);
        Assert.Equal(Layout, (await _service.GetAsync()).Layout);
    }

    [Fact]
    public async Task Changer_le_type_dun_espace_le_sort_de_la_carte()
    {
        var verger = await _database.Context.AddSpaceAsync("Verger", SpaceKind.Orchard);
        await _service.ReplaceAsync(Map(Slot("orchard", verger)));
        var spaces = new SpaceService(_database.Context, new FakeTimeProvider(new DateOnly(2026, 6, 15)));

        await spaces.UpdateAsync(verger.Id, new SaveSpaceDto { Name = "Verger", Kind = SpaceKind.SmallFruit });

        Assert.Empty(await _database.Context.GardenMapSlots.ToListAsync());
    }
}
