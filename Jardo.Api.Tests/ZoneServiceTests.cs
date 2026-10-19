using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Jardo.Api.Services;

namespace Jardo.Api.Tests;

public class ZoneServiceTests : IDisposable
{
    private readonly TestDatabase _database = new();
    private readonly ZoneService _service;

    public ZoneServiceTests()
    {
        _service = new ZoneService(_database.Context, new FakeTimeProvider(new DateOnly(2026, 6, 15)));
    }

    public void Dispose() => _database.Dispose();

    [Fact]
    public async Task Deux_espaces_peuvent_avoir_une_zone_du_meme_nom()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var petitsFruits = await _database.Context.AddSpaceAsync("Petits fruits", SpaceKind.SmallFruit);
        await _database.Context.AddZoneAsync(potager, "Rang 1");

        var zone = await _service.CreateAsync(petitsFruits.Id, new SaveZoneDto { Name = "Rang 1" });

        Assert.Equal(petitsFruits.Id, zone.SpaceId);
    }

    [Fact]
    public async Task Deux_zones_dun_meme_espace_ne_peuvent_pas_porter_le_meme_nom()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        await _database.Context.AddZoneAsync(potager, "Carré 1");

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.CreateAsync(potager.Id, new SaveZoneDto { Name = "Carré 1 " }));
    }

    [Fact]
    public async Task Renommer_une_zone_avec_le_nom_dune_voisine_est_refuse()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        await _database.Context.AddZoneAsync(potager, "Carré 1");
        var carre2 = await _database.Context.AddZoneAsync(potager, "Carré 2");

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.UpdateAsync(carre2.Id, new SaveZoneDto { Name = "Carré 1" }));
    }

    [Fact]
    public async Task Un_espace_archive_naccueille_plus_de_nouvelle_zone()
    {
        var serre = await _database.Context.AddSpaceAsync("Serre", isArchived: true);

        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.CreateAsync(serre.Id, new SaveZoneDto { Name = "Planche 1" }));
    }

    [Fact]
    public async Task Creer_une_zone_dans_un_espace_inexistant_leve_NotFound()
    {
        await Assert.ThrowsAsync<NotFoundException>(
            () => _service.CreateAsync(999, new SaveZoneDto { Name = "Carré 1" }));
    }

    [Fact]
    public async Task Supprimer_une_zone_qui_contient_un_element_est_refuse()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var carre = await _database.Context.AddZoneAsync(potager, "Carré 1");
        await _database.Context.AddPlantAsync(potager, carre, "Radis", isArchived: true);

        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.DeleteAsync(carre.Id));
    }

    [Fact]
    public async Task Le_compteur_de_zone_ne_retient_que_les_elements_actifs()
    {
        var potager = await _database.Context.AddSpaceAsync("Potager");
        var carre = await _database.Context.AddZoneAsync(potager, "Carré 1");
        await _database.Context.AddPlantAsync(potager, carre, "Tomate");
        await _database.Context.AddPlantAsync(potager, carre, "Radis", isArchived: true);

        var zone = Assert.Single(await _service.GetBySpaceAsync(potager.Id));

        Assert.Equal(1, zone.ItemCount);
    }
}
