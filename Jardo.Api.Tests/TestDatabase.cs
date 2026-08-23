using Jardo.Api.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Jardo.Api.Tests;

/// <summary>
/// Une base SQLite en mémoire, neuve pour chaque test.
/// </summary>
/// <remarks>
/// On utilise SQLite en mémoire plutôt que le fournisseur « InMemory » d'EF Core, et la
/// distinction compte : le fournisseur InMemory n'est pas une vraie base de données. Il
/// ignore les contraintes de clé étrangère, les index uniques, et il exécute les
/// requêtes en LINQ-to-Objects — ce qui veut dire qu'une requête <i>intraduisible en
/// SQL</i> y passe sans broncher pour échouer en production.
///
/// C'est précisément le bug rencontré pendant l'écriture de ce projet : un OrderBy placé
/// après une projection compilait, tournait, et n'échouait qu'à l'exécution réelle.
/// Avec SQLite, le test l'aurait attrapé.
///
/// La chaîne « DataSource=:memory: » crée une base qui vit dans la mémoire du processus
/// et disparaît à la fermeture de la connexion. D'où le champ _connection : il faut la
/// maintenir ouverte, sinon la base est détruite avant même que le test ne s'exécute.
/// </remarks>
public sealed class TestDatabase : IDisposable
{
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

        // EnsureCreated construit le schéma à partir du modèle, sans passer par les
        // migrations. C'est plus rapide et suffisant ici : on teste le comportement du
        // code, pas la justesse des migrations.
        Context.Database.EnsureCreated();
    }

    public void Dispose()
    {
        Context.Dispose();
        _connection.Dispose();
    }
}
