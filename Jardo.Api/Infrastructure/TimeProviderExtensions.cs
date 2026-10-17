namespace Jardo.Api.Infrastructure;

public static class TimeProviderExtensions
{
    /// <summary>
    /// La date du jour en heure locale : « aujourd'hui » est celui du jardinier, pas celui d'UTC.
    /// Dépend du fuseau de la machine ; à rendre configurable si l'API est hébergée.
    /// </summary>
    public static DateOnly Today(this TimeProvider timeProvider)
        => DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime);
}
