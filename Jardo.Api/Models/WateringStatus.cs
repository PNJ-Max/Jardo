namespace Jardo.Api.Models;

/// <summary>
/// État d'arrosage d'une plante — le « voyant » que le front affichera en couleur.
/// </summary>
/// <remarks>
/// Trois états plutôt qu'un simple booléen « à arroser » : le calcul est identique,
/// mais <see cref="DueSoon"/> permet de prévenir le jour même au lieu de ne signaler
/// qu'un retard déjà installé.
///
/// Le stockage n'est pas concerné : cet état n'est jamais enregistré en base, il est
/// recalculé à chaque lecture à partir du dernier arrosage et de l'intervalle. Une
/// valeur qui dépend de la date du jour ne doit jamais être persistée — elle serait
/// fausse dès le lendemain.
/// </remarks>
public enum WateringStatus
{
    /// <summary>Vert : la prochaine échéance est dans le futur.</summary>
    Ok = 0,

    /// <summary>Orange : l'échéance est aujourd'hui.</summary>
    DueSoon = 1,

    /// <summary>Rouge : l'échéance est dépassée.</summary>
    Overdue = 2
}
