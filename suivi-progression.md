# Jardo : suivi de progression

Point d'entrée pour reprendre le projet. Règles de travail dans [`CLAUDE.md`](CLAUDE.md),
détail technique dans le [README](README.md) et dans [`docs/`](docs/front-architecture.md).

## Le projet

App Android de gestion du jardin (potager, verger, petits fruits, bois de chauffage…) :
une API ASP.NET Core et une app Expo qui la consomme. On y organise et suit ce que contient
le jardin ; le rappel d'arrosage est le premier service parmi d'autres. Objectif : une vraie
app, publiable un jour sur le Play Store. Voir la [vision produit](docs/vision-produit.md).

## Où on en est (19/10/2026)

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

**Backend `Jardo.Api` : migration vers le nouveau modèle, étapes 1 à 3 sur 4 faites.**
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
- Étape 2, journal d'interventions unifié : `JournalEntry` remplace arrosages et observations.
  Onze types (arrosage, semis, plantation, taille, traitement, fertilisation, récolte,
  observation, apport et consommation de bois, autre), champs facultatifs contrôlés selon le
  type (quantité pour la récolte et le bois, en stères pour le bois ; hauteur ; problème et
  traitement), date jamais future. Cible : un espace, et une zone ou un élément de cet espace,
  cohérence vérifiée ; les entrées d'un élément le suivent quand il est déplacé. Règle tranchée :
  une intervention sur une zone ou un espace vaut pour les éléments qu'ils contiennent
  ([détail](docs/modele-domaine.md#journalentry-intervention)). Endpoint `/api/journal` (lecture
  pour le jardin ou une cible, filtre par types, correction, suppression).
- Étape 3, tâches : `GardenTask` sur la même cible que le journal, un type d'intervention, un
  titre facultatif et un rythme (tous les N jours, chaque année à partir d'une date, une seule
  fois). L'échéance est calculée à la lecture par `DueDateCalculator`, à partir du journal et
  selon la même règle zone ou espace → éléments ; voyant `Ok` / `DueSoon` / `Overdue` avec jours
  de retard sur toute tâche. Cas annuel tranché : ce qui est fait jusqu'à 30 jours avant la date
  compte pour l'année ([détail](docs/modele-domaine.md#gardentask-tâche)). L'arrosage devient
  une tâche : `WateringIntervalDays`, `GET /api/watering/needed` et les raccourcis d'arrosage
  disparaissent. Endpoints `/api/tasks` (CRUD, lecture par cible), `/api/tasks/due?horizon=Today|Week`
  (écran Aujourd'hui), `POST /api/tasks/{id}/done` (« Fait » : note au journal et renvoie la
  tâche recalculée) ; `dueTaskCount` sur chaque espace pour la liste du Jardin. Le tas de bois
  arrive à l'étape 4.
- Le seeder produit quelques semaines de journal (arrosages de zones et d'espaces, semis,
  plantations, taille du verger, récoltes, oïdium constaté puis traité) et seize tâches :
  arrosages de cultures, de carrés et d'une plante de verger, désherbage, taille d'hiver,
  compost annuel, traitement à renouveler, plantation faite ; les trois voyants y figurent.
- Le front actuel ne suit plus l'API (zones sans espace, `CreatePlantDto`, arrosages et
  observations disparus, voyant d'arrosage remplacé par les tâches) : il sera refait sur le
  nouveau modèle après l'étape 4.
- Commentaires pédagogiques retirés : seuls restent ceux qui expliquent une décision non
  évidente. README recentré sur le produit.

**Front `jardo-app` : premier jet fonctionnel, fondations UI posées, écrans à refaire.**
- Expo SDK 57 (React Native + TypeScript), Expo Router, TanStack Query.
- Tous les écrans du MVP existent et sont branchés sur l'API.
- Charte v2 validée le 19/10 ([`docs/charte-graphique.md`](docs/charte-graphique.md)) : verts en
  clair, sarcelle en sombre, police Nunito. Appliquée au thème : toute l’app
  en profite sans toucher aux écrans.
- Icône et splash faits : pousse en pot sur fond crème, icône adaptative Android avec
  version monochrome, splash clair et sombre, favicon. Sources SVG dans `jardo-app/assets/source/`.
- Fondations UI : thème clair / sombre qui suit le téléphone (`src/theme/`, `useTheme`,
  `createStyles`), échelle typographique, composants de base
  découpés dans `src/components/ui/`, dépendances inutiles du template retirées.
- Maquettes v2 et Design System (Claude Design) antérieurs à la charte v2 : non validés. Boutons,
  icône, splash et « une interface plus vivante » sont repris en phase 6.
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
  2. journal d'interventions unifié. Fait ;
  3. tâches récurrentes et calculateur d'échéance générique (l'arrosage en devient une). Fait ;
  4. tas de bois.

**Phase 4 : écrans du nouveau MVP**
- Refonte des écrans sur la charte actuelle (le design est repris en phase 6) : onglets Jardin (accueil) · Aujourd'hui · Journal, espaces, fiches,
  formulaires avec sélecteur de date.

**Phase 5 : qualité**
- CI GitHub Actions. Fait.
- Types du front générés depuis l'OpenAPI, tests du front.

**Phase 6 : après le MVP**
- Refonte du design en premier : charte (couleurs, mode sombre), typographie, boutons, une
  interface plus vivante, avec des skills de design (frontend-design).
- Carte isométrique dans l'onglet Jardin (premier chantier, [étapes](docs/etude-carte-potager.md#étapes-livrables)),
  notifications, récoltes chiffrées, photos,
  catalogue d'espèces, autres types d'espaces, météo, foyer partagé.

**Phase 7 : vers le Play Store**
- Test sur téléphone (Expo Go), API hébergée en HTTPS + authentification, build EAS,
  fiche Play Store.

## À décider

- **E-mail pro dans l'historique Git.** Le dépôt est public et ses premiers commits portent
  l'adresse professionnelle. Option : réécrire l'historique puis forcer le push.
