namespace Jardo.Api.Infrastructure;

/// <summary>
/// Ressource introuvable. Traduite en 404 par <see cref="GlobalExceptionHandler"/> :
/// les services ne connaissent pas HTTP.
/// </summary>
public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message)
    {
    }

    public static NotFoundException For(string resource, int id)
        => new($"{resource} {id} est introuvable.");
}

/// <summary>
/// Règle métier violée par une requête pourtant bien formée (la forme est validée en amont
/// par les DataAnnotations). Traduite en 400.
/// </summary>
public class BusinessRuleException : Exception
{
    public BusinessRuleException(string message) : base(message)
    {
    }
}
