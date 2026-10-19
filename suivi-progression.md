# Jardo : suivi de progression

Point d'entrée pour reprendre le projet. Règles de travail dans [`CLAUDE.md`](CLAUDE.md),
détail technique dans le [README](README.md) et dans [`docs/`](docs/front-architecture.md).

## Le projet

App Android de gestion du jardin (potager, verger, petits fruits, bois de chauffage…) :
une API ASP.NET Core et une app Expo qui la consomme. On y organise et suit ce que contient
le jardin ; le rappel d'arrosage est le premier service parmi d'autres. Objectif : une vraie
app, publiable un jour sur le Play Store. Voir la [vision produit](docs/vision-produit.md).

## Où on en est (18/10/2026)

**Étude de la carte du jardin validée** ([`docs/etude-carte-potager.md`](docs/etude-carte-potager.md),
avec un prototype cliquable). Scène modèle « maison mitoyenne », espaces cliquables (serre
comprise), ni liste ni voyant, nuit en mode sombre ; rendu recommandé avec Skia, à confirmer
par un essai sur téléphone. Données propres à la carte dans une table `GardenMapSlot`. Réalisation en phase 6,
en six étapes.

**Vision produit arrêtée.** Jardo passe du suivi d'arrosage à la gestion du jardin :
[`docs/vision-produit.md`](docs/vision-produit.md) et proposition de modèle
[`docs/modele-domaine.md`](docs/modele-domaine.md) (jardin, espaces typés, zones, éléments,
journal d'interventions, tâches). L'API y migre par étapes. La refonte des écrans est
suspendue jusqu'à la nouvelle API et aux maquettes revues.

**Backend `Jardo.Api` : migration vers le nouveau modèle, étape 1 sur 4 faite.**
- ASP.NET Core (.NET 10) + EF Core + SQLite, tests dans `Jardo.Api.Tests`.
- Étape 1, jardin et espaces : un jardin unique (créé par la migration), des espaces typés
  (potager, verger, petits fruits, serre, bois de chauffage) archivables, des zones rattachées à un
  espace, et `Plant` devenue sous-type de `GardenItem` (TPH) avec variété, quantité et unité,
  dates de semis et de plantation ; une plante est un sujet seul ou un groupe de sujets
  identiques (« 3 pommiers Golden »). Règles : zone du même espace que l'élément, pas de plante
  dans un espace bois de chauffage, quantité positive et entière en pieds, noms uniques
  (espace dans le jardin, zone dans l'espace).
  Endpoints `/api/garden`, `/api/spaces`, `/api/spaces/{id}/zones`, `/api/zones/{id}`,
  `/api/plants?spaceId=&zoneId=`. Le seeder crée un jardin d'exemple complet.
- Arrosages, observations et voyant d'arrosage inchangés, en attendant le journal (étape 2)
  et les tâches (étape 3).
- Le front actuel ne suit plus l'API (zones sans espace, `CreatePlantDto` disparu) : il sera
  refait sur le nouveau modèle.
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
- Maquettes des écrans actuels faites dans Claude Design, à revoir pour la nouvelle vision.
- Restent : sélecteur de date, puis refonte des écrans sur le nouveau modèle.
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

**Phase 2 : fondations du front**
- Application de la charte, composants, mode sombre, icône et splash, retrait des
  dépendances inutiles. Fait. Reste le sélecteur de date.

**Phase 3 : vision et modèle du jardin**
- Vision produit et proposition de modèle du domaine. Fait.
- API, une PR par étape ([détail](docs/modele-domaine.md#stratégie-de-migration)) :
  1. jardin, espaces typés, zones, plantes avec variété et quantité. Fait ;
  2. journal d'interventions unifié ;
  3. tâches récurrentes et calculateur d'échéance générique (l'arrosage en devient une) ;
  4. tas de bois.

**Phase 4 : écrans du nouveau MVP**
- Maquettes revues pour la nouvelle vision.
- Refonte des écrans : onglets Jardin (accueil) · Aujourd'hui · Journal, espaces, fiches,
  formulaires avec sélecteur de date.

**Phase 5 : qualité**
- CI GitHub Actions. Fait.
- Types du front générés depuis l'OpenAPI, tests du front.

**Phase 6 : après le MVP**
- Carte isométrique dans l'onglet Jardin (premier chantier, [étapes](docs/etude-carte-potager.md#étapes-livrables)),
  notifications, récoltes chiffrées, photos,
  catalogue d'espèces, autres types d'espaces, météo, foyer partagé.

**Phase 7 : vers le Play Store**
- Test sur téléphone (Expo Go), API hébergée en HTTPS + authentification, build EAS,
  fiche Play Store.

## À décider

- **E-mail pro dans l'historique Git.** Le dépôt est public et ses premiers commits portent
  l'adresse professionnelle. Option : réécrire l'historique puis forcer le push.
