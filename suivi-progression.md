# Jardo : suivi de progression

Point d'entrée pour reprendre le projet. Règles de travail dans [`CLAUDE.md`](CLAUDE.md),
détail technique dans le [README](README.md) et dans [`docs/`](docs/front-architecture.md).

## Le projet

App Android de gestion du jardin (potager, verger, petits fruits, bois de chauffage…) :
une API ASP.NET Core et une app Expo qui la consomme. On y organise et suit ce que contient
le jardin ; le rappel d'arrosage est le premier service parmi d'autres. Objectif : une vraie
app, publiable un jour sur le Play Store. Voir la [vision produit](docs/vision-produit.md).

## Où on en est (23/10/2026)

**La carte est l'accueil (étape 4 de l'[étude](docs/etude-carte-potager.md)).** L'onglet Jardin
affiche la carte du modèle du jardin, lue par `useGardenMap()` sur `GET /api/garden/map`. Chaque
emplacement occupé porte le nom de son espace ou de sa zone, et le toucher (dessin ou étiquette)
ouvre sa fiche ; un emplacement libre est voilé, sans étiquette, et ne fait rien. La bande
« Hors carte », sous la carte, liste les espaces actifs sans emplacement et les carrés d'un
potager de la carte qui n'en ont pas. Un bouton de l'en-tête bascule vers la liste des espaces,
la voie des lecteurs d'écran. Sans carte configurée, ou pour un modèle que l'app ne dessine pas,
l'onglet garde la liste. L'API accepte le modèle `country-house`, que prend le jardin d'exemple.
L'aperçu de Réglages est retiré. Vérifié en mode web, vue mobile, en clair et en sombre ; **pas
encore sur téléphone** (fluidité du pincement avec Skia, poids de l'APK). Il faut recréer la
base de dev pour avoir le nouveau modèle.

**Migration « local d'abord » ([plan](docs/etude-architecture-donnees.md#plan-de-migration)).**
L'app tourne toujours sur l'API ; rien ne change à l'écran avant l'étape 5.

- [x] 1. Domaine pur en TypeScript (22/10/2026) : `jardo-app/src/domain/` porte
  `DueDateCalculator`, `WoodPileCalculator`, `LatestInterventions` et le vocabulaire des types,
  avec les cas des tests C# en Jest. Pas encore branché ([détail](docs/front-architecture.md#domaine-srcdomain)).
- [x] 2. Socle SQLite (22/10/2026) : `jardo-app/src/data/` ouvre et migre `jardo.db` au
  démarrage (`SQLiteProvider`), sans encore la lire. Schéma repris de `GardenDbContext` en SQL
  écrit à la main, UUID en texte, migrations par `PRAGMA user_version` en transaction, jardin
  d'exemple de `DbSeeder` en développement seulement. Tests Jest sur une vraie SQLite en mémoire
  (`node:sqlite`). Vérifié en mode web, où la base s'ouvre à condition de passer `web.output` en
  `"single"` et de n'ouvrir l'app que dans un onglet ; pas encore dans Expo Go
  ([détail](docs/front-architecture.md#données-locales-srcdata)).
- [x] 3. Services locaux, partie 1 (22/10/2026) : `jardo-app/src/data/` porte `GardenService`,
  `GardenMapService`, `SpaceService`, `ZoneService`, `PlantService`, `ItemPlacement` et le
  catalogue `GardenLayouts` (modèles `terraced-long` et `country-house`). Mêmes règles, réponses
  de la même forme que les DTO, écritures en transaction, refus au format du ProblemDetails. Les
  cas des tests C# correspondants sont portés en Jest sur la SQLite en mémoire. Aucun écran ne les
  appelle encore ([détail](docs/front-architecture.md#services-locaux)).
- [x] 4. Services locaux, partie 2 (23/10/2026) : `jardo-app/src/data/` porte `JournalService`,
  `TaskService`, `TaskQueries`, `WoodPileService`, `InterventionTarget` et `WoodMovements` :
  cohérence des cibles, règle d'application d'une intervention à ce que la cible contient, dates
  jamais dans le futur, champs acceptés selon le type, « Fait » qui note l'intervention en une
  transaction, stock de bois jamais négatif vérifié dans la transaction de l'écriture. Les 148 cas
  des tests C# ont leur équivalent en Jest (étapes 1, 3 et 4), plus des ajouts. Aucun écran ne les
  appelle encore ([détail](docs/front-architecture.md#services-locaux)).
- [ ] 5. Bascule des écrans
- [ ] 6. Retrait de l'API .NET
- [ ] 7. Sauvegarde

### Avant, le 22/10/2026

**La carte passe à Skia.** À la demande de Maxime, la carte est rendue par Skia, net à tout
zoom, et non plus par react-native-svg, qui est retiré. Coût : environ 4 Mo de plus sur l'APK, et
`canvaskit.wasm` (3,2 Mo en gzip) téléchargé sur le web, copié dans `public/` par le script
`postinstall`. Vérifié dans le navigateur ; pas encore sur téléphone. Voir la
[décision](docs/etude-carte-potager.md#essai-du-2110--décision).

**Carte du jardin : visuels et essai technique (étapes 1 et 3 de l'[étude](docs/etude-carte-potager.md)).**
Deux scènes modèles sont dessinées dans l'app, dans la projection de l'étude : la **maison de
campagne** (`country-house`), retenue par Maxime pour le MVP, et la maison mitoyenne
(`terraced-long`). Chacune a ses 9 emplacements (verger, petits fruits, potager et carrés 1 à 4,
serre, bois de chauffage), tout son décor autour (voisins, route, champs, haies) et sa nuit
(fenêtres et lampes allumées, lucioles). On les voit depuis Réglages, « Aperçu de la carte ». Les
étiquettes signalent ce qui est cliquable, et toucher un emplacement le met en évidence. On peut
pincer, glisser et double-toucher, dans les limites du décor. Aucune modification de l'API ; la clé `country-house` reste à ajouter au catalogue `GardenLayouts`.
Vérifié en mode web, vue mobile, en clair et en sombre ; pas encore sur téléphone.

### Avant, le 21/10/2026

**Architecture des données tranchée : local d'abord.** Les données vivront sur le téléphone, dans
une base SQLite (`expo-sqlite`), sans serveur ni compte. Résultat : 0 €/mois, une app qui marche
hors connexion, aucune donnée collectée. Arbitrages de Maxime : hors connexion avant le partage en
famille, budget nul, le .NET n'est pas une contrainte, publication pour la famille d'abord. La
logique métier passera en TypeScript, avec les tests C# pour spécification, puis l'API .NET sera
retirée. La migration se fait en sept PR, l'app restant utilisable à chacune, à commencer après
l'étape en cours de la carte et avant les notifications. La synchronisation (foyer) se décidera
plus tard. Voir l'[étude](docs/etude-architecture-donnees.md). Aucun code n'a changé.

**Carte du jardin, étape 2 : l'API.** `GET` et `PUT /api/garden/map` (le `PUT` remplace le modèle
et les affectations en une transaction), `Garden.MapLayout` et la table `GardenMapSlot`
(migration `AddGardenMap`), catalogue `GardenLayouts` avec le modèle `terraced-long` et ses clés
d'emplacement (`orchard`, `small-fruit`, `vegetable`, `bed-1` à `bed-4`, `greenhouse`,
`firewood`). Le jardin d'exemple est posé sur la carte. Un espace archivé ou dont le type change
quitte la carte. Types du front régénérés ; reste à écrire le hook `useGardenMap()` (étape 4).
Choix de détail : [étude, « Tranché à l'étape 2 »](docs/etude-carte-potager.md#tranché-à-létape-2-api).
Il faut recréer la base de dev (aucune donnée réelle).

### Avant, le 20/10/2026

**Premiers retours d'usage sur téléphone pris en compte.** Les fiches (espace, zone, plante, tas
de bois) passent en onglets : l'en-tête (nom, type, informations clés) reste en place, et
l'on choisit Tâches · Contenu (ou Plantes, Tas de bois) · Journal · Infos (détails, Modifier,
Archiver, Supprimer). Les lignes de tâche sont plus basses, le bouton « Fait » garde une large
zone de toucher. Sur la fiche d'une plante ou d'un tas, ses propres tâches viennent d'abord ;
celles de sa zone et de son espace suivent, repliées, sous « Valent aussi pour cette plante »,
avec leur nombre et ce qui presse. « Ajouter une tâche à cette plante » vise la plante. Sur un
espace ou une zone, les tâches de leurs éléments sont repliées de la même façon. Vraie page
Réglages (roue de l'en-tête du Jardin) : nom du jardin modifiable, thème, version de l'app.
Vérifié en mode web avec l'API, en clair et en sombre ; pas encore sur téléphone.

**Tests automatiques du front.** `npm --prefix jardo-app test` (jest-expo et React Native Testing
Library, API simulée au niveau de `fetch`) couvre les dates et le vocabulaire du domaine, le client
API, les écrans Aujourd'hui (sections, état vide, « Fait » optimiste et annulable) et Jardin
(espaces, pastille de tâches, archives), l'erreur de validation d'un formulaire sous son champ et
le refus d'une date future par `DateField`. Lancés par le job Front de la CI. Comment en écrire :
[docs/front-architecture.md](docs/front-architecture.md#tests).

**MVP du front terminé.** Réglage d'apparence Système, Clair ou Sombre, mémorisé sur l'appareil
(roue dans l'en-tête du Jardin). « Fait » s'annule pendant quelques secondes, ce qui supprime
l'entrée notée ; un appui long sur « Fait » permet de préciser un jour passé et une note.
Journal filtrable par espace et par type. Espaces et éléments archivés visibles à la demande,
puis désarchivables. Changement de type d'un espace et déplacement d'un élément vers une autre
zone vérifiés, depuis les formulaires de modification. Types de tâche proposés selon la cible.
L'API renvoie le type de l'élément ciblé (`itemKind`) avec les tâches et le journal, et « Fait »
renvoie l'entrée notée. Vérifié en mode web avec l'API, en clair et en sombre.

**Socle du nouveau front livré (B1).** L'app a changé de visage : trois onglets Jardin (accueil,
liste des espaces avec leurs tâches dues) · Aujourd'hui (en retard, aujourd'hui, cette semaine,
« Fait » optimiste, « Rien à faire aujourd'hui 🌱 ») · Journal (chronologie par jour). Détail
d'un espace, d'une zone, d'une plante et d'un tas de bois ; six formulaires simples en modale
(espace, zone, plante, tas de bois, intervention, tâche) ; sélecteur de date Android et web.
Types du front générés depuis le Swagger. Vérifié en mode web, en clair et en sombre.

**Test sur téléphone préparé** (Expo Go, même Wi-Fi) : profil de lancement API `lan`, URL de
l'API déduite de l'hôte Metro, guide et commandes pare-feu dans le
[README de jardo-app](jardo-app/README.md#tester-sur-téléphone). Pas encore testé sur un vrai
téléphone (sélecteur de date Android à vérifier).

**Étude de la carte du jardin validée** ([`docs/etude-carte-potager.md`](docs/etude-carte-potager.md),
avec un prototype cliquable). Scène modèle « maison mitoyenne », espaces cliquables (serre
comprise), ni liste ni voyant, nuit en mode sombre ; rendu recommandé avec Skia, à confirmer
par un essai sur téléphone. Données propres à la carte dans une table `GardenMapSlot`. Réalisation en phase 6,
en six étapes.

**Vision produit arrêtée.** Jardo passe du suivi d'arrosage à la gestion du jardin :
[`docs/vision-produit.md`](docs/vision-produit.md) et proposition de modèle
[`docs/modele-domaine.md`](docs/modele-domaine.md) (jardin, espaces typés, zones, éléments,
journal d'interventions, tâches). L'API l'implémente en entier, le front en a le socle.

**Backend `Jardo.Api` : migration vers le nouveau modèle terminée (4 étapes sur 4).**
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
  tâche recalculée) ; `dueTaskCount` sur chaque espace pour la liste du Jardin.
- Étape 4, bois de chauffage : `WoodPile`, sous-type de `GardenItem`, accepté dans un espace
  bois de chauffage seulement (essence, volume initial en stères, longueur des bûches, coupe,
  séchage en mois). Le stock restant (volume initial, plus les apports, moins les consommations
  du journal qui visent le tas) et l'état de séchage (en séchage ou prêt, avec la date) sont
  calculés à la lecture par `WoodPileCalculator`, jamais stockés ; un stock négatif est refusé à
  toute écriture ([détail](docs/modele-domaine.md#gardenitem-élément-suivi)). Endpoints
  `/api/wood-piles` (CRUD, archivage, liste par espace). Journal et tâches fonctionnent sur un
  tas sans code propre.
- Le seeder produit quelques semaines de journal (arrosages de zones et d'espaces, semis,
  plantations, taille du verger, récoltes, oïdium constaté puis traité) et seize tâches :
  arrosages de cultures, de carrés et d'une plante de verger, désherbage, taille d'hiver,
  compost annuel, traitement à renouveler, plantation faite ; les trois voyants y figurent. Trois tas
  de bois : un chêne sec en cours d'usage, un hêtre en séchage avec sa tâche « rentrer le bois », un
  bouleau épuisé et archivé.
- Pour le front : `itemKind` (`Plant` ou `WoodPile`) dans les DTOs de tâche et de journal, et
  « Fait » (`POST /api/tasks/{id}/done`) renvoie la tâche recalculée avec l'entrée notée, dont
  la suppression annule le « Fait ». Le journal n'est pas paginé.
- Contrat Swagger exact, pour générer les types du front : références non nulles, enums
  nullables, toutes les propriétés des réponses déclarées obligatoires
  (`ResponsePropertiesRequiredFilter`).
- Commentaires pédagogiques retirés : seuls restent ceux qui expliquent une décision non
  évidente. README recentré sur le produit.

**Front `jardo-app` : MVP en place sur le nouveau modèle.**
- Expo SDK 57 (React Native + TypeScript), Expo Router, TanStack Query.
- Contrats : types générés depuis le Swagger par `@hey-api/openapi-ts` (`openapi-typescript`
  exige TypeScript 5) dans `src/api/generated/`, régénérés par `npm run api:types`, API démarrée.
- Données : client `fetch` (`ApiError`, ProblemDetails), hooks TanStack Query pour jardin,
  espaces, zones, plantes, tas de bois, journal (filtres par cible et par type), tâches, tâches
  dues (aujourd'hui ou semaine) et « Fait ». Invalidations par famille : un « Fait » recharge
  tâches dues, journal, compteurs des espaces et stock des tas.
- Écrans : onglets Jardin · Aujourd'hui · Journal (Ionicons contour), fiches espace, zone,
  plante, tas de bois en onglets (tâches avec « Fait », celles héritées ou contenues repliées,
  éléments groupés par zone, journal, infos), formulaires en modale, page Réglages. Les anciens
  écrans (À arroser · Zones · Plantes) sont supprimés.
- Sélecteur de date `DateField` : calendrier natif d'Android (`@react-native-community/datetimepicker`,
  inclus dans Expo Go), `<input type="date">` sur le web, option « pas de date future ».
  Non testé sur téléphone.
- Charte v2 validée le 19/10 ([`docs/charte-graphique.md`](docs/charte-graphique.md)) : verts en
  clair, sarcelle en sombre, police Nunito. Appliquée au thème : toute l’app
  en profite sans toucher aux écrans.
- Icône et splash faits : pousse en pot sur fond crème, icône adaptative Android avec
  version monochrome, splash clair et sombre, favicon. Sources SVG dans `jardo-app/assets/source/`.
- Fondations UI : thème clair / sombre qui suit le téléphone ou le choix fait dans les
  réglages (`src/theme/`, `useTheme`, `createStyles`), échelle typographique, composants de base
  découpés dans `src/components/ui/`, dépendances inutiles du template retirées.
- Maquettes v2 et Design System (Claude Design) antérieurs à la charte v2 : non validés. Boutons,
  icône, splash et « une interface plus vivante » sont repris en phase 6.
- Écrans du MVP faits ([`docs/front-ecrans.md`](docs/front-ecrans.md)). Restent :
  - Jardin : la carte isométrique (phase 6) ;
  - Journal : chargement progressif. L'API renvoie tout le journal d'un coup : il faudrait
    d'abord une pagination côté API (un curseur sur la date et l'identifiant, par exemple) ;
  - « Fait » précisé : l'appui long se découvre mal, à revoir avec la refonte du design ;
  - Zone et fiches : déplacer un élément vers un autre espace, archiver depuis la liste ;
  - Formulaires : contrôles locaux plus fins.
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
  dépendances inutiles. Fait. Sélecteur de date fait avec le socle des écrans.

**Phase 3 : vision et modèle du jardin**
- Vision produit et proposition de modèle du domaine. Fait.
- API, une PR par étape ([détail](docs/modele-domaine.md#stratégie-de-migration)) :
  1. jardin, espaces typés, zones, plantes avec variété et quantité. Fait ;
  2. journal d'interventions unifié. Fait ;
  3. tâches récurrentes et calculateur d'échéance générique (l'arrosage en devient une). Fait ;
  4. tas de bois de chauffage, stock et séchage calculés. Fait. La phase est terminée.

**Phase 4 : écrans du nouveau MVP**
- Refonte des écrans sur la charte actuelle (le design est repris en phase 6) : onglets Jardin (accueil) · Aujourd'hui · Journal, espaces, fiches,
  formulaires avec sélecteur de date. Socle fait (B1) ; restent les fiches détaillées et les
  formulaires complets.

**Phase 5 : qualité**
- CI GitHub Actions. Fait.
- Types du front générés depuis l'OpenAPI. Fait.
- Tests du front.

**Phase 6 : après le MVP**
- Refonte du design en premier : charte (couleurs, mode sombre), typographie, boutons, une
  interface plus vivante, avec des skills de design (frontend-design).
- Carte isométrique dans l'onglet Jardin (premier chantier, [étapes](docs/etude-carte-potager.md#étapes-livrables)),
  notifications, récoltes chiffrées, photos,
  catalogue d'espèces, autres types d'espaces, météo, foyer partagé.

**Phase 7 : vers le Play Store**
- Test sur téléphone (Expo Go), données sur le téléphone ([migration en sept PR](docs/etude-architecture-donnees.md#plan-de-migration)),
  APK pour la famille par EAS, puis fiche Play Store.

## À décider

- **E-mail pro dans l'historique Git.** Le dépôt est public et ses premiers commits portent
  l'adresse professionnelle. Option : réécrire l'historique puis forcer le push.
