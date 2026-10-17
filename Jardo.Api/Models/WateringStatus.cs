namespace Jardo.Api.Models;

/// <summary>
/// Le voyant d'arrosage d'une plante. Recalculé à chaque lecture, jamais persisté.
/// </summary>
public enum WateringStatus
{
    /// <summary>Vert : la prochaine échéance est dans le futur.</summary>
    Ok = 0,

    /// <summary>Orange : l'échéance est aujourd'hui.</summary>
    DueSoon = 1,

    /// <summary>Rouge : l'échéance est dépassée.</summary>
    Overdue = 2
}
