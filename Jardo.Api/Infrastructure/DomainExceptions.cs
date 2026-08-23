namespace Jardo.Api.Infrastructure;

/// <summary>
/// Levée quand une ressource demandée n'existe pas. Traduite en <b>404 Not Found</b>
/// par <see cref="GlobalExceptionHandler"/>.
/// </summary>
/// <remarks>
/// Pourquoi une exception plutôt qu'un retour null que le contrôleur testerait ?
/// Parce qu'un service ne doit rien connaître de HTTP : il ne peut pas renvoyer
/// « NotFound() », qui est une notion du protocole, pas du métier. En levant une
/// exception métier, le service dit « cette plante n'existe pas » et c'est une seule
/// classe, au bord de l'application, qui décide que cela se traduit par un 404.
///
/// Le prix à payer est connu : une exception coûte plus cher qu'un retour de valeur.
/// À l'échelle d'un potager c'est parfaitement indolore, et le gain de lisibilité est
/// immédiat — plus aucun « if (x is null) return NotFound(); » répété dans chaque action.
/// </remarks>
public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message)
    {
    }

    /// <summary>
    /// Raccourci pour le cas courant : « Plant 42 est introuvable. »
    /// </summary>
    /// <param name="resource">Nom de la ressource, ex. « Plant ».</param>
    /// <param name="id">Identifiant recherché.</param>
    public static NotFoundException For(string resource, int id)
        => new($"{resource} {id} est introuvable.");
}

/// <summary>
/// Levée quand une règle métier interdit l'opération demandée : supprimer une zone
/// qui contient des plantes, rattacher une plante à une zone inexistante…
/// Traduite en <b>400 Bad Request</b>.
/// </summary>
/// <remarks>
/// À distinguer de la validation des DataAnnotations, qui vérifie la <i>forme</i> de la
/// requête (champ manquant, texte trop long) et qui est faite automatiquement par
/// ASP.NET Core avant même que le contrôleur ne soit appelé. Ici, la requête est bien
/// formée : c'est l'état de la base qui rend l'opération impossible. Ce contrôle-là ne
/// peut être fait que par un service, car lui seul peut interroger la base.
/// </remarks>
public class BusinessRuleException : Exception
{
    public BusinessRuleException(string message) : base(message)
    {
    }
}
