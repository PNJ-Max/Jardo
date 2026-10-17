namespace Jardo.Api.Infrastructure;

/// <summary>
/// Normalisation des chaînes reçues. Les DataAnnotations valident la forme mais ne
/// retirent pas les espaces : " Potager " serait enregistré tel quel et échapperait à l'index unique.
/// </summary>
public static class Text
{
    public static string Required(string value, string fieldName)
    {
        var trimmed = value.Trim();

        if (trimmed.Length == 0)
        {
            throw new BusinessRuleException($"Le champ « {fieldName} » ne peut pas être vide.");
        }

        return trimmed;
    }

    /// <summary>Une chaîne vide ou blanche devient null : une seule représentation de « pas de valeur ».</summary>
    public static string? Optional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }
}
