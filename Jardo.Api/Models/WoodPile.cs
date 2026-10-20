namespace Jardo.Api.Models;

/// <summary>
/// Un tas de bois de chauffage, accepté uniquement dans un espace bois de chauffage. Son stock
/// restant et son état de séchage ne sont pas stockés : ils se calculent à la lecture
/// (<see cref="Services.WoodPileCalculator"/>).
/// </summary>
public class WoodPile : GardenItem
{
    // Nom distinct de Plant.Species : deux propriétés de même nom sur des types frères d'un TPH
    // ne partageraient pas leur colonne.
    /// <summary>Essence en texte libre : chêne, hêtre, charme…</summary>
    public string? WoodSpecies { get; set; }

    /// <summary>
    /// Volume du tas à sa constitution. Les apports et consommations notés au journal s'y ajoutent
    /// et s'en retranchent.
    /// </summary>
    public double InitialSteres { get; set; }

    public int? LogLengthCm { get; set; }

    public DateOnly CutDate { get; set; }

    /// <summary>Durée de séchage à partir de la coupe ; 0 pour du bois acheté sec.</summary>
    public int DryingMonths { get; set; }
}
