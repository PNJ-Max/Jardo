using Jardo.Api.Dtos;

namespace Jardo.Api.Services;

/// <summary>
/// Le jardin, unique au MVP.
/// </summary>
public interface IGardenService
{
    Task<GardenResponseDto> GetAsync(CancellationToken cancellationToken = default);

    Task<GardenResponseDto> UpdateAsync(UpdateGardenDto dto, CancellationToken cancellationToken = default);
}
