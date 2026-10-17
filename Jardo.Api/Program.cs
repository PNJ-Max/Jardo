using System.Reflection;
using System.Text.Json.Serialization;
using Jardo.Api.Data;
using Jardo.Api.Infrastructure;
using Jardo.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        // Les statuts sont sérialisés en texte ("Overdue") : le front n'a pas à dupliquer la correspondance numérique.
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddDbContext<GardenDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddSingleton(TimeProvider.System);

builder.Services.AddScoped<IZoneService, ZoneService>();
builder.Services.AddScoped<IPlantService, PlantService>();
builder.Services.AddScoped<IWateringService, WateringService>();
builder.Services.AddScoped<IObservationService, ObservationService>();

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// Uniquement pour le front Expo lancé en mode web : l'app mobile n'est pas soumise à CORS.
const string FrontDevPolicy = "FrontDev";

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontDevPolicy, policy => policy
        .WithOrigins("http://localhost:8081")
        .AllowAnyHeader()
        .AllowAnyMethod());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "Jardo API",
        Version = "v1",
        Description = "Suivi de potager : zones, plantes, arrosages et journal d'observations."
    });

    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);

    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

var app = builder.Build();

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

// UseHttpsRedirection et UseAuthorization sont volontairement absents :
// le profil de lancement n'écoute qu'en HTTP et aucune authentification n'est configurée.
// À ajouter avec l'hébergement HTTPS et l'authentification.

app.MapControllers();

if (app.Environment.IsDevelopment())
{
    // Migration automatique réservée au développement : en production, les migrations sont une étape de déploiement séparée.
    using var scope = app.Services.CreateScope();

    var db = scope.ServiceProvider.GetRequiredService<GardenDbContext>();
    var timeProvider = scope.ServiceProvider.GetRequiredService<TimeProvider>();

    await db.Database.MigrateAsync();

    await DbSeeder.SeedAsync(db, timeProvider);
}

app.Run();
