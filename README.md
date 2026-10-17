# Jardo

Application de suivi de potager : zones, plantes, arrosages et journal d'observations.
Une API ASP.NET Core et une app Android (Expo) qui la consomme.

Le principe central est le **voyant d'arrosage** : chaque plante porte un intervalle en jours,
et l'API calcule son état à partir du dernier arrosage enregistré.

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
SQLite est créée, migrée et remplie d'un potager d'exemple au premier lancement ; pour repartir
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
