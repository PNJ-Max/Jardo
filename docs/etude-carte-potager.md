# Étude : la carte du jardin

Étude de conception validée par Maxime le 18/10/2026, sans code. Elle prépare le premier
chantier d'après le MVP ([vision produit](vision-produit.md#étapes-suivantes)) : la carte
isométrique dans l'onglet Jardin.

**Prototype cliquable :** [Carte du jardin Jardo](https://claude.ai/artifact/1UtTDmxnhgMPHBJpNL4gNS)
(artifact privé, à partager depuis son menu).

## Vision

L'onglet Jardin, l'accueil, montre une maquette illustrée du jardin vue d'en haut, « comme un
village de Clash of Clans », mais sobre et conforme à la [charte](charte-graphique.md). Chaque
espace typé du jardin y est dessiné à sa place : la maison, le verger, les petits fruits, le
potager et ses carrés, la serre, le bois de chauffage.

- Toucher un élément ouvre l'écran de l'espace, ou de la zone pour un carré du potager.
- La carte ne porte ni liste ni voyant : les tâches dues, arrosage compris, vivent dans
  l'onglet Aujourd'hui.
- La carte se zoome et se déplace à deux doigts, passe à la nuit en mode sombre et s'anime
  discrètement.

La carte n'est pas dans le MVP : l'onglet Jardin y est la liste des espaces. Juste après, la
carte remplace cette liste dans le même onglet.

## Décisions

| Sujet | Décision |
|---|---|
| Construction du jardin | **Scène modèle.** Deux ou trois modèles de maison et de jardin, choisis à la configuration de l'app. Au départ, un seul : « maison mitoyenne, jardin en longueur ». Pas d'éditeur libre. |
| Variantes | Certains emplacements se règlent à la configuration : potager de 1 à 4 carrés, serre ou non. |
| Élément touché | Ouvre un **espace** (verger, petits fruits, potager, serre, bois). Un carré du potager ouvre une **zone**. Maison, terrasse, cabanon et clôture sont du décor. |
| Ce qui est dessiné | Les espaces, pas chaque sujet : « 3 pommiers » est un seul élément de quantité 3, et le Verger garde le même dessin. |
| Espace ou zone sans emplacement | Listé dans une bande « Hors carte » sous la carte, et toujours accessible depuis l'onglet Jardin. |
| Style | 2D axonométrique illustrée : une maquette posée sur un socle, dans la palette de la charte. |
| Fond | Sobre : socle neutre, comme une maquette d'architecte, et fond gris neutre en mode sombre. Variante à affiner. |
| Angle | **Dans l'axe du jardin** : rotation de 20°, plongée de 50°. Le jardin monte dans l'écran et remplit un téléphone tenu en portrait. |
| Visuels | SVG dessinés sur mesure (voir [Source des visuels](#source-des-visuels)). |
| Tâches | **Ni liste ni voyant** sur la carte (arbitrage du 18/10, validé par Maxime). Les tâches dues vivent dans l'onglet Aujourd'hui. |
| Étiquettes | Le nom des espaces est toujours affiché, celui des carrés à partir d'un zoom de ×1,45. Les étiquettes sont aussi des cibles de toucher et de clavier. |
| Zoom et déplacement | Pincer pour zoomer (×0,8 à ×5), glisser pour se déplacer, double-tap pour zoomer, bouton pour recentrer. |
| Mode sombre | La scène passe à la nuit : fenêtres et lampes allumées, lucioles. |
| Animations | Balancement léger des feuillages, rebond de l'élément touché, lucioles la nuit. Coupées si le téléphone demande de réduire les animations. |
| Navigation | Onglets Jardin · Aujourd'hui · Journal. La carte est le contenu de l'onglet Jardin, l'accueil. Un bouton de l'en-tête affiche la liste des espaces (l'écran Jardin du MVP), qui reste la voie accessible aux lecteurs d'écran. |
| Saisons | Plus tard. |

## Options écartées

- **Éditeur libre sur grille**, à la Clash of Clans : trop de conception demandée à
  l'utilisateur pour un premier usage. Le modèle de données permet de l'ajouter plus tard.
- **3D temps réel** (react-three-fiber + expo-gl) : modèles 3D à produire, poids, support
  d'Expo Go et du web non documenté (voir le [comparatif](#rendu--comparatif-technique)).
  Clash of Clans lui-même affiche des images 2D pré-rendues.
- **Isométrie vraie à 45°** : un jardin en longueur se couche en travers d'un écran en portrait,
  reste petit, et le mur mitoyen proche en cache une partie. Le prototype permet de comparer.
- **Vue de face** : plus simple à dessiner, mais plate, sans effet de maquette.
- **Pack libre de droits** (type Kenney) : style « jeu » générique, palette à retoucher.
- **Illustrateur** : coût et délai, et chaque nouvel élément du catalogue repasse par lui.
  Reste possible plus tard, sur le même gabarit.
- **Génération par IA** : cohérence entre éléments difficile, droits d'usage commercial
  incertains selon l'outil.
- **Une section « fruitiers » à part, un élément par arbre** : remplacée par les espaces typés
  de la vision. Le pommier est un élément de l'espace Verger, que la carte ouvre.
- **Pastilles de tâches dues sur la carte** : essayées dans le prototype, puis écartées par
  l'arbitrage du 18/10. La carte sert à se repérer et à naviguer, l'onglet Aujourd'hui liste
  les tâches. Le voyant d'arrosage par élément du premier brief tombe pour la même raison.
- **Socle vert** (première version du prototype) : jugé trop lourd, remplacé par un socle neutre.

## Rendu : comparatif technique

Vérifié dans la documentation d'Expo SDK 57 et le code des bibliothèques (voir [Sources](#sources)).

| Critère | react-native-svg | Skia (`@shopify/react-native-skia`) | react-three-fiber + expo-gl |
|---|---|---|---|
| Expo Go | Inclus | Inclus | expo-gl inclus ; R3F n'en dit rien |
| Web | SVG du navigateur, rien à configurer | CanvasKit (WASM) à charger : script de copie et `LoadSkiaWeb`. Environ 2,9 Mo gzip selon un miroir de la doc, à mesurer | Chemin web distinct (R3F pour le DOM), non documenté pour un code partagé |
| Netteté au zoom | Sur Android, `SvgView` dessine dans un bitmap à la taille de la vue : un zoom par `transform` est flou, il faut redessiner (`viewBox`) | Redessiné par le GPU à chaque image : net à tout zoom | Net (3D) |
| Fluidité (téléphone moyen) | Chaque mise à jour passe par React ; animer beaucoup d'éléments coûte | Dessin et animations sur le thread UI avec Reanimated, sans rendu React | GPU, mais three.js et les modèles pèsent sur le JS |
| Toucher précis | `onPress` sur les formes | Pas d'événement par forme : gesture-handler, puis test de l'emprise au sol (point dans un polygone) | Lancer de rayon three.js |
| Zoom et déplacement | gesture-handler, puis `transform` (flou) ou `viewBox` (net, plus coûteux) | gesture-handler et Reanimated, matrice appliquée au dessin | Caméra orthographique |
| Poids | Faible | Bibliothèque native de plusieurs Mo, à mesurer sur l'APK, plus CanvasKit sur le web | three.js et modèles |
| Effort pour un débutant RN | Le plus faible : proche du SVG web | Moyen : API Skia et worklets, isolés dans un composant | Le plus élevé |

**Recommandation : Skia**, avec `react-native-gesture-handler` et `react-native-reanimated`, déjà
dans le projet. Le zoom reste net, et les animations et effets de nuit tournent sans passer par
React. Le test de toucher sur les emprises au sol est plus fiable qu'un `onPress` par forme sur
une vue où les dessins se chevauchent : l'emprise de chaque emplacement est déjà connue du
modèle de scène. Les SVG restent le format source des dessins, que Skia sait afficher.

**À confirmer par un essai d'une journée** en tête du chantier front : la même scène, mesurée
sur un téléphone Android de milieu de gamme (fluidité au pincement, précision du toucher) et
dans le navigateur. Si le résultat déçoit, on se replie sur react-native-svg avec un zoom par
`viewBox` recalculé au relâchement.

## Source des visuels

- **SVG dessinés sur mesure**, dans la palette de la charte, comme l'icône de l'app. Aucune
  question de licence : c'est le code du projet, publiable sur le Play Store.
- Un fichier par élément et par variante (maison, verger, rang de petits fruits, carré en bois,
  serre, abri à bois, cabanon, murs, clôture), dans `jardo-app/assets/map/`.
- Un gabarit commun : la projection de l'étude (20°, 50°) et une échelle fixe (1 m = n px), pour
  que les éléments s'assemblent sans retouche.
- La nuit se dérive par programme (teinte froide et désaturée). Seuls les éléments lumineux
  (fenêtres, lampes) ont une version dédiée.
- Piste à essayer à l'étape 1 : générer les volumes de base par script dans la projection, comme
  le prototype, puis les retoucher à la main. La cohérence entre éléments est alors garantie.
- Un illustrateur pourra reprendre plus tard le même gabarit sans toucher au code.

## Modèle de données

À aligner avec le [modèle du domaine](modele-domaine.md). La carte ne modifie aucune entité
métier : elle s'y rattache, comme le prévoit ce document.

### Modèle de scène, en code

Un catalogue statique côté API, `GardenLayouts`, décrit chaque modèle : ses clés d'emplacement
et ce que chacune accepte. Le dessin et l'emprise de chaque emplacement vivent côté front, sous
la même clé. Modèle `terraced-long` (maison mitoyenne, jardin en longueur) :

| Emplacement | Dessin | Accepte |
|---|---|---|
| `orchard` | Bande paillée et arbres le long du mur gauche | Un espace `Orchard` |
| `small-fruit` | Rang le long du mur droit | Un espace `SmallFruit` |
| `vegetable` | Parcelle du fond | Un espace `VegetableGarden` |
| `bed-1` à `bed-4` | Carrés en bois de la parcelle | Une zone d'un espace `VegetableGarden` |
| `greenhouse` | Serre | Un espace `Greenhouse` |
| `firewood` | Abri à bois | Un espace `Firewood` |

`Greenhouse` est le cinquième type d'espace du MVP, ajouté par le QG le 18/10, en plus de
ceux du modèle du domaine.

### Données stockées

- `Garden.MapLayout` (`string?`, 50) : clé du modèle choisi. `null` : carte pas encore
  configurée, l'onglet Jardin affiche la liste et propose de la configurer.
- `GardenMapSlot` : `Id`, `GardenId`, `SlotKey` (50), `SpaceId`, `ZoneId?`.
  - Index unique sur (`GardenId`, `SlotKey`).
  - Suppression en cascade depuis `Garden`, `Space` et `Zone` : supprimer un espace libère son emplacement.
  - Règles du service, en `BusinessRuleException` : clé connue du modèle, cible compatible avec
    l'emplacement, zone appartenant à l'espace, emplacement libre.
- Pas de position ni d'emprise stockées : elles découlent de l'emplacement. Un éditeur libre
  ajouterait des colonnes de position à `GardenMapSlot`, sans toucher au reste.

Une table plutôt que des colonnes sur `Space` et `Zone` : les entités métier restent
indépendantes de la carte, et un autre modèle de scène ou un éditeur libre ne touchent que cette
table.

### Migration et endpoints

- Migration `AddGardenMap` : la colonne et la table. `DbSeeder` affecte les emplacements du
  jardin d'exemple.
- `GET /api/garden/map` : `{ layout, slots: [{ slotKey, spaceId, spaceName, spaceKind, zoneId,
  zoneName }] }`. Tout ce qu'il faut pour dessiner, en un appel ; les espaces sans emplacement
  se lisent dans `GET` des espaces.
- `PUT /api/garden/map` : remplace le modèle et les affectations en une transaction (réglages
  de la carte).
- Plus tard, `POST /api/garden/map/setup` : l'assistant du premier lancement crée les espaces
  et les zones des emplacements choisis, puis les affecte, en une transaction.
- Front : types dans `src/api/types.ts`, un hook `useGardenMap()` (TanStack Query).
- Tests xUnit : clé inconnue, cible incompatible, zone d'un autre espace, emplacement déjà
  pris, cascade.

### Tranché à l'étape 2 (API)

Livré dans `GardenLayouts`, `GardenMapService` et `GardenMapController` ; clés d'emplacement
inchangées.

- **Contrat.** `GET` et `PUT /api/garden/map` renvoient le même corps. Les emplacements libres ne
  figurent pas dans `slots`, triés par clé : le front connaît ceux du modèle. Le `PUT` prend
  `{ layout, slots: [{ slotKey, spaceId, zoneId? }] }` ; un carré porte l'espace potager **et** sa
  zone. `layout: null` avec aucun emplacement retire la carte.
- **« Emplacement déjà pris ».** Le `PUT` remplaçant tout, la règle devient : une clé n'apparaît
  qu'une fois dans la requête. S'y ajoute : un espace ou une zone n'a qu'un emplacement (le
  potager peut occuper `vegetable`, et chacun de ses carrés un `bed-n`, mais pas deux `bed-n`).
- **Espaces archivés.** Un espace archivé ne se pose pas sur la carte, et l'archiver le libère
  (il passe en « Hors carte »). Le réactiver ne le remet pas en place.
- **Changement de type.** Changer le type d'un espace le libère aussi, puisque son emplacement ne
  l'accepte plus. Aucun refus : le front n'a pas encore d'écran pour réorganiser la carte.
- **Erreurs.** Toutes en 400 (`BusinessRuleException`), y compris un espace ou une zone du corps
  qui n'existe pas, comme pour les plantes.
- **Seeder.** Le jardin d'exemple prend le modèle `terraced-long` : Potager (`vegetable`) et ses
  quatre carrés (`bed-1` à `bed-4`), Verger, Petits fruits, Serre et Bois de chauffage. La serre
  tunnel archivée reste hors carte.

## Étapes livrables

Prérequis : l'étape 1 du [modèle du domaine](modele-domaine.md#stratégie-de-migration) (jardin,
espaces, zones, avec le type `Greenhouse`), et les écrans du nouveau MVP.

| # | Étape | Côté | Contenu | Ordre de grandeur |
|---|---|---|---|---|
| 1 | Visuels du modèle mitoyen | Front (assets) | Gabarit de projection, SVG des éléments et des variantes, éléments lumineux de nuit | 2 à 3 j |
| 2 | API de la carte | API | `Garden.MapLayout`, `GardenMapSlot`, catalogue, migration, seeder, `GET` et `PUT`, tests | 1 j |
| 3 | Essai technique | Front | Skia et react-native-svg sur téléphone Android et dans le navigateur ; décision écrite | 0,5 à 1 j |
| 4 | Carte v1 | Front | Rendu dans l'onglet Jardin, toucher vers espace ou zone, zoom et déplacement, étiquettes, « Hors carte », bascule vers la liste, nuit | 4 à 6 j |
| 5 | Animations | Front | Balancement des feuillages, rebond au toucher, lucioles la nuit, réduction des animations | 1 j |
| 6 | Assistant de configuration | API et front | Choix du modèle et des variantes au premier lancement, `POST /api/garden/map/setup` | 2 à 3 j |

Ordres de grandeur : jours de travail d'une session, relecture comprise, hors allers-retours de
design. Une PR par étape.

Plus tard : d'autres modèles de maison (quatre façades…), les saisons, de nouveaux types
d'espaces (serre, poulailler…) avec leurs emplacements et leurs dessins, un éditeur libre.

## Prototype

[Carte du jardin Jardo](https://claude.ai/artifact/1UtTDmxnhgMPHBJpNL4gNS), page HTML autonome.

- Le jardin d'exemple actuel de l'API, réparti dans les espaces du modèle du domaine : Potager
  (Carré 1), Serre (concombre, aubergine), Verger (pommier), Petits fruits (framboisiers,
  groseillier). Le tas de bois et les carrés 2 à 4 sont des exemples.
- Toucher un élément affiche ce qu'il ouvrirait. Depuis le Potager, on descend dans ses zones.
- Réglages : thème (jour et nuit), angle de vue, fond (sobre ou socle vert), nombre de carrés,
  serre, étiquettes, animations.
- La scène y est générée par programme à partir de volumes simples, pour changer l'angle et les
  variantes en direct. Ce n'est pas le code de l'app.

## Écarts avec le premier brief

- **Accueil.** Le brief voulait une carte qui réponde à « qu'est-ce que j'arrose aujourd'hui ? ».
  Avec la vision produit, elle montre le jardin et ses espaces ; les tâches du jour sont dans
  l'onglet Aujourd'hui.
- **Voyant d'arrosage** sur chaque élément : abandonné, la carte ne porte aucun voyant.
- **Section « fruitiers »** : c'est l'espace Verger.

## Points ouverts

- Fond de la scène : la variante sobre est à affiner avec Maxime (teinte du socle, fond en mode
  sombre).
- Type d'espace `Greenhouse` : à reporter dans le [modèle du domaine](modele-domaine.md).
- Poids réel de Skia dans l'APK et de CanvasKit sur le web : à mesurer à l'étape 3.
- La carte n'est pas à l'échelle du vrai jardin, conformément à la vision (« pas de plan au
  centimètre »).

## Sources

- Expo SDK 57 : [react-native-svg](https://docs.expo.dev/versions/v57.0.0/sdk/svg/),
  [Skia](https://docs.expo.dev/versions/v57.0.0/sdk/skia/),
  [expo-gl](https://docs.expo.dev/versions/v57.0.0/sdk/gl-view/),
  [gesture-handler](https://docs.expo.dev/versions/v57.0.0/sdk/gesture-handler/).
- react-native-svg, rendu Android dans un bitmap :
  [`SvgView.java`](https://github.com/software-mansion/react-native-svg/blob/main/android/src/main/java/com/horcrux/svg/SvgView.java)
  (`drawOutput`).
- react-three-fiber, installation React Native :
  [r3f.docs.pmnd.rs](https://r3f.docs.pmnd.rs/getting-started/installation).
