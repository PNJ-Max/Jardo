using Jardo.Api.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Tests;

/// <summary>
/// Base SQLite en mémoire, neuve pour chaque test. Le provider InMemory d'EF Core est écarté :
/// il ignore contraintes et index uniques, et laisse passer des requêtes intraduisibles en SQL.
/// </summary>
public sealed class TestDatabase : IDisposable
{
    // La connexion doit rester ouverte : la base en mémoire disparaît avec elle.
    private readonly SqliteConnection _connection;

    public GardenDbContext Context { get; }

    public TestDatabase()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<GardenDbContext>()
            .UseSqlite(_connection)
            .Options;

        Context = new GardenDbContext(options);

        Context.Database.EnsureCreated();
    }

    public void Dispose()
    {
        Context.Dispose();
        _connection.Dispose();
    }
}
