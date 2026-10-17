# Jardo

App Android de suivi de potager : zones, plantes, arrosages, journal d'observations.
Objectif : une vraie app, publiable un jour sur le Play Store.

- `Jardo.Api/` : API ASP.NET Core (.NET 10), EF Core + SQLite. Tests dans `Jardo.Api.Tests/` (xUnit, SQLite en mémoire).
- `jardo-app/` : front Expo (React Native + TypeScript), Expo Router, TanStack Query. Règles Expo dans `jardo-app/AGENTS.md`.
- `docs/` : décisions d'architecture et charte. `suivi-progression.md` : état du projet et feuille de route.

## Commandes

```bash
dotnet build
dotnet test
dotnet run --project Jardo.Api          # http://localhost:5015/swagger
npm --prefix jardo-app run web -- --port 8081
```

Dans `jardo-app/` : `npx expo lint` et `npx tsc --noEmit`.

## Règles de code

- Niveau professionnel. Un commentaire n'existe que si le *pourquoi* n'est pas évident à la lecture. Jamais de commentaire pédagogique qui explique le langage, le framework ou ce que fait la ligne.
- Identifiants et noms de fichiers de code en anglais ; textes affichés à l'utilisateur et documentation en français.
- Pas de sur-ingénierie : pas de couche, de dépendance ou d'abstraction qu'aucun besoin actuel ne justifie (pas de Repository, AutoMapper, MediatR côté API ; pas de Redux côté front).
- Suivre les conventions existantes : services métier + contrôleurs fins, erreurs en ProblemDetails via `GlobalExceptionHandler`, `TimeProvider` plutôt que `DateTime.Now`, DTOs séparés des entités.
- `TreatWarningsAsErrors` est actif : le build doit passer sans avertissement.

## Workflow

- Chaque tâche se fait sur une branche dédiée et arrive sur `main` par une Pull Request (`gh pr create`).
- Avant d'ouvrir la PR : `dotnet build` et `dotnet test` verts si l'API est touchée ; `npx expo lint` et `npx tsc --noEmit` verts si le front est touché.
- Mettre à jour `suivi-progression.md` (section « Où on en est ») dans la même PR.
- Rester dans le périmètre de la tâche ; signaler le reste dans la description de la PR plutôt que le corriger au passage.
