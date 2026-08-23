namespace Jardo.Api.Models;

/// <summary>
/// Une zone du potager : un carré, une plate-bande, une serre…
/// C'est le conteneur logique des plantes.
/// </summary>
public class Zone
{
    /// <summary>Clé primaire. EF Core la détecte par convention (propriété nommée "Id").</summary>
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    // DateTimeOffset et non DateTime : il porte le décalage horaire, donc on sait
    // toujours à quel instant réel il correspond. DateTime, lui, ne dit pas s'il
    // est en heure locale ou UTC — source classique de bugs au changement d'heure.
    public DateTimeOffset CreatedAt { get; set; }

    // Propriété de navigation : la liste des plantes de cette zone.
    // Elle n'existe pas en base (il n'y a pas de colonne "Plants" dans la table Zones) :
    // c'est EF Core qui la remplit à partir de la clé étrangère Plant.ZoneId.
    // Initialisée à une liste vide pour ne jamais avoir à tester le null.
    public ICollection<Plant> Plants { get; set; } = new List<Plant>();
}
