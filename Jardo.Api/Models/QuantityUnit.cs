namespace Jardo.Api.Models;

/// <summary>Unité de la quantité d'une plante.</summary>
public enum QuantityUnit
{
    /// <summary>Pieds : arbres, arbustes ou plants, comptés un par un.</summary>
    Plants = 0,

    Rows = 1,

    SquareMeters = 2
}

public static class QuantityUnitExtensions
{
    /// <summary>On ne compte pas un demi-pied ; un demi-rang ou 1,5 m² ont un sens.</summary>
    public static bool Accepts(this QuantityUnit unit, double quantity)
        => quantity > 0 && (unit is not QuantityUnit.Plants || quantity == Math.Floor(quantity));
}
