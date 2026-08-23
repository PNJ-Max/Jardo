using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Jardo.Api.Infrastructure;

/// <summary>
/// Point unique de traduction des exceptions en réponses HTTP.
/// </summary>
/// <remarks>
/// Branché dans Program.cs par AddExceptionHandler + UseExceptionHandler. ASP.NET Core
/// l'appelle pour toute exception qui remonte jusqu'au bord de l'application.
///
/// Les réponses respectent le format <b>ProblemDetails</b> (RFC 9457) : le standard des
/// erreurs d'API HTTP, avec des champs attendus (type, title, status, detail). Cela évite
/// d'inventer un format maison et donne au front une structure d'erreur unique à gérer,
/// quelle que soit la cause.
/// </remarks>
public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly IProblemDetailsService _problemDetailsService;
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(
        IProblemDetailsService problemDetailsService,
        ILogger<GlobalExceptionHandler> logger)
    {
        _problemDetailsService = problemDetailsService;
        _logger = logger;
    }

    /// <summary>
    /// Tente de traduire l'exception en réponse.
    /// </summary>
    /// <returns>
    /// true si la réponse a été écrite. Renvoyer false laisserait ASP.NET Core
    /// poursuivre avec son propre traitement — ici on gère tous les cas, donc toujours true.
    /// </returns>
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        // Le "switch expression" associe à chaque type d'exception son code HTTP,
        // son titre, et le message à exposer au client.
        var (statusCode, title, detail) = exception switch
        {
            NotFoundException => (
                StatusCodes.Status404NotFound,
                "Ressource introuvable",
                exception.Message),

            BusinessRuleException => (
                StatusCodes.Status400BadRequest,
                "Opération refusée",
                exception.Message),

            // Cas non prévu : c'est un bug. On journalise la trace complète côté serveur,
            // mais on ne renvoie SURTOUT PAS exception.Message au client — un message
            // d'exception .NET expose des noms de tables, des chemins de fichiers, parfois
            // des fragments de requête SQL. C'est une fuite d'information exploitable.
            _ => (
                StatusCodes.Status500InternalServerError,
                "Erreur interne",
                "Une erreur inattendue est survenue.")
        };

        // Les erreurs métier (4xx) sont des situations normales : l'utilisateur a demandé
        // quelque chose d'impossible. On les journalise en Warning. Les 5xx sont des bugs :
        // niveau Error, avec l'exception complète pour pouvoir déboguer.
        if (statusCode >= StatusCodes.Status500InternalServerError)
        {
            _logger.LogError(exception, "Exception non gérée sur {Method} {Path}",
                httpContext.Request.Method, httpContext.Request.Path);
        }
        else
        {
            _logger.LogWarning("{Title} sur {Method} {Path} : {Detail}",
                title, httpContext.Request.Method, httpContext.Request.Path, exception.Message);
        }

        // Il faut définir le code de statut avant d'écrire le corps : une fois la réponse
        // commencée, les en-têtes sont partis et le statut ne peut plus être changé.
        httpContext.Response.StatusCode = statusCode;

        return await _problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = new ProblemDetails
            {
                Status = statusCode,
                Title = title,
                Detail = detail,
                // Rappel de l'URL fautive : utile quand l'erreur est remontée
                // dans un rapport de bug sans le contexte de la requête.
                Instance = $"{httpContext.Request.Method} {httpContext.Request.Path}"
            }
        });
    }
}
