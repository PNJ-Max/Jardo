namespace Jardo.Api.Models;

/// <summary>Unité d'une quantité notée au journal : une récolte ou du bois.</summary>
public enum MeasureUnit
{
    Kilograms = 0,

    Grams = 1,

    /// <summary>À la pièce : 12 courgettes, 30 radis.</summary>
    Pieces = 2,

    /// <summary>Stères, l'unité du bois de chauffage.</summary>
    Steres = 3
}
