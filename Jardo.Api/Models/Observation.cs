namespace Jardo.Api.Models;

/// <summary>
/// Une entrée du journal de suivi d'une plante.
/// </summary>
/// <remarks>
/// Choix de modélisation à connaître : c'est une <b>seule</b> entité, et non trois
/// (journal / mesure / problème). Les trois partagent exactement la même structure —
/// une plante, une date, du texte — et surtout on les saisit d'un seul geste dans la
/// vraie vie : « 20 cm, feuilles jaunes, traité au savon noir ». Trois tables
/// auraient imposé trois écrans pour une seule action.
///
/// La photo est volontairement absente du MVP. L'ajouter plus tard sera une migration
/// d'une seule colonne, sans toucher au reste.
/// </remarks>
public class Observation
{
    public int Id { get; set; }

    public int PlantId { get; set; }

    public Plant Plant { get; set; } = null!;

    /// <summary>Jour de l'observation.</summary>
    public DateOnly ObservedAt { get; set; }

    /// <summary>Note libre : c'est le seul champ obligatoire d'une observation.</summary>
    public string Note { get; set; } = string.Empty;

    /// <summary>Hauteur mesurée en centimètres, si on a pris la mesure.</summary>
    public int? HeightCm { get; set; }

    /// <summary>Description du problème constaté (maladie, parasite, carence…).</summary>
    public string? ProblemNote { get; set; }

    /// <summary>Traitement appliqué en réponse au problème.</summary>
    public string? Treatment { get; set; }
}
