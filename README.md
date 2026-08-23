# Jardo

API de suivi de potager : zones, plantes, arrosages et journal d'observations.

Projet d'apprentissage .NET. Le code est commenté pour être relu — les commentaires
expliquent *pourquoi* une décision a été prise, pas ce que la ligne fait.

## Démarrer

```bash
cd Jardo.Api
dotnet run
```

Puis ouvrir **http://localhost:5015/swagger**.

La base SQLite est créée, migrée et remplie automatiquement au premier lancement
(uniquement en environnement `Development`). Pour repartir de zéro : supprimer
`Jardo.Api/jardo.db` et relancer.

Le fichier `Jardo.Api/Jardo.Api.http` contient toutes les requêtes prêtes à l'emploi,
y compris les cas d'erreur — utilisable directement depuis Visual Studio ou VS Code.

```bash
dotnet test
```

## Ce que fait l'API

Le concept central est le **voyant d'arrosage**. Chaque plante porte un intervalle en
jours ; l'API calcule l'échéance à partir du dernier arrosage enregistré et renvoie un
état :

| État | Signification |
|---|---|
| `Ok` | l'échéance est dans le futur |
| `DueSoon` | l'échéance est aujourd'hui |
| `Overdue` | l'échéance est dépassée, avec `daysOverdue` |

Cet état n'est **jamais stocké** : il dépend de la date du jour et serait faux dès le
lendemain. Il est recalculé à chaque lecture.

Une zone agrège l'état de ses plantes via `plantsNeedingWater`, ce qui permet d'allumer
un voyant au niveau de la zone sans charger toutes ses plantes.

L'endpoint qui compte : **`GET /api/watering/needed`** — les plantes à arroser, les plus
en retard d'abord. C'est la réponse à la seule question qui se pose en ouvrant l'app le
matin.

## Structure

```
Jardo.Api/
├── Controllers/     HTTP uniquement : requête -> service -> code de statut
├── Services/        la logique métier
├── Data/            GardenDbContext, migrations, données d'exemple
├── Models/          entités EF Core
├── Dtos/            contrats d'entrée et de sortie
└── Infrastructure/  gestion d'erreurs, utilitaires transverses
```

Deux fichiers à lire en premier pour comprendre le projet :

- **`Services/WateringCalculator.cs`** — le calcul du voyant. Fonction pure, sans aucune
  dépendance : c'est ce qui la rend testable sans monter de base ni simuler d'horloge.
- **`Program.cs`** — la configuration complète, commentée ligne à ligne, y compris ce qui
  en est volontairement absent et pourquoi.

## Décisions d'architecture

Assumées, et justifiées en commentaire à l'endroit concerné du code.

**Ce qu'on ne fait pas**, parce que le projet doit rester lisible :

- **Pas de pattern Repository.** `DbSet<T>` est déjà un repository, `DbContext` est déjà
  un Unit of Work.
- **Pas de découpage en 4 projets** (Domain / Application / Infrastructure / Api). Un
  projet API avec des dossiers, un projet de tests.
- **Pas d'AutoMapper.** Mapping manuel : on voit quel champ va où, et on peut y poser un
  point d'arrêt.
- **Pas de MediatR, pas de CQRS, pas de FluentValidation, pas de pagination.** Aucun
  problème du projet ne les justifie aujourd'hui.

**Ce qui fait quand même la qualité :**

- Couche de services portant la logique métier, contrôleurs fins — aucun `try/catch` ni
  `if (x is null) return NotFound()` dans les contrôleurs.
- Erreurs centralisées dans un `IExceptionHandler` unique, réponses au format
  **ProblemDetails** (RFC 9457).
- DTOs séparés des entités : aucune entité EF n'est exposée en HTTP.
- Contraintes déclarées côté base (longueurs, index, unicité), pas seulement sur les DTOs.
- `TimeProvider` injecté plutôt que `DateTime.Now`, ce qui rend la logique de dates
  testable.
- Lectures en `AsNoTracking()`, requêtes composées pour éviter le problème N+1.
- `TreatWarningsAsErrors` : un avertissement ignoré est un bug qui attend son heure.

## Tests

25 tests, concentrés là où ils prouvent quelque chose :

- `WateringCalculatorTests` — le calcul du voyant. Tests purs, sans base ni horloge.
- `WateringServiceTests` — ce que le calculateur ne couvre pas : exclusion des plantes
  archivées, tri par urgence, refus des dates futures, arrosage d'une zone entière.

Le CRUD n'est pas testé : tester un passe-plat ne prouverait que le bon fonctionnement
d'EF Core.

Les tests utilisent **SQLite en mémoire** et non le fournisseur `InMemory` d'EF Core.
La différence est importante : `InMemory` n'est pas une base de données, il ignore les
contraintes et exécute les requêtes en LINQ-to-Objects — une requête intraduisible en
SQL y passerait sans erreur pour échouer en production.

## Suite prévue

1. **Front Angular en PWA** — installable sur l'écran d'accueil du téléphone, écrans
   mobile-first, voyant coloré.
2. Stades de croissance (semé → planté → en fleur → récolté) et ajustement météo de
   l'arrosage via Open-Meteo.
3. Photos sur les observations.
4. Authentification, sécurité et déploiement.

Le code actuel est structuré pour les accueillir : ajouter une photo est une migration
d'une colonne, l'ajustement météo s'insère dans `WateringService`, et l'authentification
se branche sur un pipeline et une politique CORS déjà centralisés dans `Program.cs`.
