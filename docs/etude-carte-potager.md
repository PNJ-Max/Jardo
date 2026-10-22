# Étude : la carte du jardin

Étude de conception validée par Maxime le 18/10/2026, sans code. Elle prépare le premier
chantier d'après le MVP ([vision produit](vision-produit.md#étapes-suivantes)) : la carte
isométrique dans l'onglet Jardin.

**Prototype cliquable :** [Carte du jardin Jardo](https://claude.ai/artifact/1UtTDmxnhgMPHBJpNL4gNS)
(artifact privé, à partager depuis son menu).

**Étapes 1 et 3 réalisées le 21/10/2026**, directement dans l'app : Réglages, puis « Aperçu de
la carte ». Maxime a validé les deux modèles dessinés et retenu la maison de campagne pour le MVP.
Les décisions ci-dessous intègrent ses retours.

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
| Construction du jardin | **Scène modèle.** Quelques modèles de maison et de jardin, choisis à la configuration de l'app. Deux sont dessinés : « maison de campagne » (`country-house`), retenue pour le MVP par Maxime le 21/10, et « maison mitoyenne, jardin en longueur » (`terraced-long`). Pas d'éditeur libre. |
| Variantes | Certains emplacements se règlent à la configuration : potager de 1 à 4 carrés, serre ou non. |
| Élément touché | Ouvre un **espace** (verger, petits fruits, potager, serre, bois). Un carré du potager ouvre une **zone**. Maison, terrasse, cabanon et clôture sont du décor. |
| Ce qui est dessiné | Les espaces, pas chaque sujet : « 3 pommiers » est un seul élément de quantité 3, et le Verger garde le même dessin. |
| Espace ou zone sans emplacement | Listé dans une bande « Hors carte » sous la carte, et toujours accessible depuis l'onglet Jardin. |
| Style | 2D axonométrique illustrée, dans la palette de la charte. |
| Décor | **Tout autour du jardin** (21/10, à la demande de Maxime) : voisins, route, champs, haies, arbres, dans des teintes passées pour que le jardin reste au premier plan. Il remplace le socle de maquette, qui laissait l'écran vide autour. Rien n'y est cliquable. |
| Angle | **Dans l'axe du jardin** : rotation de 20°, plongée de 50°. Le jardin monte dans l'écran et remplit un téléphone tenu en portrait. |
| Visuels | Dessinés par le code dans la projection, rendus par react-native-svg (voir [Source des visuels](#source-des-visuels) et [la décision](#essai-du-2110--décision)). |
| Tâches | **Ni liste ni voyant** sur la carte (arbitrage du 18/10, validé par Maxime). Les tâches dues vivent dans l'onglet Aujourd'hui. |
| Étiquettes | Le nom des espaces est toujours affiché, celui des carrés à partir d'un zoom de ×1,45. Les étiquettes sont aussi des cibles de toucher et de clavier. |
| Zoom et déplacement | Pincer pour zoomer (jusqu'à ×5), glisser pour se déplacer, double-tap pour zoomer, bouton pour recentrer. Au départ, le jardin occupe toute la largeur de l'écran. Le déplacement et le dézoom s'arrêtent aux limites de chaque modèle, que le décor couvre toujours. |
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
- **Socle neutre sur fond vide** : essayé dans l'app le 21/10. Le jardin y restait petit, et le
  vide autour enlevait de la vie à la scène. Remplacé par le décor tout autour.
- **Fichiers `.svg` par élément dans `assets/map/`** : voir [Source des visuels](#source-des-visuels).

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

**Recommandation de départ : Skia**, avec `react-native-gesture-handler` et `react-native-reanimated`, déjà
dans le projet. Le zoom reste net, et les animations et effets de nuit tournent sans passer par
React. Le test de toucher sur les emprises au sol est plus fiable qu'un `onPress` par forme sur
une vue où les dessins se chevauchent : l'emprise de chaque emplacement est déjà connue du
modèle de scène. Les SVG restent le format source des dessins, que Skia sait afficher.

**À confirmer par un essai d'une journée** en tête du chantier front : la même scène, mesurée
sur un téléphone Android de milieu de gamme (fluidité au pincement, précision du toucher) et
dans le navigateur. Si le résultat déçoit, on se replie sur react-native-svg avec un zoom par
`viewBox` recalculé au relâchement.

### Essai du 21/10 : décision

La même scène (environ 2 000 formes, construites en 30 à 70 ms) a été rendue par les deux
moteurs, derrière le même cadre de gestes (gesture-handler et Reanimated), dans l'aperçu de la
carte.

| Critère | react-native-svg | Skia |
|---|---|---|
| Expo Go (SDK 57) | Inclus | Inclus |
| Web | Rien à configurer. Net à tout zoom | Identique à l'œil, mais `canvaskit.wasm` à servir (8,1 Mo, 2,9 Mo gzip), chargé par `WithSkiaWeb`, et un fichier `.web.tsx` pour le différer |
| Netteté au zoom (Android) | Pendant un geste, la vue est agrandie par transformation, donc floue ; à la fin du geste, la scène est redessinée à la bonne échelle | Nette en continu |
| Fluidité | Geste fluide (une transformation) ; un redessin de la scène à la fin de chaque geste | Tout sur le thread UI |
| Poids | Faible | Bibliothèque native de plusieurs Mo, plus CanvasKit sur le web |

**Décision : react-native-svg.** Dans le navigateur, Skia n'apporte rien de visible, et il
coûte du poids et une mise en place propre au web. L'essai sur téléphone n'a pas été fait :
Maxime a jugé le visuel dans le navigateur. Le code Skia de l'essai reste dans l'historique de
la branche `claude/carte-visuels-d6b8e7` (commit `38e0208`).

**À vérifier sur un téléphone Android à l'étape 4** : la fluidité du pincement, et le temps du
redessin à la fin d'un geste. S'ils déçoivent, la scène passe à Skia sans rien changer à son
dessin : les mêmes formes s'enregistrent dans une `SkPicture`.

## Source des visuels

- **Dessinés par le code**, en TypeScript, dans `jardo-app/src/map/`, dans la palette de la
  charte. Aucune question de licence : c'est le code du projet.
  - `scene.ts` : le gabarit commun. Projection de l'étude (20°, 50°), échelle de 1 m = 30 px,
    éclairage des faces, ombres et primitives (volumes, sphères, ellipses, halos).
  - `decor.ts` : les éléments, placés en mètres. Maison à pignons ou à quatre pans, arbres,
    arbustes, haies, clôtures, serre, carrés et leurs cultures, abri à bois, cabanon, champs,
    lampadaire, pots, arrosoir, brouette.
  - Un fichier par modèle (`country-house.ts`, `terraced-long.ts`) : la disposition, les
    emplacements, le décor et les limites du déplacement.
  - `layouts.ts` : les clés d'emplacement, les emprises, les étiquettes et le toucher.
- **Plutôt que des fichiers `.svg` dans `assets/map/`** : la nuit et le décor passé se dérivent
  d'une seule palette, et les éléments s'assemblent sans retouche puisqu'ils partagent la
  projection. Un même élément sert dans chaque modèle, et le toucher et les étiquettes réutilisent
  les emprises en mètres. Des fichiers figés demanderaient un transformateur Metro et une
  version par thème.
- **La nuit** se dérive par programme (teinte sarcelle et désaturée). Fenêtres et lampes sont
  allumées, avec leurs halos et des lucioles.
- **Le décor autour** reprend les mêmes éléments, dans une palette « contexte » plus passée.
- Un illustrateur pourra plus tard fournir des images par élément, dessinées dans le même
  gabarit.

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

Modèle `country-house` (maison de campagne, retenu pour le MVP) : une maison à quatre pans au
milieu d'un terrain de 18 × 30 m, clôturé sur les côtés et fermé par une haie au fond. Mêmes
clés d'emplacement et mêmes règles :

| Emplacement | Dessin |
|---|---|
| `orchard` | Trois fruitiers dans la pelouse, à gauche |
| `small-fruit` | Rang le long de la clôture droite |
| `vegetable` | Parcelle du fond, avec les carrés `bed-1` à `bed-4` |
| `greenhouse` | Serre à droite du potager |
| `firewood` | Abri à bois au bout de l'allée gravillonnée |

Le catalogue `GardenLayouts` de l'API doit accepter cette clé de modèle.

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

Étapes 1 et 3 faites le 21/10/2026, dans la même PR : les deux modèles (campagne et mitoyenne),
leur nuit et leur décor, l'aperçu depuis Réglages (toucher, étiquettes, zoom, déplacement), et
la décision technique. Pour l'étape 4, il reste à brancher l'aperçu sur `GET /api/garden/map`,
à le mettre dans l'onglet Jardin et à ajouter la bande « Hors carte ».

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

- Type d'espace `Greenhouse` : à reporter dans le [modèle du domaine](modele-domaine.md).
- Clé de modèle `country-house` : à ajouter au catalogue `GardenLayouts` de l'API.
- Fluidité du rendu SVG sur un téléphone Android de milieu de gamme : à mesurer en tête de
  l'étape 4 (voir [la décision](#essai-du-2110--décision)).
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
