namespace Jardo.Api.Infrastructure;

/// <summary>
/// Petit confort autour de <see cref="TimeProvider"/>.
/// </summary>
/// <remarks>
/// TimeProvider est la classe abstraite fournie par .NET pour lire l'heure. Pourquoi ne
/// pas simplement appeler DateTime.Now ? Parce qu'un appel direct à l'horloge système est
/// impossible à contrôler depuis un test : on ne peut pas écrire « étant donné qu'on est
/// le 15 juin » si le code lit la vraie date.
///
/// En injectant TimeProvider, le code de production reçoit TimeProvider.System (la vraie
/// horloge) et les tests reçoivent une horloge figée sur la date de leur choix. C'est le
/// même principe que pour la base de données : on dépend d'une abstraction, pas de la
/// ressource concrète.
/// </remarks>
public static class TimeProviderExtensions
{
    /// <summary>
    /// La date du jour, en heure locale.
    /// </summary>
    /// <remarks>
    /// Heure locale et non UTC, volontairement : le potager est à un endroit précis, et
    /// « aujourd'hui » pour le jardinier est le jour de son fuseau, pas celui de Greenwich.
    /// Sans cela, entre minuit et 2 h du matin en été, l'API considérerait qu'on est encore
    /// la veille.
    ///
    /// Limite connue : cela dépend du fuseau de la machine qui exécute le code. Tant que
    /// l'API tourne en local, c'est exactement ce qu'on veut. Le jour où elle sera
    /// hébergée (potentiellement sur un serveur en UTC), il faudra rendre le fuseau du
    /// jardin explicite en configuration.
    /// </remarks>
    public static DateOnly Today(this TimeProvider timeProvider)
        => DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime);
}
