namespace Jardo.Api.Models;

public enum DryingStatus
{
    Drying = 0,
    Ready = 1
}

/// <summary>L'état de séchage d'un tas à une date donnée. Jamais stocké.</summary>
/// <param name="Status">En séchage, ou prêt à brûler.</param>
/// <param name="ReadyOn">
/// Le jour où le bois est prêt : futur ou aujourd'hui pour un tas prêt dès aujourd'hui, passé pour un
/// tas prêt depuis. Ce jour-là, le bois est déjà prêt.
/// </param>
public record DryingState(DryingStatus Status, DateOnly ReadyOn);

/// <summary>Un apport ou une consommation de bois, tels que notés au journal.</summary>
public readonly record struct WoodMovement(JournalEntryKind Kind, double Steres);
