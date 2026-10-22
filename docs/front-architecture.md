# Front Jardo : architecture

Application mobile Android pour gérer son jardin. Elle consomme l'API
`Jardo.Api`, sans autre back-end.

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
| Données serveur | **TanStack Query** | Cache, rechargement, états chargement/erreur, mises à jour optimistes |
| Client API | `fetch` + types générés depuis le Swagger de l'API par `@hey-api/openapi-ts` | Contrat toujours aligné sur l'API ; `openapi-typescript` exige TypeScript 5, `@hey-api/openapi-ts` accepte TypeScript 6 |
| Formulaires | `useState` + validation légère, erreurs de l'API sous les champs | Suffisant pour six formulaires simples |
| Dates | `@react-native-community/datetimepicker` sur Android, `<input type="date">` sur le web | Recommandé par Expo et inclus dans Expo Go ; le module n'existe pas sur le web |
| Style | `StyleSheet` + `src/theme/` (`useTheme`, `createStyles`) | Aucune dépendance ; suit le mode clair / sombre du téléphone, ou celui choisi dans les réglages ; jetons décrits dans la [charte graphique](charte-graphique.md) |
| Réglages sur l'appareil | `@react-native-async-storage/async-storage` | Inclus dans Expo Go ; `localStorage` sur le web. Ne garde que l'apparence choisie |
| Polices | `@expo-google-fonts/nunito` + `expo-font` | Chargée au démarrage, écran de démarrage maintenu jusque-là |
| Icônes | `@expo/vector-icons` (Ionicons) | Inclus dans Expo |
| Carte du jardin | `@shopify/react-native-skia` (v2), `react-native-gesture-handler`, `react-native-reanimated` | Net à tout zoom, dessin sur le thread UI ; inclus dans Expo Go. Sur le web, `canvaskit.wasm` est copié dans `public/` par le script `postinstall`. Choix argumenté dans l'[étude de la carte](etude-carte-potager.md#essai-du-2110--décision) |
| Notifications (plus tard) | `expo-notifications` | Rappel d'arrosage local |

Rien de plus. Pas de Redux : TanStack Query couvre l'état serveur, et l'état local reste
dans `useState`.

## Structure

```
jardo-app/                    (à la racine du repo, à côté de Jardo.Api)
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
│   ├── settings.tsx          réglages : nom du jardin, apparence, version de l'app
│   └── map-preview.tsx       aperçu de la carte du jardin (avant l'onglet Jardin)
├── src/api/
│   ├── generated/            types générés depuis le Swagger (ne pas modifier)
│   ├── types.ts              noms courts des contrats (Space, GardenTask…)
│   ├── client.ts             fetch, ApiError (ProblemDetails), query string
│   └── queries.ts            hooks TanStack Query, clés de cache, invalidations
├── src/domain/               règles et calculs purs (échéances, bois, journal), pas encore branchés
├── src/components/ui/        briques de base (boutons, carte, champs, date, pastille, états)
├── src/components/           lignes et sections métier (tâche, intervention, espace, élément)
├── src/components/map/       carte : gestes, rendu Skia, étiquettes
├── src/map/                  scènes de la carte dessinées par le code : projection, décor,
│                             un fichier par modèle, emplacements
├── src/lib/                  vocabulaire du domaine, dates, confirmations, navigation
├── src/theme/                palettes clair / sombre, typographie, useTheme, createStyles,
│                             apparence choisie (preference.ts)
└── app.json                  configuration Expo
```

## Contrat de l'API

Les types de `src/api/generated/` sont générés depuis `/swagger/v1/swagger.json`. Après un
changement de DTO côté .NET, API démarrée :

```bash
npm --prefix jardo-app run api:types
```

Le fichier généré est commité : le front compile sans l'API. Côté API, `Program.cs` configure
Swagger pour que le contrat soit exact (types de référence non nuls, enums nullables, propriétés
des réponses toujours présentes via `ResponsePropertiesRequiredFilter`).

## Domaine (`src/domain/`)

Premier pas de la [migration « local d'abord »](etude-architecture-donnees.md#plan-de-migration) :
le portage en TypeScript de la logique pure de l'API, pour que l'app la porte un jour seule.
**Aucun écran ne l'appelle encore** (étape 5) ; les écrans suivent l'API.

- **Du code pur** : ni SQLite, ni React, ni horloge. La date du jour est un paramètre, comme
  `TimeProvider` côté .NET. Les tests (`__tests__/domain/`) sont le portage des tests C#.
- **Les jours sont des chaînes `YYYY-MM-DD`** (`dates.ts`), comparées telles quelles ; l'arithmétique
  passe par `Date.UTC`, jamais par le fuseau du téléphone.
- `due-date.ts` : `calculateDueState` (échéance, voyant, jours de retard) ; `wood-pile.ts` :
  `remainingSteres` et `drying` ; `latest-interventions.ts` : `latestInterventions(rows, kind)`,
  la dernière intervention qui vaut pour une cible, à partir de lignes déjà lues.
- `types.ts` : le vocabulaire (types d'espace, d'élément, d'intervention, rythmes, statuts) ;
  `kinds.ts` : ce que chaque type d'espace accepte, et les libellés des messages d'erreur.
- Les identifiants sont des chaînes (`Id`), ceux de la future base locale.
- `src/lib/garden.ts` garde le vocabulaire d'affichage (libellés, icônes) et ses propres règles
  d'acceptation, qui seront ramenées sur `kinds.ts` à la bascule.

## Conventions

- **Le voyant vient du serveur.** On affiche le `status` d'une tâche (`Ok` / `DueSoon` / `Overdue`),
  `daysOverdue` et `nextDueDate` tels quels. Le front ne recalcule jamais l'échéance, ni le stock
  ou le séchage d'un tas de bois : c'est la règle posée côté API.
- **Erreurs.** L'API renvoie du ProblemDetails (RFC 9457). Un seul utilitaire transforme
  une réponse d'erreur en message lisible pour l'écran.
- **Dates.** Les dates du jardin sont des `DateOnly` : on les manipule en chaîne `YYYY-MM-DD`,
  sans conversion de fuseau. Le champ de date (`DateField`) peut interdire les jours futurs.
- **Mise à jour optimiste** pour « Fait » : la tâche quitte les listes de tâches dues aussitôt,
  et revient si l'API refuse. L'API renvoie l'entrée notée ; « Annuler » la supprime.
- **La fiche d'un élément** s'ouvre selon le `itemKind` (`Plant`, `WoodPile`) que l'API renvoie
  avec les tâches et le journal.
- **Invalidations par famille de ressources.** Une intervention ou un « Fait » recharge le
  journal, les tâches, les compteurs des espaces et les tas de bois ; une tâche, les tâches et
  les espaces ; un espace, une zone ou un élément, tout le jardin (`src/api/queries.ts`).
- **Mobile-first, une main.** Les actions principales sont en bas de l'écran, avec de
  grandes zones de toucher.
- **Commentaires** : comme dans le back, on explique *pourquoi*, pas ce que fait la ligne.

## Connexion à l'API

**Pour l'instant, tout tourne sur le PC** : l'app en mode web dans le navigateur
(`npm run web`, port 8081) ou sur un téléphone via Expo Go, l'API sur le port 5015. Par défaut
rien n'est exposé sur le réseau ; le profil de lancement `lan` ouvre l'API au Wi-Fi local
(voir [Tester sur téléphone](../jardo-app/README.md#tester-sur-téléphone)).

- L'URL de l'API est résolue dans `src/api/client.ts` : `EXPO_PUBLIC_API_URL` si elle est
  définie (`jardo-app/.env.local`), sinon, sur mobile, l'hôte du serveur Metro
  (`Constants.expoConfig.hostUri`) sur le port 5015, sinon `http://localhost:5015` (web).
- La politique CORS `FrontDev` de `Program.cs` autorise `http://localhost:8081`. Elle ne sert
  qu'au mode web : une app native n'est pas soumise à CORS.
- Test sur téléphone et hébergement HTTPS : plus tard, depuis le PC perso (voir la roadmap).

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

- **L'API est simulée au niveau de `fetch`** : `mockApi({ 'GET /api/tasks/due?horizon=Week': { body: [...] } })`
  (`test/api.ts`). Le vrai client, les hooks TanStack Query et l'écran tournent ; une route non
  déclarée fait échouer le test. Un handler peut être une fonction (réponse qui dépend de la
  requête, ou promesse qu'on libère à la main pour observer l'écran pendant l'attente).
  `problem(400, { Name: ['…'] })` fabrique une erreur de validation.
- **`await renderScreen(<Ecran />)`** (`test/render.tsx`) monte l'écran avec un cache neuf et le
  fournisseur d'« Annuler ». RNTL 14 est asynchrone : `await` sur `render` et `fireEvent`.
- `test/fixtures.ts` : `space()`, `task()`, des DTO complets à surcharger.
- `test/setup.ts` simule `expo-router` (`router.push` est un `jest.fn`), les marges de sécurité
  et AsyncStorage.
- On cherche par texte ou libellé d'accessibilité, comme l'utilisateur ; pas de test du rendu
  exact des styles. Un module natif absent de Jest se simule dans le test qui en a besoin
  (voir `date-field.test.tsx`).

## Hors périmètre du MVP

Authentification, mode hors-ligne complet, iOS (possible plus tard avec le même code),
publication sur le Play Store.
