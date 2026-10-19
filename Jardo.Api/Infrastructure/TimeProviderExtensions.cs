namespace Jardo.Api.Infrastructure;

public static class TimeProviderExtensions
{
    /// <summary>
    /// La date du jour en heure locale : « aujourd'hui » est celui du jardinier, pas celui d'UTC.
    /// Dépend du fuseau de la machine ; à rendre configurable si l'API est hébergée.
    /// </summary>
    public static DateOnly Today(this TimeProvider timeProvider)
        => DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime);

    /// <summary>Le jour local d'un instant enregistré, dans le même fuseau que <see cref="Today"/>.</summary>
    public static DateOnly LocalDate(this TimeProvider timeProvider, DateTimeOffset instant)
        => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, timeProvider.LocalTimeZone).DateTime);
}
