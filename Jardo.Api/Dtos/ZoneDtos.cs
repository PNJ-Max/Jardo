using System.ComponentModel.DataAnnotations;
using Jardo.Api.Models;

namespace Jardo.Api.Dtos;

// Les DTOs d'une même ressource sont regroupés dans un fichier. La convention .NET
// habituelle est « un type par fichier », mais elle produit ici dix fichiers de quatre
// propriétés qu'il faut ouvrir un par un pour comprendre un seul contrat. Regrouper par
// ressource garde le contrat d'entrée et de sortie côte à côte, sous les yeux.

/// <summary>Corps de requête pour créer une zone.</summary>
public class CreateZoneDto
{
    // Sur la validation, trois points qui méritent d'être compris précisément.
    //
    // 1. Le projet a <Nullable>enable</Nullable>. Pour ASP.NET Core, une propriété de
    //    type "string" (non-nullable) est donc DÉJÀ implicitement obligatoire : envoyer
    //    un JSON sans "name" produit un 400 même sans le [Required] ci-dessous.
    //
    // 2. On garde quand même [Required] explicitement, pour que l'intention soit lisible
    //    dans la classe sans avoir à connaître ce comportement implicite du framework,
    //    et pour que le contrat ne dépende pas d'un réglage du fichier .csproj.
    //
    // 3. [Required] rejette aussi "" ET "   " — c'est le point contre-intuitif.
    //    RequiredAttribute applique un Trim() avant de tester la longueur, dès lors que
    //    sa propriété AllowEmptyStrings vaut false, ce qui est son défaut. Une chaîne
    //    d'espaces ne passe donc jamais.
    //
    // Ce qu'aucun attribut ne fait, en revanche : normaliser. " Potager " est valide et
    // serait enregistré avec ses espaces. C'est le rôle du Trim() côté service — voir
    // Infrastructure/Text.cs.
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }
}

/// <summary>Corps de requête pour modifier une zone.</summary>
public class UpdateZoneDto
{
    // À noter : pas de propriété Id ici, contrairement à un réflexe répandu.
    // La ressource est déjà identifiée par l'URL (PUT /api/zones/7). Répéter l'id dans
    // le corps crée une seconde source de vérité, donc la possibilité qu'elles se
    // contredisent — et donc un contrôle « if (id != dto.Id) return BadRequest() » à
    // écrire dans chaque action. Supprimer le champ supprime le problème.
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }
}

/// <summary>Représentation d'une zone renvoyée par l'API.</summary>
public class ZoneResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Nombre de plantes actives (non archivées) dans la zone.</summary>
    public int PlantCount { get; set; }

    /// <summary>
    /// Nombre de plantes de la zone dont l'arrosage est dû ou en retard.
    /// C'est ce compteur qui allumera le voyant de la zone côté front.
    /// </summary>
    /// <remarks>
    /// Calculé par l'API et non reconstitué par le front : sinon, afficher la liste des
    /// zones obligerait à charger toutes les plantes de toutes les zones pour compter.
    /// </remarks>
    public int PlantsNeedingWater { get; set; }

    /// <summary>
    /// Construit le DTO à partir de l'entité.
    /// </summary>
    /// <remarks>
    /// Mapping écrit à la main, volontairement. Une bibliothèque comme AutoMapper
    /// supprimerait ces quelques lignes, mais au prix d'un mapping invisible : plus
    /// moyen de savoir en lisant le code quel champ va où, ni de poser un point d'arrêt.
    /// À cette échelle, l'explicite gagne.
    /// </remarks>
    public static ZoneResponseDto FromEntity(Zone zone, int plantCount, int plantsNeedingWater) => new()
    {
        Id = zone.Id,
        Name = zone.Name,
        Description = zone.Description,
        CreatedAt = zone.CreatedAt,
        PlantCount = plantCount,
        PlantsNeedingWater = plantsNeedingWater
    };
}
