using Jardo.Api.Dtos;
using Jardo.Api.Models;

namespace Jardo.Api.Services;

/// <summary>
/// Une plante accompagnée des deux informations qu'il faut toujours aller chercher
/// avec elle : le nom de sa zone, et la date de son dernier arrosage.
/// </summary>
/// <param name="Plant">L'entité plante.</param>
/// <param name="ZoneName">Nom de la zone parente.</param>
/// <param name="LastWateredAt">Dernier arrosage, ou null si la plante n'a jamais été arrosée.</param>
public record PlantWithWatering(Plant Plant, string ZoneName, DateOnly? LastWateredAt);

/// <summary>
/// Briques de requête réutilisables autour des plantes.
/// </summary>
/// <remarks>
/// Ces méthodes sont des extensions d'<see cref="IQueryable{T}"/>, et c'est tout
/// l'intérêt : elles ne déclenchent aucun accès à la base. Elles ajoutent un morceau à
/// une requête encore en construction, et c'est seulement au ToListAsync() final
/// qu'EF Core traduit l'ensemble en une seule instruction SQL.
///
/// Concrètement, on peut écrire :
///     _db.Plants.Where(p => !p.IsArchived).OrderBy(p => p.Name).SelectWithWatering()
/// et obtenir une requête unique. Si ces méthodes renvoyaient des listes, chaque étape
/// ferait son propre aller-retour vers la base.
///
/// Sans ce regroupement, la projection ci-dessous serait recopiée dans PlantService et
/// dans WateringService, avec la garantie qu'elles finiraient par diverger.
/// </remarks>
public static class PlantQueries
{
    /// <summary>
    /// Complète chaque plante de la requête avec le nom de sa zone et son dernier arrosage.
    /// </summary>
    public static IQueryable<PlantWithWatering> SelectWithWatering(this IQueryable<Plant> query)
        => query.Select(plant => new PlantWithWatering(
            plant,
            plant.Zone.Name,
            // Max sur une collection de navigation devient une sous-requête SQL corrélée
            // (SELECT MAX(WateredAt) FROM WateringLogs WHERE PlantId = ...).
            //
            // Le cast en DateOnly? est indispensable : sans lui, une plante sans aucun
            // arrosage ferait échouer Max, qui ne sait pas quoi renvoyer pour un ensemble
            // vide. Avec le type nullable, le résultat est simplement null.
            plant.WateringLogs.Max(log => (DateOnly?)log.WateredAt)));

    /// <summary>
    /// Transforme le résultat de la requête en DTO, voyant d'arrosage calculé.
    /// </summary>
    /// <param name="row">La plante et ses informations d'arrosage.</param>
    /// <param name="today">Date du jour, fournie par l'appelant (voir WateringCalculator).</param>
    public static PlantResponseDto ToDto(this PlantWithWatering row, DateOnly today)
    {
        var state = WateringCalculator.Calculate(
            row.Plant.WateringIntervalDays,
            row.LastWateredAt,
            row.Plant.PlantedDate,
            today);

        return PlantResponseDto.FromEntity(row.Plant, state, row.ZoneName);
    }
}
