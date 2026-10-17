# Jardo : suivi de progression

Point d'entrée pour reprendre le projet (y compris avec un autre Claude). Le détail
technique est dans le [README](README.md) et dans [`docs/`](docs/front-architecture.md).

## Le projet

Projet d'apprentissage .NET : une API de suivi de potager (zones, plantes, arrosages,
journal d'observations) et une app mobile qui la consomme.

## Où on en est (17/10/2026)

**Backend `Jardo.Api` : MVP terminé.**
- ASP.NET Core + EF Core + SQLite, tests dans `Jardo.Api.Tests`.
- Zones, plantes, arrosages, journal ; voyant d'arrosage calculé côté API.
- CORS ouvert uniquement en dev pour `http://localhost:8081` (front Expo en mode web).

**Front `jardo-app` : premier jet fonctionnel, à retravailler.**
- Expo SDK 57 (React Native + TypeScript), Expo Router, TanStack Query.
- Choisi à la place de la PWA Angular prévue au départ (raisons dans
  [`docs/front-architecture.md`](docs/front-architecture.md)).
- Tous les écrans du MVP existent et marchent dans le navigateur, branchés sur l'API :
  à arroser, zones, plantes, fiches, formulaires, observations.
- **Le rendu ne plaît pas du tout.** Il sert de base fonctionnelle (navigation, appels
  API, formulaires) ; le visuel est à refaire.

## Lancer en local

```bash
dotnet run --project Jardo.Api
```

```bash
npm --prefix jardo-app install
```

```bash
npm --prefix jardo-app run web -- --port 8081
```

## Prochaines étapes

1. Refaire le visuel du front (couleurs, typo, icône, splash, mode sombre).
2. Sélecteur de date à la place de la saisie `AAAA-MM-JJ`.
3. Tester sur téléphone avec Expo Go (l'API doit écouter sur le réseau local).
4. Héberger l'API en HTTPS, puis ajouter l'authentification (objectif d'apprentissage).
5. APK installable via EAS, puis notifications, photos, stades de croissance, météo.

Roadmap détaillée : [`docs/front-roadmap.md`](docs/front-roadmap.md).

## Façon de travailler

- Claude écrit le code, mais chaque ligne doit être compréhensible : commentaires en
  français qui expliquent le *pourquoi*, identifiants en anglais.
- Une revue commentée entre chaque phase.
- Pas de sur-ingénierie : proposer petit et livrable plutôt qu'ambitieux.

## À faire côté Git

Les commits jusqu'ici portent l'adresse e-mail professionnelle. Avant de rendre le
dépôt public : réécrire l'auteur de l'historique (ou repartir d'un nouveau dépôt) et
configurer `git config user.email` avec l'adresse perso sur le nouveau PC.
