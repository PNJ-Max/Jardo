namespace Jardo.Api.Tests;

/// <summary>
/// Une horloge figée, pour les tests.
/// </summary>
/// <remarks>
/// C'est tout l'intérêt d'avoir injecté TimeProvider dans les services au lieu
/// d'appeler DateTime.Now : on peut lui substituer cette classe et décider qu'on est
/// le 15 juin 2026. Un test comme « une plante arrosée il y a 5 jours avec un
/// intervalle de 2 est en retard de 3 jours » devient alors reproductible — il donnera
/// le même résultat aujourd'hui, demain, et dans deux ans sur la machine d'un collègue.
///
/// Microsoft fournit un équivalent plus complet dans le paquet
/// Microsoft.Extensions.TimeProvider.Testing (avec avance manuelle du temps, gestion
/// des minuteurs...). Ces quinze lignes suffisent ici, et elles ont l'avantage de
/// montrer qu'un « mock » n'est rien de plus qu'une implémentation alternative.
/// </remarks>
public class FakeTimeProvider : TimeProvider
{
    private readonly DateTimeOffset _now;

    public FakeTimeProvider(DateTimeOffset now)
    {
        _now = now;
    }

    /// <summary>Construit une horloge figée à minuit, à la date indiquée.</summary>
    public FakeTimeProvider(DateOnly today)
        : this(new DateTimeOffset(today.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero))
    {
    }

    public override DateTimeOffset GetUtcNow() => _now;

    // Le fuseau est forcé à UTC pour que GetLocalNow() renvoie exactement _now.
    // Sans cela, TimeProviderExtensions.Today() décalerait la date selon le fuseau de
    // la machine qui exécute les tests — et un test qui passe à Bruxelles échouerait
    // sur un serveur d'intégration configuré en UTC.
    public override TimeZoneInfo LocalTimeZone => TimeZoneInfo.Utc;
}
