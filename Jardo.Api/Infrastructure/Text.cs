namespace Jardo.Api.Infrastructure;

/// <summary>
/// Nettoyage des chaînes reçues de l'extérieur.
/// </summary>
/// <remarks>
/// Ce que les attributs de validation font déjà, et qu'il est inutile de refaire ici :
/// [Required] rejette bien une chaîne vide ET une chaîne d'espaces. Contrairement à ce
/// qu'on suppose souvent, RequiredAttribute applique un Trim() sur la valeur avant de
/// tester sa longueur (dès lors que sa propriété AllowEmptyStrings vaut false, ce qui
/// est son défaut). Un JSON contenant "name": "   " reçoit donc un 400 sans que le
/// service soit même appelé.
///
/// Ce que les attributs NE font pas, et qui justifie ces méthodes : <b>normaliser</b>.
/// La chaîne " Potager " passe toutes les validations et serait enregistrée telle
/// quelle, espaces compris. On obtiendrait alors en base un nom visuellement identique
/// à "Potager" mais différent pour la machine — l'index unique ne verrait aucun doublon,
/// et une recherche sur "Potager" ne trouverait rien.
///
/// La règle générale : les attributs valident la <i>forme</i> de ce qui arrive, le
/// service décide de la <i>valeur exacte</i> qui est enregistrée. La vérification du
/// vide ci-dessous est donc une ceinture de sécurité (une donnée peut venir d'un import
/// ou d'un test, sans passer par la validation MVC), pas la protection principale.
/// </remarks>
public static class Text
{
    /// <summary>
    /// Nettoie une chaîne obligatoire et refuse le résultat vide.
    /// </summary>
    /// <param name="value">La valeur reçue.</param>
    /// <param name="fieldName">Nom du champ, pour un message d'erreur exploitable.</param>
    /// <exception cref="BusinessRuleException">Si la valeur ne contient que des espaces.</exception>
    public static string Required(string value, string fieldName)
    {
        var trimmed = value.Trim();

        if (trimmed.Length == 0)
        {
            throw new BusinessRuleException($"Le champ « {fieldName} » ne peut pas être vide.");
        }

        return trimmed;
    }

    /// <summary>
    /// Nettoie une chaîne optionnelle. Une chaîne vide ou blanche devient null.
    /// </summary>
    /// <remarks>
    /// Ramener "" et " " à null évite d'avoir deux représentations de « pas de valeur »
    /// en base. Sans cela, un filtre « description non renseignée » devrait tester le
    /// null ET la chaîne vide — et un des deux sera oublié un jour.
    /// </remarks>
    public static string? Optional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }
}
