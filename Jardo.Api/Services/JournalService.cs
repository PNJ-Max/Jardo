using Jardo.Api.Data;
using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Services;

/// <inheritdoc cref="IJournalService"/>
public class JournalService : IJournalService
{
    private readonly GardenDbContext _db;
    private readonly TimeProvider _timeProvider;

    public JournalService(GardenDbContext db, TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    private static IQueryable<JournalEntryResponseDto> Project(IQueryable<JournalEntry> entries)
        => entries.Select(entry => new JournalEntryResponseDto
        {
            Id = entry.Id,
            Date = entry.Date,
            Kind = entry.Kind,
            Note = entry.Note,
            Quantity = entry.Quantity,
            QuantityUnit = entry.QuantityUnit,
            HeightCm = entry.HeightCm,
            Problem = entry.Problem,
            Treatment = entry.Treatment,
            CreatedAt = entry.CreatedAt,
            SpaceId = entry.SpaceId,
            SpaceName = entry.Space.Name,
            ZoneId = entry.ZoneId,
            ZoneName = entry.Zone == null ? null : entry.Zone.Name,
            ItemId = entry.ItemId,
            ItemName = entry.Item == null ? null : entry.Item.Name,
            ItemKind = entry.Item == null ? null : entry.Item is WoodPile ? ItemKind.WoodPile : ItemKind.Plant
        });

    public async Task<List<JournalEntryResponseDto>> GetAllAsync(
        int? spaceId = null,
        int? zoneId = null,
        int? itemId = null,
        IReadOnlyCollection<JournalEntryKind>? kinds = null,
        CancellationToken cancellationToken = default)
    {
        if (new[] { spaceId, zoneId, itemId }.Count(id => id.HasValue) > 1)
        {
            throw new BusinessRuleException(
                "Le journal se lit pour une seule cible à la fois : un espace, une zone ou un élément.");
        }

        var query = _db.JournalEntries.AsNoTracking();

        if (spaceId is { } space)
        {
            if (!await _db.Spaces.AnyAsync(candidate => candidate.Id == space, cancellationToken))
            {
                throw NotFoundException.For("Space", space);
            }

            query = query.Where(entry => entry.SpaceId == space);
        }
        else if (zoneId is { } zone)
        {
            var zoneSpaceId = await _db.Zones
                .Where(candidate => candidate.Id == zone)
                .Select(candidate => (int?)candidate.SpaceId)
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw NotFoundException.For("Zone", zone);

            query = query.Where(entry =>
                entry.ZoneId == zone
                || (entry.SpaceId == zoneSpaceId && entry.ZoneId == null && entry.ItemId == null));
        }
        else if (itemId is { } item)
        {
            var position = await _db.GardenItems
                .Where(candidate => candidate.Id == item)
                .Select(candidate => new { candidate.SpaceId, candidate.ZoneId })
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw NotFoundException.For("Item", item);

            query = position.ZoneId is { } itemZoneId
                ? query.Where(entry =>
                    entry.ItemId == item
                    || (entry.ItemId == null && entry.ZoneId == itemZoneId)
                    || (entry.ItemId == null && entry.ZoneId == null && entry.SpaceId == position.SpaceId))
                : query.Where(entry =>
                    entry.ItemId == item
                    || (entry.ItemId == null && entry.ZoneId == null && entry.SpaceId == position.SpaceId));
        }

        if (kinds is { Count: > 0 })
        {
            query = query.Where(entry => kinds.Contains(entry.Kind));
        }

        // Le tri sur l'Id rend stable l'ordre des entrées d'un même jour.
        var ordered = query
            .OrderByDescending(entry => entry.Date)
            .ThenByDescending(entry => entry.Id);

        return await Project(ordered).ToListAsync(cancellationToken);
    }

    public async Task<JournalEntryResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
        => await Project(_db.JournalEntries.AsNoTracking().Where(entry => entry.Id == id))
               .FirstOrDefaultAsync(cancellationToken)
           ?? throw NotFoundException.For("JournalEntry", id);

    public async Task<JournalEntryResponseDto> CreateAsync(SaveJournalEntryDto dto, CancellationToken cancellationToken = default)
    {
        var entry = new JournalEntry { CreatedAt = _timeProvider.GetUtcNow() };

        await ApplyAsync(dto, entry, isNew: true, cancellationToken);

        _db.JournalEntries.Add(entry);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(entry.Id, cancellationToken);
    }

    public async Task<JournalEntryResponseDto> UpdateAsync(int id, SaveJournalEntryDto dto, CancellationToken cancellationToken = default)
    {
        var entry = await _db.JournalEntries.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("JournalEntry", id);

        await ApplyAsync(dto, entry, isNew: false, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var entry = await _db.JournalEntries.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("JournalEntry", id);

        // Supprimer un apport peut laisser un stock que les consommations dépassent.
        if (entry.Kind.IsWood())
        {
            await EnsureWoodStockStaysPositiveAsync([entry.ItemId], pending: null, excludedEntryId: id, cancellationToken);
        }

        _db.JournalEntries.Remove(entry);
        await _db.SaveChangesAsync(cancellationToken);
    }

    // Le stock d'un tas se calcule à partir du journal, jamais stocké : le refus d'une consommation
    // qui le ferait passer sous zéro se joue donc ici, à l'écriture. On recompte sans l'entrée visée
    // et on y substitue sa nouvelle valeur.
    private async Task EnsureWoodStockStaysPositiveAsync(
        IEnumerable<int?> itemIds,
        (int ItemId, WoodMovement Movement)? pending,
        int? excludedEntryId,
        CancellationToken cancellationToken)
    {
        var candidateIds = itemIds.OfType<int>().Distinct().ToList();

        if (candidateIds.Count == 0)
        {
            return;
        }

        var piles = await _db.WoodPiles
            .AsNoTracking()
            .Where(pile => candidateIds.Contains(pile.Id))
            .Select(pile => new { pile.Id, pile.Name, pile.InitialSteres })
            .ToListAsync(cancellationToken);

        if (piles.Count == 0)
        {
            return;
        }

        var movements = await WoodMovements.LoadAsync(
            _db, piles.Select(pile => pile.Id).ToList(), excludedEntryId, cancellationToken);

        foreach (var pile in piles)
        {
            var pileMovements = movements.GetValueOrDefault(pile.Id) ?? [];

            if (pending is { } written && written.ItemId == pile.Id)
            {
                pileMovements.Add(written.Movement);
            }

            var stock = WoodPileCalculator.RemainingSteres(pile.InitialSteres, pileMovements);

            if (stock < 0)
            {
                throw new BusinessRuleException(
                    $"Le stock du tas « {pile.Name} » ne peut pas passer sous zéro : " +
                    $"cette opération le ferait passer à {stock} stères.");
            }
        }
    }

    private async Task ApplyAsync(SaveJournalEntryDto dto, JournalEntry entry, bool isNew, CancellationToken cancellationToken)
    {
        var kind = dto.Kind!.Value;
        var date = dto.Date!.Value;

        // Une date future ferait passer une tâche pour faite avant qu'elle le soit, et masquerait
        // une plante de la liste « à arroser ». Le passé est accepté : saisie tardive.
        if (date > _timeProvider.Today())
        {
            throw new BusinessRuleException(
                $"La date {date:yyyy-MM-dd} est dans le futur : le journal ne note que ce qui a été fait.");
        }

        var note = Text.Optional(dto.Note);
        var problem = Text.Optional(dto.Problem);
        var treatment = Text.Optional(dto.Treatment);

        EnsureFieldsFitKind(kind, note, dto.Quantity, dto.QuantityUnit, dto.HeightCm, problem, treatment);

        var previousWoodItemId = !isNew && entry.Kind.IsWood() ? entry.ItemId : null;
        var current = isNew ? null : new InterventionTarget(entry.SpaceId, entry.ZoneId, entry.ItemId);
        var target = await InterventionTarget.ResolveAsync(
            _db, dto.SpaceId, dto.ZoneId, dto.ItemId, kind, current, "noter une intervention", cancellationToken);

        // Avant d'écrire : l'entrée change de tas, de type ou de volume, ce qui peut vider un tas
        // autant que remplir un autre.
        if (kind.IsWood() || previousWoodItemId is not null)
        {
            await EnsureWoodStockStaysPositiveAsync(
                [previousWoodItemId, target.ItemId],
                pending: kind.IsWood() && target.ItemId is { } pendingItemId ? (pendingItemId, new WoodMovement(kind, dto.Quantity!.Value)) : null,
                excludedEntryId: isNew ? null : entry.Id,
                cancellationToken);
        }

        entry.SpaceId = target.SpaceId;
        entry.ZoneId = target.ZoneId;
        entry.ItemId = target.ItemId;
        entry.Date = date;
        entry.Kind = kind;
        entry.Note = note;
        entry.Quantity = dto.Quantity;
        entry.QuantityUnit = dto.QuantityUnit;
        entry.HeightCm = dto.HeightCm;
        entry.Problem = problem;
        entry.Treatment = treatment;
    }

    private static void EnsureFieldsFitKind(
        JournalEntryKind kind,
        string? note,
        double? quantity,
        MeasureUnit? unit,
        int? heightCm,
        string? problem,
        string? treatment)
    {
        var label = kind.Label();

        if (quantity.HasValue != unit.HasValue)
        {
            throw new BusinessRuleException("Une quantité se note avec son unité, et une unité avec sa quantité.");
        }

        if (quantity.HasValue && !kind.AcceptsQuantity())
        {
            throw new BusinessRuleException(
                $"Une entrée « {label} » ne porte pas de quantité : seuls la récolte et le bois en ont une.");
        }

        if (kind.IsWood() && unit is not MeasureUnit.Steres)
        {
            throw new BusinessRuleException($"Une entrée « {label} » se note avec un volume en stères.");
        }

        if (kind is JournalEntryKind.Harvest && unit is MeasureUnit.Steres)
        {
            throw new BusinessRuleException("Une récolte se compte en kilos, en grammes ou à la pièce, pas en stères.");
        }

        if (heightCm.HasValue && kind is not JournalEntryKind.Observation)
        {
            throw new BusinessRuleException("Une hauteur se note avec une observation.");
        }

        if ((problem is not null || treatment is not null)
            && kind is not (JournalEntryKind.Observation or JournalEntryKind.Treatment))
        {
            throw new BusinessRuleException(
                "Un problème constaté ou un traitement appliqué se note avec une observation ou un traitement.");
        }

        if (kind is JournalEntryKind.Observation && note is null && heightCm is null && problem is null)
        {
            throw new BusinessRuleException("Une observation porte au moins une note, une hauteur ou un problème constaté.");
        }

        if (kind is JournalEntryKind.Other && note is null)
        {
            throw new BusinessRuleException("Une entrée « autre » a besoin d'une note pour dire ce qui a été fait.");
        }
    }
}
