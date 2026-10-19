using Jardo.Api.Data;
using Jardo.Api.Dtos;
using Jardo.Api.Infrastructure;
using Jardo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Services;

/// <inheritdoc cref="IGardenService"/>
public class GardenService : IGardenService
{
    private readonly GardenDbContext _db;

    public GardenService(GardenDbContext db)
    {
        _db = db;
    }

    public async Task<GardenResponseDto> GetAsync(CancellationToken cancellationToken = default)
    {
        var garden = await _db.Gardens
            .AsNoTracking()
            .SingleAsync(candidate => candidate.Id == Garden.DefaultId, cancellationToken);

        return GardenResponseDto.FromEntity(garden);
    }

    public async Task<GardenResponseDto> UpdateAsync(UpdateGardenDto dto, CancellationToken cancellationToken = default)
    {
        var garden = await _db.Gardens
            .SingleAsync(candidate => candidate.Id == Garden.DefaultId, cancellationToken);

        garden.Name = Text.Required(dto.Name, "Nom");
        await _db.SaveChangesAsync(cancellationToken);

        return GardenResponseDto.FromEntity(garden);
    }
}
