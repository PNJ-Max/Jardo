namespace Jardo.Api.Tests;

/// <summary>Horloge figée pour des tests reproductibles.</summary>
public class FakeTimeProvider : TimeProvider
{
    private readonly DateTimeOffset _now;

    public FakeTimeProvider(DateTimeOffset now)
    {
        _now = now;
    }

    /// <summary>Horloge figée à minuit, à la date indiquée.</summary>
    public FakeTimeProvider(DateOnly today)
        : this(new DateTimeOffset(today.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero))
    {
    }

    public override DateTimeOffset GetUtcNow() => _now;

    // Fuseau forcé à UTC : sinon Today() dépendrait du fuseau de la machine qui exécute les tests.
    public override TimeZoneInfo LocalTimeZone => TimeZoneInfo.Utc;
}
