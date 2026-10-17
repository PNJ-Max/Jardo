# Charte graphique

Les jetons de couleur, de typographie, d'espacement et de rayon sont dans
[`jardo-app/src/theme/`](../jardo-app/src/theme/index.ts). Aucun écran ne code de couleur en
dur : tout passe par `useTheme()` ou `createStyles()`, qui suivent le mode clair / sombre du
téléphone.

## Intention

Un jardin, de la terre, des pots en terre cuite. L'app doit être chaleureuse et calme,
et se démarquer des applis de jardinage qui sont toutes vertes : le vert reste présent
(sauge), mais l'accent est la terre cuite.

## Palette d'origine

Palette source (Color Hunt) :

| Couleur | Valeur | Contraste sur crème |
|---|---|---|
| Terre cuite | `#DB9558` | 2,4:1 |
| Crème | `#FCF9EA` | (fond) |
| Sauge | `#97A87A` | 2,4:1 |
| Sauge pâle | `#A8BBA3` | 1,9:1 |

Aucune n'atteint 4,5:1 sur la crème. Ces couleurs sont donc réservées aux fonds, aux
pastilles et aux illustrations, **jamais au texte ni aux icônes porteuses de sens**.
Les couleurs de texte et d'action sont des teintes foncées tirées de cette palette.

## Jetons du thème clair

Contrastes calculés selon WCAG 2.1. Le seuil visé est 4,5:1 (AA, texte courant).

| Jeton | Valeur | Rôle | Contraste |
|---|---|---|---|
| `background` | `#FCF9EA` | Fond des écrans (crème) | |
| `card` | `#FFFFFF` | Fond des cartes | |
| `border` | `#E7E2CC` | Bordures, séparateurs | |
| `text` | `#2F3A28` | Texte principal | 11,3:1 sur crème, 12:1 sur blanc |
| `textMuted` | `#6B7360` | Texte secondaire | 4,7:1 sur crème, 5:1 sur blanc |
| `primary` | `#9E5B28` | Actions : boutons, liens, onglet actif | 5,3:1 avec blanc, 5:1 sur crème |
| `primaryText` | `#FFFFFF` | Texte et icônes sur `primary`, `water`, `danger` | |
| `terracotta` | `#DB9558` | Décor | |
| `sage` | `#97A87A` | Décor | |
| `sagePale` | `#A8BBA3` | Décor | |
| `success` | `#4E6040` | Tâche à jour | 6,5:1 sur crème, 5,7:1 sur `successTint` |
| `successTint` | `#E6EDDD` | Fond de pastille « OK » | |
| `water` | `#3F6B85` | À arroser aujourd'hui, actions d'arrosage | 5,7:1 avec blanc, 4,8:1 sur `waterTint` |
| `waterTint` | `#E1ECF2` | Fond de pastille « Aujourd'hui » | |
| `danger` | `#A33A2A` | En retard, erreurs, suppression | 6,6:1 avec blanc, 5,2:1 sur `dangerTint` |
| `dangerTint` | `#F6E0DA` | Fond de pastille « En retard » | |

## Voyant d'échéance

Le voyant indique où en est une tâche du jardin ; l'arrosage, premier service, en est le
premier cas et c'est lui que décrit le tableau. Il combine **toujours** couleur, icône et
texte : il doit rester lisible sans distinguer les couleurs.

| `wateringStatus` | Couleur (texte / fond) | Icône Ionicons | Texte |
|---|---|---|---|
| `Ok` | `success` / `successTint` (sauge foncée) | `checkmark-circle-outline` | « Prochain : {date} » |
| `DueSoon` | `water` / `waterTint` (bleu eau) | `water-outline` | « À arroser aujourd'hui » |
| `Overdue` | `danger` / `dangerTint` (brique) | `warning-outline` | « En retard de {n} j » |

## Typographie

- Titres : **Fraunces** (serif chaleureuse), graisse SemiBold.
- Corps : **Inter**, en Regular, Medium et SemiBold.
- Chargées au démarrage par `@expo-google-fonts/fraunces` et `@expo-google-fonts/inter` ;
  l'écran de démarrage reste affiché jusque-là. Si le chargement échoue, l'app démarre avec
  la police système.

Échelle exposée par `theme.typography` (à étaler dans un style : `...typography.body`) :

| Jeton | Usage | Police | Taille / interligne |
|---|---|---|---|
| `title` | Titre d'écran | Fraunces SemiBold | 22 / 28 |
| `subtitle` | Nom d'une plante ou d'une zone, titre d'état vide, en-têtes | Fraunces SemiBold | 17 / 22 |
| `body` | Corps de texte, boutons, champs | Inter Regular | 15 / 21 |
| `caption` | Légendes, pastilles, messages sous les champs | Inter Regular | 13 / 18 |

Pour mettre en valeur, on change de famille, jamais de `fontWeight` (Android et le web
synthétiseraient un faux gras) : `{ ...typography.body, fontFamily: fonts.bodySemiBold }`.
Familles disponibles dans `theme.fonts` : `heading`, `body`, `bodyMedium`, `bodySemiBold`.

## Formes et espacements

- Rayon des cartes, champs et boutons : 12.
- Pastilles et boutons ronds : entièrement arrondis.
- Espacements : 4 / 8 / 16 / 24 (`spacing.xs` à `spacing.lg`).

## Icônes

`@expo/vector-icons` (Ionicons), style contour (variantes `-outline`).

### Icône de l'app

Une pousse de deux feuilles dans un pot en terre cuite, sur fond crème. Pas de texte :
la silhouette doit rester lisible à 48 dp.

| Élément | Couleur |
|---|---|
| Fond (icône adaptative, splash clair) | `#FCF9EA` crème |
| Bord du pot | `#9E5B28` |
| Corps du pot | `#DB9558` terre cuite |
| Tige et grande feuille | `#4E6040` (`#A8BBA3` sur le splash sombre) |
| Petite feuille | `#97A87A` sauge |
| Fond du splash sombre | `#1C211A` |

- Sources SVG dans [`jardo-app/assets/source/`](../jardo-app/assets/source/), avec la commande de régénération des PNG.
- Le motif reste dans la zone de sécurité des icônes adaptatives (cercle de 66 dp sur le calque de 108 dp) :
  aucun masque de lanceur ne le rogne.
- L'icône monochrome (icônes thématiques Android 13+) reprend la silhouette, avec un jour entre le bord et le corps du pot.

## Mode sombre

L'app suit le réglage du téléphone (`userInterfaceStyle: "automatic"`). Contrastes mesurés
sur le fond et sur la carte. Les couleurs de décor (`terracotta`, `sage`, `sagePale`) sont
les mêmes dans les deux modes.

| Jeton | Valeur | Contraste |
|---|---|---|
| `background` | `#1C211A` | |
| `card` | `#262C23` | |
| `border` | `#3A4234` | |
| `text` | `#EEEADB` | 13,6:1 / 11,9:1 |
| `textMuted` | `#A9AE9C` | 7,2:1 / 6,3:1 |
| `primary` | `#DB9558` | 6,8:1 avec `primaryText` |
| `primaryText` | `#2A1A0E` | 7,2:1 sur `water`, 6,3:1 sur `danger` |
| `water` | `#7FB0CC` | 7:1 / 6,1:1, 5,6:1 sur `waterTint` |
| `waterTint` | `#22323B` | |
| `danger` | `#E8826F` | 6,1:1 / 5,4:1, 5,2:1 sur `dangerTint` |
| `dangerTint` | `#3D2622` | |
| `success` | `#A8BBA3` | 8:1 / 7:1, 5,8:1 sur `successTint` |
| `successTint` | `#2F3A2A` | |

## À faire en phase 2

- Icône de l'app et splash screen.
