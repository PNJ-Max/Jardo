namespace Jardo.Api.Models;

/// <summary>
/// Une culture, un arbre ou un arbuste. Un pommier et un rang de carottes sont tous deux des
/// plantes : ce qui les distingue vient du type de leur espace. Une plante est un sujet seul ou
/// un groupe de sujets identiques suivis ensemble (« 3 pommiers Golden »), au choix de l'utilisateur.
/// </summary>
public class Plant : GardenItem
{
    /// <summary>Espèce en texte libre, nom courant ou botanique.</summary>
    public string? Species { get; set; }

    public string? Variety { get; set; }

    public double Quantity { get; set; } = 1;

    public QuantityUnit QuantityUnit { get; set; }

    public DateOnly? SownDate { get; set; }

    public DateOnly? PlantedDate { get; set; }

    public int WateringIntervalDays { get; set; }

    public ICollection<WateringLog> WateringLogs { get; set; } = new List<WateringLog>();

    public ICollection<Observation> Observations { get; set; } = new List<Observation>();
}
