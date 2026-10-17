using System.Reflection;
using System.Text.Json.Serialization;
using Jardo.Api.Data;
using Jardo.Api.Infrastructure;
using Jardo.Api.Services;
using Microsoft.EntityFrameworkCore;

// Ce fichier suit toujours la même structure, et c'est le squelette de toute
// application ASP.NET Core moderne :
//
//   1. CreateBuilder      -> on DÉCRIT ce dont l'application a besoin
//   2. builder.Build()    -> le point de gel : le conteneur est scellé
//   3. app.Use / app.Map  -> on assemble le pipeline de traitement des requêtes
//   4. app.Run()          -> Kestrel démarre et écoute
//
// Règle à retenir : tout ce qui touche « builder. » vient AVANT Build(),
// tout ce qui touche « app. » vient APRÈS. Ajouter un service après Build()
// lève une exception, car le conteneur n'accepte plus de modification.

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------------
// 1. Enregistrement des services
// ---------------------------------------------------------------------------

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        // Sans ce convertisseur, l'enum WateringStatus part en JSON sous forme de
        // nombre : "wateringStatus": 2. Le front devrait alors dupliquer la
        // correspondance 0/1/2 -> vert/orange/rouge, et ce doublon finirait par
        // se désynchroniser le jour où on ajoutera une valeur à l'enum.
        // Avec le convertisseur, la réponse contient "Overdue" : lisible dans Swagger,
        // et une seule source de vérité.
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// Le DbContext est enregistré en Scoped (c'est le comportement par défaut
// d'AddDbContext) : une instance neuve par requête HTTP, libérée à la fin.
// C'est le bon choix — un DbContext n'est pas conçu pour être utilisé par
// plusieurs requêtes simultanées, et garder le même trop longtemps ferait
// grossir indéfiniment son suivi de modifications.
builder.Services.AddDbContext<GardenDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// L'horloge, enregistrée comme n'importe quelle autre dépendance.
// TimeProvider.System lit l'heure réelle ; les tests injecteront une horloge figée.
// Singleton car sans état : rien à isoler entre les requêtes.
builder.Services.AddSingleton(TimeProvider.System);

// Les services métier, en Scoped.
//
// Pourquoi Scoped et pas Singleton : ils dépendent du DbContext, qui est Scoped.
// Un Singleton ne peut pas dépendre d'un Scoped — il capturerait la première
// instance reçue et la garderait pour toute la durée de vie de l'application.
// ASP.NET Core détecte cette erreur au démarrage et refuse de démarrer, ce qui
// est une bonne nouvelle : c'est le genre de bug très pénible à diagnostiquer
// en production.
builder.Services.AddScoped<IZoneService, ZoneService>();
builder.Services.AddScoped<IPlantService, PlantService>();
builder.Services.AddScoped<IWateringService, WateringService>();
builder.Services.AddScoped<IObservationService, ObservationService>();

// Gestion centralisée des erreurs.
// AddProblemDetails fournit le service qui sérialise les réponses au format
// RFC 9457 ; AddExceptionHandler enregistre notre traducteur d'exceptions.
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// CORS : nécessaire pour le front Expo lancé en mode web (npm run web).
//
// Le navigateur interdit par défaut à une page servie par localhost:8081 d'appeler
// une API sur localhost:5015 — ports différents, donc origines différentes. Ce
// n'est pas un problème de l'API mais une protection du navigateur, et c'est à
// l'API de déclarer explicitement qui a le droit de l'appeler.
//
// L'app installée sur téléphone n'est pas concernée : CORS n'existe que dans les
// navigateurs. Cette politique ne sert donc qu'au développement.
//
// On nomme les origines autorisées plutôt que d'utiliser AllowAnyOrigin : une API
// ouverte à tout le monde n'est acceptable que le temps d'une démonstration.
const string FrontDevPolicy = "FrontDev";

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontDevPolicy, policy => policy
        .WithOrigins("http://localhost:8081")
        .AllowAnyHeader()
        .AllowAnyMethod());
});

// Swagger : la documentation interactive de l'API, et notre seule interface
// jusqu'à ce que le front existe.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "Jardo API",
        Version = "v1",
        Description = "Suivi de potager : zones, plantes, arrosages et journal d'observations."
    });

    // Injecte les commentaires /// dans la documentation Swagger.
    // C'est ce qui fait que les <summary> écrits sur les actions des contrôleurs
    // apparaissent comme description de chaque endpoint, et les <remarks> comme
    // texte détaillé. Sans cette ligne, le fichier XML est généré mais ignoré.
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);

    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

var app = builder.Build();

// ---------------------------------------------------------------------------
// 2. Le pipeline de traitement des requêtes
// ---------------------------------------------------------------------------
//
// L'ORDRE EST SIGNIFIANT : chaque « Use » est un maillon que la requête traverse
// dans l'ordre d'écriture, et que la réponse retraverse en sens inverse.

// En tout premier, pour pouvoir attraper les exceptions de tout ce qui suit.
// Placé plus bas, il ne verrait pas les erreurs des maillons précédents.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Jardo API v1");
        options.DocumentTitle = "Jardo API";
    });

    app.UseCors(FrontDevPolicy);
}

// Volontairement ABSENTS de ce pipeline, et c'est une décision :
//
//   app.UseHttpsRedirection() — le profil de lancement « http » n'écoute que sur
//   un port HTTP. Le middleware ne trouverait aucun port HTTPS cible et
//   journaliserait un avertissement à chaque requête, sans rien rediriger.
//   Il sera remis le jour où l'application sera hébergée derrière du HTTPS.
//
//   app.UseAuthorization() — aucune authentification n'est configurée. Le
//   middleware ne ferait rien, tout en donnant l'illusion, à la lecture, que
//   l'API est protégée. Un code mort qui rassure à tort est pire qu'un code
//   absent. Il arrivera avec l'authentification, pas avant.

app.MapControllers();

// ---------------------------------------------------------------------------
// 3. Préparation de la base au démarrage (développement uniquement)
// ---------------------------------------------------------------------------

if (app.Environment.IsDevelopment())
{
    // CreateScope() est indispensable, et c'est un point qui piège tout le monde.
    //
    // Le DbContext est enregistré en Scoped : il n'existe que dans le cadre d'une
    // « portée », normalement créée automatiquement pour chaque requête HTTP.
    // Ici, on est au démarrage : aucune requête n'est en cours, donc aucune portée
    // n'existe. Demander directement app.Services.GetRequiredService<GardenDbContext>()
    // lèverait une exception.
    //
    // On crée donc la portée à la main, et le « using » garantit qu'elle est
    // fermée — et le DbContext libéré — dès la fin du bloc.
    //
    // La même contrainte s'appliquera à toute tâche de fond (BackgroundService),
    // qui est un singleton et devra elle aussi créer sa portée pour chaque cycle.
    using var scope = app.Services.CreateScope();

    var db = scope.ServiceProvider.GetRequiredService<GardenDbContext>();
    var timeProvider = scope.ServiceProvider.GetRequiredService<TimeProvider>();

    // MigrateAsync applique les migrations manquantes et crée la base si elle
    // n'existe pas. Pratique en développement.
    //
    // À ne PAS faire en production : deux instances qui démarrent en même temps
    // migreraient simultanément, et une migration ratée casse le démarrage de
    // l'application au lieu d'échouer proprement dans un déploiement. En
    // production, les migrations se lancent comme une étape séparée. D'où la
    // condition IsDevelopment.
    await db.Database.MigrateAsync();

    await DbSeeder.SeedAsync(db, timeProvider);
}

app.Run();
