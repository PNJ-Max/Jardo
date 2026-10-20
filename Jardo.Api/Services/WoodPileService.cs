using Jardo.Api.Data;
using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Services;

/// <inheritdoc cref="IWoodPileService"/>
public class WoodPileService : IWoodPileService
{
    private static readonly ItemPlacement.Noun WoodPileNoun = new("de tas de bois", "un tas de bois");

    private readonly GardenDbContext _db;
    private readonly TimeProvider _timeProvider;

    public WoodPileService(GardenDbContext db, TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    private record Row(WoodPile Pile, string SpaceName, string? ZoneName);

    private static IQueryable<Row> Project(IQueryable<WoodPile> piles)
        => piles.Select(pile => new Row(pile, pile.Space.Name, pile.Zone == null ? null : pile.Zone.Name));

    // Le stock dépend du journal et le séchage du jour : rien de cela n'est en base.
    private async Task<List<WoodPileResponseDto>> ToDtosAsync(List<Row> rows, CancellationToken cancellationToken)
    {
        var movements = await WoodMovements.LoadAsync(
            _db, rows.Select(row => row.Pile.Id).ToList(), excludingEntryId: null, cancellationToken);
        var today = _timeProvider.Today();

        return rows.Select(row =>
        {
            var pile = row.Pile;
            var drying = WoodPileCalculator.Drying(pile.CutDate, pile.DryingMonths, today);

            return new WoodPileResponseDto
            {
                Id = pile.Id,
                Name = pile.Name,
                WoodSpecies = pile.WoodSpecies,
                InitialSteres = pile.InitialSteres,
                LogLengthCm = pile.LogLengthCm,
                CutDate = pile.CutDate,
                DryingMonths = pile.DryingMonths,
                IsArchived = pile.IsArchived,
                CreatedAt = pile.CreatedAt,
                SpaceId = pile.SpaceId,
                SpaceName = row.SpaceName,
                ZoneId = pile.ZoneId,
                ZoneName = row.ZoneName,
                RemainingSteres = WoodPileCalculator.RemainingSteres(
                    pile.InitialSteres, movements.GetValueOrDefault(pile.Id) ?? []),
                DryingStatus = drying.Status,
                ReadyOn = drying.ReadyOn
            };
        }).ToList();
    }

    public async Task<List<WoodPileResponseDto>> GetAllAsync(
        int? spaceId = null,
        int? zoneId = null,
        bool includeArchived = false,
        CancellationToken cancellationToken = default)
    {
        var query = _db.WoodPiles.AsNoTracking().AsQueryable();

        if (spaceId.HasValue)
        {
            query = query.Where(pile => pile.SpaceId == spaceId.Value);
        }

        if (zoneId.HasValue)
        {
            query = query.Where(pile => pile.ZoneId == zoneId.Value);
        }

        if (!includeArchived)
        {
            query = query.Where(pile => !pile.IsArchived && !pile.Space.IsArchived);
        }

        var ordered = query
            .OrderBy(pile => pile.Space.Name)
            .ThenBy(pile => pile.Zone!.Name)
            .ThenBy(pile => pile.Name);

        return await ToDtosAsync(await Project(ordered).ToListAsync(cancellationToken), cancellationToken);
    }

    public async Task<WoodPileResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var row = await Project(_db.WoodPiles.AsNoTracking().Where(pile => pile.Id == id))
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw NotFoundException.For("WoodPile", id);

        return (await ToDtosAsync([row], cancellationToken)).Single();
    }

    public async Task<WoodPileResponseDto> CreateAsync(SaveWoodPileDto dto, CancellationToken cancellationToken = default)
    {
        await EnsurePlacementIsValidAsync(dto.SpaceId, dto.ZoneId, isNewToSpace: true, cancellationToken);

        var pile = new WoodPile
        {
            SpaceId = dto.SpaceId,
            ZoneId = dto.ZoneId,
            IsArchived = false,
            CreatedAt = _timeProvider.GetUtcNow()
        };

        Apply(dto, pile);

        _db.WoodPiles.Add(pile);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(pile.Id, cancellationToken);
    }

    public async Task<WoodPileResponseDto> UpdateAsync(int id, SaveWoodPileDto dto, CancellationToken cancellationToken = default)
    {
        var pile = await _db.WoodPiles.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("WoodPile", id);

        await EnsurePlacementIsValidAsync(
            dto.SpaceId,
            dto.ZoneId,
            isNewToSpace: dto.SpaceId != pile.SpaceId,
            cancellationToken);

        var movements = await WoodMovements.LoadAsync(_db, [id], excludingEntryId: null, cancellationToken);
        var stock = WoodPileCalculator.RemainingSteres(
            dto.InitialSteres!.Value, movements.GetValueOrDefault(id) ?? []);

        if (stock < 0)
        {
            throw new BusinessRuleException(
                $"Un volume initial de {dto.InitialSteres} stères est inférieur à ce qui a déjà été " +
                $"consommé : le stock du tas « {pile.Name} » passerait à {stock} stères.");
        }

        if (pile.SpaceId != dto.SpaceId || pile.ZoneId != dto.ZoneId)
        {
            await ItemPlacement.MoveHistoryAsync(_db, id, dto.SpaceId, dto.ZoneId, cancellationToken);
        }

        Apply(dto, pile);
        pile.SpaceId = dto.SpaceId;
        pile.ZoneId = dto.ZoneId;

        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<WoodPileResponseDto> SetArchivedAsync(int id, bool isArchived, CancellationToken cancellationToken = default)
    {
        var pile = await _db.WoodPiles.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("WoodPile", id);

        pile.IsArchived = isArchived;
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var pile = await _db.WoodPiles.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken)
            ?? throw NotFoundException.For("WoodPile", id);

        // Ses entrées de journal et ses tâches partent avec le tas, par la cascade de GardenDbContext.
        _db.WoodPiles.Remove(pile);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static void Apply(SaveWoodPileDto dto, WoodPile pile)
    {
        pile.Name = Text.Required(dto.Name, "Nom");
        pile.WoodSpecies = Text.Optional(dto.WoodSpecies);
        pile.InitialSteres = dto.InitialSteres!.Value;
        pile.LogLengthCm = dto.LogLengthCm;
        pile.CutDate = dto.CutDate!.Value;
        pile.DryingMonths = dto.DryingMonths!.Value;
    }

    private Task EnsurePlacementIsValidAsync(
        int spaceId,
        int? zoneId,
        bool isNewToSpace,
        CancellationToken cancellationToken)
        => ItemPlacement.EnsureValidAsync(
            _db, spaceId, zoneId, isNewToSpace, kind => kind.AcceptsWoodPiles(), WoodPileNoun, cancellationToken);
}
