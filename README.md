# Jardo

[![CI](https://github.com/PNJ-Max/Jardo/actions/workflows/ci.yml/badge.svg)](https://github.com/PNJ-Max/Jardo/actions/workflows/ci.yml)

Application de gestion du jardin. Potager, verger, petits fruits, bois de chauffage : on y
organise ce que contient le jardin, on note ce qu'on y fait, et l'app rappelle ce qui est à
faire. Une API ASP.NET Core et une app Android (Expo) qui la consomme.

La [vision produit](docs/vision-produit.md) et le [modèle du domaine](docs/modele-domaine.md)
décrivent la cible. L'API en est à la première étape de la migration : un jardin, ses espaces
typés (potager, verger, petits fruits, serre, bois de chauffage), leurs zones et leurs plantes, plus un
journal d'observations et un premier service, le rappel d'arrosage.

## Premier service : le voyant d'arrosage

Chaque plante porte un intervalle en jours, et l'API calcule son état à partir du dernier
arrosage enregistré. Ce voyant s'étendra à toutes les tâches du jardin.

| État | Signification |
|---|---|
| `Ok` | l'échéance est dans le futur |
| `DueSoon` | l'échéance est aujourd'hui |
| `Overdue` | l'échéance est dépassée (`daysOverdue` donne le retard) |

L'état est recalculé à chaque lecture, jamais stocké. Une zone agrège celui de ses plantes via
`plantsNeedingWater`. `GET /api/watering/needed` renvoie les plantes à arroser, les plus en
retard d'abord.

## Lancer

```bash
dotnet run --project Jardo.Api
```

Swagger est disponible sur http://localhost:5015/swagger. En environnement `Development`, la base
SQLite est créée, migrée et remplie d'un jardin d'exemple au premier lancement ; pour repartir
de zéro, supprimer `Jardo.Api/jardo.db`. `Jardo.Api/Jardo.Api.http` rassemble des requêtes
prêtes à l'emploi.

```bash
dotnet test
```

Le front est dans `jardo-app/` ; voir [`docs/`](docs/front-architecture.md).

## Structure

```
Jardo.Api/
├── Controllers/     HTTP uniquement : requête -> service -> code de statut
├── Services/        logique métier, dont WateringCalculator (calcul du voyant)
├── Data/            GardenDbContext, migrations, données d'exemple
├── Models/          entités
├── Dtos/            contrats d'entrée et de sortie
└── Infrastructure/  gestion d'erreurs, utilitaires
Jardo.Api.Tests/     xUnit, SQLite en mémoire
jardo-app/           front Expo
docs/                décisions d'architecture et charte
```

## Choix d'architecture

- **Services + contrôleurs fins** : les services lèvent des exceptions métier, un `IExceptionHandler` unique les traduit en ProblemDetails (RFC 9457).
- **Pas de Repository** : `DbContext` fait déjà office d'unité de travail.
- **DTOs séparés des entités**, mapping manuel : aucune entité n'est exposée en HTTP.
- **Contraintes déclarées en base** (longueurs, index, unicité), pas seulement sur les DTOs.
- **`TimeProvider` injecté** plutôt que `DateTime.Now`, pour tester la logique de dates.
- **`WateringCalculator` pur** : sans dépendance, testable sans base ni horloge.
- **Tests sur SQLite en mémoire**, pas sur le provider `InMemory`, qui laisse passer des requêtes intraduisibles en SQL.
- **`TreatWarningsAsErrors`** actif.

## Feuille de route

Voir [`suivi-progression.md`](suivi-progression.md).
