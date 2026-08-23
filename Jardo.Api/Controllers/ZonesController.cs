using Jardo.Api.Dtos;
using Jardo.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Jardo.Api.Controllers;

/// <summary>
/// Les zones du potager : carrés, plates-bandes, serre.
/// </summary>
/// <remarks>
/// À observer dans ce fichier : il n'y a aucun try/catch et aucun
/// « if (zone is null) return NotFound() ». Les services lèvent des exceptions métier,
/// et GlobalExceptionHandler les traduit en 404 ou 400. Le contrôleur ne s'occupe donc
/// que du chemin heureux, ce qui le rend lisible d'un coup d'œil.
/// </remarks>
[ApiController]
[Route("api/zones")]
[Produces("application/json")]
public class ZonesController : ControllerBase
{
    private readonly IZoneService _zoneService;
    private readonly IWateringService _wateringService;

    // Injection par constructeur : on déclare ce dont on a besoin, et le conteneur de
    // dépendances fournit les instances. On n'écrit jamais « new ZoneService(...) » —
    // sinon il faudrait aussi construire le DbContext, donc connaître la chaîne de
    // connexion... et le contrôleur deviendrait responsable de tout.
    public ZonesController(IZoneService zoneService, IWateringService wateringService)
    {
        _zoneService = zoneService;
        _wateringService = wateringService;
    }

    /// <summary>
    /// Liste toutes les zones, avec le nombre de plantes et le nombre de plantes à arroser.
    /// </summary>
    [HttpGet]
    [ProducesResponseType<List<ZoneResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ZoneResponseDto>>> GetZones(CancellationToken cancellationToken)
        => await _zoneService.GetAllAsync(cancellationToken);

    /// <summary>
    /// Récupère une zone par son identifiant.
    /// </summary>
    // Le nom de l'action est fixé explicitement : c'est lui que CreatedAtAction utilise
    // plus bas pour construire l'en-tête Location. Le figer évite qu'un renommage de la
    // méthode C# ne casse silencieusement la réponse de création.
    [HttpGet("{id:int}", Name = nameof(GetZone))]
    [ProducesResponseType<ZoneResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ZoneResponseDto>> GetZone(int id, CancellationToken cancellationToken)
        => await _zoneService.GetByIdAsync(id, cancellationToken);

    /// <summary>
    /// Crée une zone. Le nom doit être unique.
    /// </summary>
    [HttpPost]
    [ProducesResponseType<ZoneResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ZoneResponseDto>> CreateZone(
        CreateZoneDto dto,
        CancellationToken cancellationToken)
    {
        var zone = await _zoneService.CreateAsync(dto, cancellationToken);

        // 201 Created, et pas 200 : le code de statut fait partie du contrat. Le client
        // apprend ainsi qu'une ressource a été créée, et l'en-tête Location lui donne son
        // URL — il n'a pas à la reconstruire lui-même à partir de l'id.
        return CreatedAtAction(nameof(GetZone), new { id = zone.Id }, zone);
    }

    /// <summary>
    /// Modifie une zone existante.
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType<ZoneResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ZoneResponseDto>> UpdateZone(
        int id,
        UpdateZoneDto dto,
        CancellationToken cancellationToken)
        => await _zoneService.UpdateAsync(id, dto, cancellationToken);

    /// <summary>
    /// Supprime une zone. Refusé si elle contient encore des plantes.
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteZone(int id, CancellationToken cancellationToken)
    {
        await _zoneService.DeleteAsync(id, cancellationToken);

        // 204 No Content : l'opération a réussi et il n'y a rien à renvoyer.
        return NoContent();
    }

    /// <summary>
    /// Arrose toutes les plantes actives de la zone en une seule opération.
    /// </summary>
    /// <remarks>
    /// C'est le geste réel du jardinier : on arrose un carré, pas une plante à la fois.
    /// L'API crée malgré tout un enregistrement par plante, pour que chacune garde son
    /// propre historique.
    /// </remarks>
    [HttpPost("{id:int}/waterings")]
    [ProducesResponseType<ZoneWateringResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ZoneWateringResultDto>> WaterZone(
        int id,
        CreateWateringDto dto,
        CancellationToken cancellationToken)
        => await _wateringService.WaterZoneAsync(id, dto, cancellationToken);
}
