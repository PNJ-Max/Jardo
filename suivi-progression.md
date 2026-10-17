# Jardo : suivi de progression

Point d'entrée pour reprendre le projet. Règles de travail dans [`CLAUDE.md`](CLAUDE.md),
détail technique dans le [README](README.md) et dans [`docs/`](docs/front-architecture.md).

## Le projet

App Android de suivi de potager (zones, plantes, arrosages, journal d'observations) :
une API ASP.NET Core et une app Expo qui la consomme. Objectif : une vraie app,
publiable un jour sur le Play Store.

## Où on en est (17/10/2026)

**Backend `Jardo.Api` : MVP terminé.**
- ASP.NET Core (.NET 10) + EF Core + SQLite, tests dans `Jardo.Api.Tests`.
- Zones, plantes, arrosages, journal ; voyant d'arrosage calculé côté API.
- Commentaires pédagogiques retirés : seuls restent ceux qui expliquent une décision non
  évidente. README recentré sur le produit.

**Front `jardo-app` : premier jet fonctionnel, fondations UI posées, écrans à refaire.**
- Expo SDK 57 (React Native + TypeScript), Expo Router, TanStack Query.
- Tous les écrans du MVP existent et sont branchés sur l'API.
- Charte graphique arrêtée ([`docs/charte-graphique.md`](docs/charte-graphique.md)) : terre
  cuite pour les actions, bleu eau pour « à arroser ».
- Icône et splash faits : pousse en pot sur fond crème, icône adaptative Android avec
  version monochrome, splash clair et sombre, favicon. Sources SVG dans `jardo-app/assets/source/`.
- Fondations UI : thème clair / sombre qui suit le téléphone (`src/theme/`, `useTheme`,
  `createStyles`), polices Fraunces et Inter avec échelle typographique, composants de base
  découpés dans `src/components/ui/`, dépendances inutiles du template retirées.
- Restent : refonte des écrans d'après les maquettes, sélecteur de date.
- Pas de tests.

**CI** : GitHub Actions (`.github/workflows/ci.yml`) sur chaque PR vers `main` et chaque push
sur `main`. Job API (build + tests) et job front (lint + typecheck), lancés selon les fichiers
modifiés ; un job ignoré est « skipped », la PR reste fusionnable.

**Organisation** : une session Claude par tâche, sur sa propre branche, livrée par PR ;
une conversation « QG » planifie, rédige les prompts et relit les PR.

## Feuille de route

**Phase 0 : socle**
- `CLAUDE.md`, poste de développement (.NET 10, Rider, GitHub CLI), lancement API + front.

**Phase 1 : en parallèle**
- A. Nettoyage professionnel de l'API (commentaires, README).
- B. Charte graphique : 2-3 directions, choix, puis `docs/charte-graphique.md` et `theme.ts`. Fait.

**Phase 2 : refonte du front**
- Application de la charte, composants, mode sombre, icône et splash, sélecteur de date,
  retrait des dépendances inutiles.

**Phase 3 : qualité**
- Types du front générés depuis l'OpenAPI, tests du front.

**Phase 4 : vers le Play Store**
- Test sur téléphone (Expo Go), API hébergée en HTTPS + authentification, build EAS,
  notifications, photos, stades de croissance, météo, fiche Play Store.

## À décider

- **E-mail pro dans l'historique Git.** Le dépôt est public et ses premiers commits portent
  l'adresse professionnelle. Option : réécrire l'historique puis forcer le push.
