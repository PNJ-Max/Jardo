using Jardo.Api.Dtos;
using Jardo.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Jardo.Api.Controllers;

/// <summary>
/// Arrosages : ce qui a été fait, et ce qui reste à faire.
/// </summary>
/// <remarks>
/// Contrôleur séparé de PlantsController alors que ses routes commencent par
/// /api/plants. C'est délibéré : il regroupe ce qui relève d'IWateringService, là où
/// PlantsController regroupe ce qui relève d'IPlantService. Un contrôleur par service
/// plutôt qu'un contrôleur par préfixe d'URL — sinon PlantsController finirait par
/// dépendre de trois services et par mélanger trois sujets.
///
/// Effet secondaire agréable : Swagger regroupe les endpoints par contrôleur, la
/// documentation est donc déjà organisée par thème.
/// </remarks>
[ApiController]
[Route("api")]
[Produces("application/json")]
public class WateringsController : ControllerBase
{
    private readonly IWateringService _wateringService;

    public WateringsController(IWateringService wateringService)
    {
        _wateringService = wateringService;
    }

    /// <summary>
    /// Les plantes à arroser aujourd'hui, les plus en retard d'abord.
    /// </summary>
    /// <remarks>
    /// C'est l'endpoint qui alimentera l'écran d'accueil de l'application : la réponse à
    /// la seule question qui compte quand on ouvre l'app le matin.
    /// </remarks>
    [HttpGet("watering/needed")]
    [ProducesResponseType<List<PlantResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<PlantResponseDto>>> GetPlantsNeedingWater(CancellationToken cancellationToken)
        => await _wateringService.GetPlantsNeedingWaterAsync(cancellationToken);

    /// <summary>
    /// Historique des arrosages d'une plante, du plus récent au plus ancien.
    /// </summary>
    [HttpGet("plants/{plantId:int}/waterings")]
    [ProducesResponseType<List<WateringLogResponseDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<WateringLogResponseDto>>> GetHistory(
        int plantId,
        CancellationToken cancellationToken)
        => await _wateringService.GetHistoryAsync(plantId, cancellationToken);

    /// <summary>
    /// Enregistre l'arrosage d'une plante.
    /// </summary>
    /// <remarks>
    /// Le corps de la requête est entièrement optionnel : un POST avec « {} » enregistre
    /// un arrosage à la date du jour, ce qui est le cas d'usage courant. Une date passée
    /// est acceptée (saisie oubliée de la veille), une date future est refusée.
    /// </remarks>
    [HttpPost("plants/{plantId:int}/waterings")]
    [ProducesResponseType<WateringLogResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WateringLogResponseDto>> WaterPlant(
        int plantId,
        CreateWateringDto dto,
        CancellationToken cancellationToken)
    {
        var log = await _wateringService.WaterPlantAsync(plantId, dto, cancellationToken);

        // CreatedAtAction pointe vers l'historique et non vers l'arrosage seul : il n'y a
        // pas d'endpoint « un arrosage par son id », et il n'y a pas de raison d'en créer
        // un que personne n'appellerait. On renvoie l'URL réellement utile.
        return CreatedAtAction(nameof(GetHistory), new { plantId }, log);
    }
}
