namespace Jardo.Api.Models;

/// <summary>
/// Trace d'un arrosage effectué. C'est un journal en ajout seul :
/// on n'écrase jamais une ligne, on en ajoute une nouvelle à chaque arrosage.
/// La date du dernier arrosage se déduit donc toujours de la ligne la plus récente.
/// </summary>
public class WateringLog
{
    public int Id { get; set; }

    public int PlantId { get; set; }

    public Plant Plant { get; set; } = null!;

    /// <summary>
    /// Jour de l'arrosage. DateOnly plutôt qu'un instant : le calcul du prochain
    /// arrosage se fait en jours, et manipuler des heures n'apporterait que des
    /// problèmes de fuseau horaire pour aucun gain.
    /// </summary>
    public DateOnly WateredAt { get; set; }

    public string? Note { get; set; }
}
