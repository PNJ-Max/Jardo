# Front Jardo : architecture

Application mobile Android pour gérer son jardin. Ses données vivent sur le téléphone, dans une
base SQLite : l'app marche sans réseau ni serveur. L'ancienne API .NET `Jardo.Api` a été retirée
de la [migration « local d'abord »](etude-architecture-donnees.md#plan-de-migration) (étape 6) ;
le tag `api-dotnet` en garde le dernier état.

## Décision : Expo (React Native + TypeScript)

Le front est une **vraie app native**, pas un site web installé. Le choix tient en trois critères :

1. **Test immédiat sur le téléphone.** `npx expo start` affiche un QR code. On le scanne avec
   l'app *Expo Go* et l'app tourne sur le téléphone en direct. Aucun HTTPS ni hébergement n'est
   nécessaire pendant le développement.
2. **APK sans Android Studio.** `eas build` compile dans le cloud et renvoie un lien
   d'installation. Pas de SDK Android à configurer sur Windows.
3. **Natif quand il le faut.** Notifications d'arrosage, appareil photo pour les observations,
   stockage local : tout est disponible via des modules Expo.

**Alternatives écartées :**

- *Angular PWA* : pas de vraies notifications sur iPhone, pas d'APK, et il faut du HTTPS
  dès le premier test sur téléphone.
- *Ionic + Capacitor* : demande Android Studio et le SDK Android en local, et le rendu
  reste celui d'une page web.
- *.NET MAUI* : outillage lourd et écosystème plus mince, ce qui complique le développement
  assisté par IA.
- *Flutter* : très bon, mais Dart serait le seul usage de ce langage dans le projet.

## Pile technique

| Besoin | Choix | Pourquoi |
|---|---|---|
| Framework | Expo SDK 57, TypeScript strict | Standard actuel de React Native |
| Navigation | **Expo Router** | Routes basées sur les fichiers, onglets et piles prêts à l'emploi |
| Cache des données | **TanStack Query** | Cache, rechargement, états chargement/erreur, mises à jour optimistes ; les hooks appellent les services locaux |
| Formulaires | `useState` + validation légère, erreurs des services sous les champs | Suffisant pour six formulaires simples |
| Dates | `@react-native-community/datetimepicker` sur Android, `<input type="date">` sur le web | Recommandé par Expo et inclus dans Expo Go ; le module n'existe pas sur le web |
| Style | `StyleSheet` + `src/theme/` (`useTheme`, `createStyles`) | Aucune dépendance ; suit le mode clair / sombre du téléphone, ou celui choisi dans les réglages ; jetons décrits dans la [charte graphique](charte-graphique.md) |
| Réglages sur l'appareil | `@react-native-async-storage/async-storage` | Inclus dans Expo Go ; `localStorage` sur le web. Ne garde que l'apparence choisie |
| Sauvegarde | `expo-sharing`, `expo-file-system`, `expo-document-picker` | Inclus dans Expo Go. Export dans la feuille de partage, import d'un fichier choisi ; sur le web, téléchargement et `File` du navigateur |
| Base locale | `expo-sqlite` (fichier `jardo.db`), SQL écrit à la main ; `expo-crypto` pour les UUID | Inclus dans Expo Go ; choix argumentés dans l'[étude des données](etude-architecture-donnees.md#la-cible-technique). Ouverte et migrée au démarrage, lue et écrite par tous les écrans |
| Polices | `@expo-google-fonts/nunito` + `expo-font` | Chargée au démarrage, écran de démarrage maintenu jusque-là |
| Icônes | `@expo/vector-icons` (Ionicons) | Inclus dans Expo |
| Carte du jardin | `@shopify/react-native-skia` (v2), `react-native-gesture-handler`, `react-native-reanimated` | Net à tout zoom, dessin sur le thread UI ; inclus dans Expo Go. Sur le web, `canvaskit.wasm` est copié dans `public/` par le script `postinstall`. Choix argumenté dans l'[étude de la carte](etude-carte-potager.md#essai-du-2110--décision) |
| Notifications (plus tard) | `expo-notifications` | Rappel d'arrosage local |

Rien de plus. Pas de Redux : TanStack Query couvre l'état des écrans, et l'état local reste
dans `useState`.

## Structure

```
jardo-app/                    (à la racine du repo)
├── src/app/                  écrans, un fichier = une route (Expo Router)
│   ├── (tabs)/
│   │   ├── index.tsx         Jardin : les espaces (accueil)
│   │   ├── today.tsx         Aujourd'hui : les tâches dues et « Fait »
│   │   └── journal.tsx       Journal : la chronologie du jardin
│   ├── space/[id].tsx        détail d'un espace (tâches, zones, éléments, journal)
│   ├── zone/[id].tsx         détail d'une zone
│   ├── plant/[id].tsx        fiche plante
│   ├── wood-pile/[id].tsx    fiche tas de bois
│   ├── */form.tsx            formulaires en modale : space, zone, plant, wood-pile,
│   │                         entry (intervention), task ; ?id= pour modifier
│   ├── task/done.tsx         « Fait » en précisant le jour et une note (appui long)
│   ├── settings.tsx          réglages : nom du jardin, sauvegarde, apparence, version de l'app
│   └── map-preview.tsx       aperçu de la carte du jardin (avant l'onglet Jardin)
├── src/api/
│   ├── types.ts              noms courts des contrats (Space, GardenTask…), la référence des écrans
│   └── queries.ts            hooks TanStack Query sur les services locaux, clés de cache, invalidations
├── src/domain/               règles et calculs purs (échéances, bois, journal, types acceptés)
├── src/data/                 base locale SQLite : accès, schéma et migrations, jardin d'exemple,
│                             un service par ressource, services.tsx (fournisseur des écrans)
├── src/components/ui/        briques de base (boutons, carte, champs, date, pastille, états)
├── src/components/           lignes et sections métier (tâche, intervention, espace, élément)
├── src/components/map/       carte : gestes, rendu Skia, étiquettes
├── src/map/                  scènes de la carte dessinées par le code : projection, décor,
│                             un fichier par modèle, emplacements
├── src/lib/                  vocabulaire du domaine, dates, confirmations, navigation,
│                             fichier de sauvegarde (partage, choix ; variante web)
├── src/theme/                palettes clair / sombre, typographie, useTheme, createStyles,
│                             apparence choisie (preference.ts)
└── app.json                  configuration Expo
```

## Contrats des écrans

`src/api/types.ts` est la référence : il nomme pour les écrans les types écrits à la main dans
`src/domain/types.ts` (vocabulaire, `Id`) et dans les services de `src/data/` (`Space`,
`GardenTask`, `SpaceInput`…), de la forme des anciens DTO de l'API. Les identifiants sont des UUID
en chaîne, dans les routes (`/space/<uuid>`), les paramètres et les formulaires.

## Domaine (`src/domain/`)

Premier pas de la [migration « local d'abord »](etude-architecture-donnees.md#plan-de-migration) :
le portage en TypeScript de la logique pure de l'API. Les services de `src/data/` s'en servent à
chaque lecture ; les écrans affichent ce qu'ils renvoient.

- **Du code pur** : ni SQLite, ni React, ni horloge. La date du jour est un paramètre, comme
  `TimeProvider` côté .NET. Les tests (`__tests__/domain/`) sont le portage des tests C#.
- **Les jours sont des chaînes `YYYY-MM-DD`** (`dates.ts`), comparées telles quelles ; l'arithmétique
  passe par `Date.UTC`, jamais par le fuseau du téléphone.
- `due-date.ts` : `calculateDueState` (échéance, voyant, jours de retard) ; `wood-pile.ts` :
  `remainingSteres` et `drying` ; `latest-interventions.ts` : `latestInterventions(rows, kind)`,
  la dernière intervention qui vaut pour une cible, à partir de lignes déjà lues.
- `types.ts` : le vocabulaire (types d'espace, d'élément, d'intervention, rythmes, statuts) ;
  `kinds.ts` : ce que chaque type d'espace accepte, et les libellés des messages d'erreur.
- Les identifiants sont des chaînes (`Id`), les UUID de la base locale.
- `src/lib/garden.ts` garde le vocabulaire d'affichage (libellés, icônes, ordre des choix) ; ce
  qu'il propose suit les règles d'acceptation de `kinds.ts`.

## Données locales (`src/data/`)

Étape 2 de la même migration : la base SQLite du téléphone. `SQLiteProvider` (dans
`src/app/_layout.tsx`) ouvre `jardo.db` et la migre au démarrage, l'écran de démarrage restant
affiché jusque-là. Tous les écrans la lisent, par les services (étapes 3 et 4) que la bascule
(étape 5) a branchés.

- **`db.ts` : l'interface `Db`**, la seule porte vers la base : `exec` (script sans paramètres),
  `run`, `all`, `first` (paramètres `?` positionnels, valeurs `string | number | null`) et
  `transaction`. `fromExpo` l'adapte à expo-sqlite ; sous Jest, la même interface tourne sur
  `node:sqlite`. Les transactions passent l'une après l'autre (une file), car l'app n'a qu'une
  connexion : deux « Fait » tapés vite ne doivent pas ouvrir deux `BEGIN`. Une seule instance de
  `Db` par connexion, sinon la file ne protège plus rien. Pas de transaction imbriquée.
- **Seulement les API asynchrones d'expo-sqlite** (`execAsync`, `getAllAsync`…) : sur le web,
  les API `…Sync` exigent `SharedArrayBuffer` et des en-têtes que le serveur de dev n'envoie pas.
- **`migrations.ts` : le schéma**, en SQL écrit à la main, repris de `GardenDbContext` avec ses
  contraintes (noms uniques, clés étrangères et leurs `CASCADE` / `RESTRICT`, table unique
  `garden_items` pour les plantes et les tas de bois). Une liste ordonnée de scripts : le rang
  d'un script est la version (`PRAGMA user_version`) qu'il donne à la base. Chaque migration
  tourne dans une transaction, version comprise. **Une migration publiée ne se modifie plus** :
  on en ajoute une à la fin, et le test « migrent une base de chaque version précédente » la
  couvre aussitôt. Une base plus récente que l'app est refusée.
- **Conventions du schéma** : tables et colonnes en `snake_case` (les services feront la
  correspondance avec les DTO en camelCase), tables `STRICT` (une valeur du mauvais type est
  refusée), identifiants UUID v4 en texte (`randomUUID()` d'`expo-crypto`), jours `YYYY-MM-DD`,
  instants ISO 8601 UTC (`toISOString()`), booléens en 0 ou 1. Le jardin unique est créé par la
  première migration, avec un UUID tiré au hasard. Pour départager deux lignes au même instant
  (l'API utilisait l'identifiant entier), le `rowid` de SQLite suit l'ordre d'insertion.
- **`database.ts` : `prepareDatabase`**, à chaque ouverture : `PRAGMA foreign_keys = ON` (réglé
  par connexion, sans lui SQLite ignore les clés étrangères), migrations, puis le jardin
  d'exemple si demandé. `initDatabase` est le `onInit` du `SQLiteProvider`.
- **`example-garden.ts` : le jardin d'exemple** de `DbSeeder`, carte comprise, daté par rapport
  au jour. Seulement en développement (`__DEV__`) et seulement si le jardin n'a aucun espace : une
  installation publiée démarre sur un jardin vide.

**Le mode web.** expo-sqlite web est en alpha : SQLite en wasm dans un worker, la base dans
l'OPFS du navigateur. Il marche, avec trois conditions :

- `web.output` vaut `"single"` dans `app.json`. En `"static"`, le rendu côté serveur du serveur de
  dev échoue (« Worker chunk not found for … expo-sqlite/web/worker.ts ») : le bundle paresseux
  n'embarque pas le worker. Un rendu côté serveur n'apporte rien à une app dont les données sont
  dans le navigateur.
- `metro.config.js` déclare l'extension `wasm`.
- **Un seul onglet de l'app à la fois.** L'OPFS réserve la base à un onglet : un second reste
  blanc, avec `NoModificationAllowedError` dans la console. Fermer l'autre onglet et recharger.

**Repartir d'une base neuve.** Le jardin d'exemple ne se rajoute pas tant qu'il reste un espace,
et une base migrée par une autre branche peut être plus récente que l'app. Sur le web : outils
de développement → Application → Stockage → « Effacer les données du site » pour
`localhost:8081`. Dans Expo Go : vider les données d'Expo Go (paramètres Android de l'app).

### Services locaux

Étapes 3 et 4 de la même migration : un module par ressource, qui reprend les règles du service
.NET du même nom (à lire au tag `api-dotnet`). Les écrans les appellent depuis l'étape 5.

**Comment les écrans les atteignent.** `services.tsx` : `createServices(db, clock)` rend tous les
services sur une même base, et `ServicesProvider` les met à disposition des hooks
(`useServices()`). Dans l'app, `src/app/_layout.tsx` les crée une seule fois, sous le
`SQLiteProvider`, à partir de sa connexion (`fromExpo`) : une seule instance de `Db` par connexion,
sinon la file des transactions ne protège plus rien. Les hooks de `src/api/queries.ts` appellent
ces services avec les mêmes clés de cache et les mêmes invalidations qu'avec l'API ; une lecture
qui échoue n'est pas retentée (`retry: false`), elle échouerait encore.

| Module | Équivalent .NET |
|---|---|
| `garden.ts` | `GardenService` |
| `garden-map.ts`, `garden-layouts.ts` | `GardenMapService`, `GardenLayouts` |
| `spaces.ts` | `SpaceService` |
| `zones.ts` | `ZoneService` |
| `plants.ts` | `PlantService` |
| `wood-piles.ts` | `WoodPileService` |
| `journal.ts` | `JournalService` |
| `tasks.ts` | `TaskService` |
| `item-placement.ts` | `ItemPlacement` (plantes et tas de bois) |
| `intervention-target.ts` | `InterventionTarget` : la cible d'une entrée ou d'une tâche, et le filtre SQL d'une lecture par cible |
| `wood-movements.ts` | `WoodMovements` : apports et consommations d'un tas, lus au journal |
| `task-queries.ts` | `TaskQueries` : la lecture des tâches avec leur échéance (`GardenTask`) et le compte des tâches dues par espace |
| `backup.ts`, `backup-rules.ts` | Sans équivalent : l'export et l'import de tout le jardin ([format et règles](etude-architecture-donnees.md#la-sauvegarde-livrée)) |

- **Une fabrique par service**, comme le constructeur d'une classe : `createSpaceService(db, clock)`
  rend l'objet qui porte `getAll`, `getById`, `create`, `update`, `setArchived`, `delete`, les
  mêmes noms que l'interface C#. `Clock` (`clock.ts`, une fonction qui rend un `Date`) tient la
  place de `TimeProvider`.
- **Réponses de la même forme que les DTO** (`Space`, `Plant`, `Zone`, `Garden`, `GardenMap`),
  avec des identifiants en chaîne et les noms de colonnes en `snake_case` convertis en camelCase.
  Les types d'entrée (`SpaceInput`, `PlantInput`…) reprennent les `Save…Dto`.
- **Toute écriture passe par `db.transaction`**, vérifications comprises : une écriture isolée
  entrerait dans la transaction en cours, s'il y en a une, et partirait avec elle si elle est
  annulée. La transaction rend la main avant la relecture de la réponse. Un service n'en ouvre
  jamais depuis l'intérieur d'une autre : la file attendrait sa propre fin.
- **Erreurs** (`problem.ts`) : `ProblemError` porte `status`, `problem` (titre, détail, erreurs
  par champ) et `fieldError()`, comme `ApiError`. `businessRule(…)` donne le 400 « Opération
  refusée » de `BusinessRuleException`, `notFound(…)` le 404 de `NotFoundException`. La
  validation de forme que faisaient les DataAnnotations (`validation.ts`) lève un 400 avec les
  erreurs par champ, clés en PascalCase comme celles de l'API (`Name`, `Kind`…) : les formulaires
  les affichent sous le champ, en français.
- **« Fait » et le stock de bois sont atomiques.** `tasks.complete` lit la tâche et note l'entrée
  dans une seule transaction (`insertJournalEntry`, exportée par `journal.ts`, n'ouvre pas la
  transaction elle-même). Le stock d'un tas se vérifie dans la transaction de l'écriture qui le
  touche : il ne passe jamais sous zéro, même avec deux consommations tapées vite. À égalité
  d'échéance et d'espace, les tâches suivent l'ordre de création (`rowid`).
- **Le catalogue des modèles de carte** (`garden-layouts.ts`) est une constante. Les deux modèles
  posent les mêmes neuf emplacements ; un test le confronte à `SLOT_KEYS` de la carte.
- **Tests** (`__tests__/data/`) : un fichier par service, d'abord les cas de l'original C#
  (même scénario, même nom), puis les « ajouts » que l'original ne couvrait pas. Les données de
  départ s'insèrent directement (`createGardenFixtures`, l'équivalent de `TestData`).

## Conventions

- **Le voyant vient du domaine.** Les services calculent, à chaque lecture et avec `src/domain/`,
  le `status` d'une tâche (`Ok` / `DueSoon` / `Overdue`), `daysOverdue` et `nextDueDate`, le stock
  et le séchage d'un tas de bois. Les écrans les affichent tels quels et ne recalculent jamais
  rien : un seul endroit porte la règle, sinon deux calculs finiraient par diverger.
- **Erreurs.** Un service qui refuse lève une `ProblemError` au format du ProblemDetails
  (RFC 9457) : titre, détail, erreurs par champ. `fieldError(error, 'name')` (`components/ui/form.tsx`)
  affiche une erreur de validation sous son champ ; `FormError`, en bas du formulaire, ce qui ne
  vise aucun champ (règle métier refusée, ressource introuvable).
- **Dates.** Les dates du jardin sont des `DateOnly` : on les manipule en chaîne `YYYY-MM-DD`,
  sans conversion de fuseau. Le champ de date (`DateField`) peut interdire les jours futurs.
- **Mise à jour optimiste** pour « Fait » : la tâche quitte les listes de tâches dues aussitôt,
  et revient si l'écriture est refusée. Le service renvoie l'entrée notée ; « Annuler » la supprime.
- **La fiche d'un élément** s'ouvre selon le `itemKind` (`Plant`, `WoodPile`) que les services
  renvoient avec les tâches et le journal.
- **Invalidations par famille de ressources.** Une intervention ou un « Fait » recharge le
  journal, les tâches, les compteurs des espaces et les tas de bois ; une tâche, les tâches et
  les espaces ; un espace, une zone ou un élément, tout le jardin (`src/api/queries.ts`).
- **Mobile-first, une main.** Les actions principales sont en bas de l'écran, avec de
  grandes zones de toucher.
- **Commentaires** : on explique *pourquoi*, pas ce que fait la ligne.

## Lancer et tester sur téléphone

En web (`npm run web`, port 8081) comme dans Expo Go, il suffit de Metro : aucun serveur, aucun
réseau pour les données (voir [Tester sur téléphone](../jardo-app/README.md#tester-sur-téléphone)).

## Tests

```bash
npm --prefix jardo-app test              # tous les tests, une fois
npx jest -t "Fait"                       # (dans jardo-app/) ceux dont le nom contient « Fait »
npx jest --watch                         # (dans jardo-app/) relance à chaque changement
```

Jest avec le preset `jest-expo` et React Native Testing Library, comme le recommande la
[doc Expo](https://docs.expo.dev/develop/unit-testing/). Les tests vivent dans
`jardo-app/__tests__/` (jamais sous `src/app/`, où chaque fichier est une route), les aides
dans `jardo-app/test/`.

- **Les écrans tournent sur la couche locale**, une vraie SQLite en mémoire : rien n'est simulé
  entre l'écran et la base. `const services = await createTestServices()` (`test/render.tsx`)
  rend les services sur une base neuve ; le test y prépare ses données par les services eux-mêmes
  (`services.spaces.create(…)`), donc avec leurs règles. Les dates se placent par rapport au jour
  (`addDays(today(), -2)`), comme l'horloge des services.
- **`await renderScreen(<Ecran />, services)`** monte l'écran sur ces services (sur une base neuve
  s'ils sont omis), avec un cache neuf et le fournisseur d'« Annuler », et les rend pour vérifier
  la base après coup. RNTL 14 est asynchrone : `await` sur `render` et `fireEvent`.
- **Une panne ou une attente** se provoque sur le service lui-même :
  `jest.spyOn(services.tasks, 'getDue').mockRejectedValueOnce(…)`, ou une implémentation qui
  attend une promesse libérée par le test pour observer l'écran pendant l'écriture.
- **La base locale se teste sur une vraie SQLite en mémoire** (`test/db.ts`, `node:sqlite` de
  Node, sans dépendance) : `await createTestDb()` rend une base migrée comme l'app l'ouvre,
  `createTestDb({ exampleGarden: true })` avec le jardin d'exemple, `createMemoryDb()` une base
  vide pour tester les migrations. Les clés étrangères y sont désactivées à l'ouverture, comme
  dans expo-sqlite : c'est `prepareDatabase` qui les active. Node affiche un avertissement
  « SQLite is an experimental feature » : il est attendu.
- `test/setup.ts` simule `expo-router` (`router.push` est un `jest.fn`), les marges de sécurité,
  AsyncStorage et `randomUUID` d'`expo-crypto` (par celui de Node).
- On cherche par texte ou libellé d'accessibilité, comme l'utilisateur ; pas de test du rendu
  exact des styles. Un module natif absent de Jest se simule dans le test qui en a besoin
  (voir `date-field.test.tsx`).

## Hors périmètre du MVP

Authentification, synchronisation entre appareils, iOS (possible plus tard avec le même code),
publication sur le Play Store.
