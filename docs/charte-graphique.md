# Charte graphique

Les jetons de couleur, de typographie, d'espacement et de rayon sont dans
[`jardo-app/src/theme/`](../jardo-app/src/theme/index.ts). Aucun écran ne code de couleur en
dur : tout passe par `useTheme()` ou `createStyles()`, qui suivent le mode clair / sombre du
téléphone.

## Intention

Un jardin vivant et bien tenu : des verts francs le jour, un sarcelle profond la nuit. L'app doit
être claire, douce et lisible d'un coup d'œil, avec une seule famille de police, ronde et
chaleureuse. Charte validée par Maxime le 19/10/2026 sur le [nuancier](https://claude.ai/artifact/H354z7w8rjn3QVyyTvAeAv).

## Palettes d'origine

Deux palettes Color Hunt : une verte pour le thème clair, une sarcelle pour le thème sombre.

| Thème | Couleurs | Usage |
|---|---|---|
| Clair | `#E8F5E9` · `#A5D6A7` · `#66BB6A` · `#1B5E20` | Le vert foncé porte le texte et les actions ; les deux verts moyens (2,4:1 sur blanc) restent décoratifs |
| Sombre | `#092328` · `#12544F` · `#2A835F` · `#8BBB92` | Fond sarcelle presque noir, cartes et bordures sarcelle, sauge pour les actions |

## Jetons du thème clair

Contrastes calculés selon WCAG 2.1. Le seuil visé est 4,5:1 (AA, texte courant).

| Jeton | Valeur | Rôle | Contraste |
|---|---|---|---|
| `background` | `#F6FAF6` | Fond des écrans | |
| `card` | `#FFFFFF` | Fond des cartes | |
| `border` | `#D7EAD8` | Bordures, séparateurs | |
| `text` | `#173B1A` | Texte principal | 11,9:1 sur le fond, 12,5:1 sur blanc |
| `textMuted` | `#4D6B50` | Texte secondaire | 5,6:1 sur le fond, 5,9:1 sur blanc |
| `primary` | `#1B5E20` | Actions : boutons, liens, onglet actif | 7,9:1 avec blanc, 7,5:1 sur le fond |
| `primaryText` | `#FFFFFF` | Texte et icônes sur `primary`, `water`, `danger` | |
| `leaf` | `#66BB6A` | Décor (illustrations, pastilles de fond) | |
| `leafPale` | `#A5D6A7` | Décor | |
| `success` | `#1B5E20` | Tâche à jour | 7:1 sur `successTint` |
| `successTint` | `#E8F5E9` | Fond de pastille « à jour » | |
| `water` | `#2F6690` | À faire aujourd'hui, actions d'arrosage | 6,1:1 avec blanc, 5,2:1 sur `waterTint` |
| `waterTint` | `#E3EEF6` | Fond de pastille « aujourd'hui » | |
| `danger` | `#A33A2A` | En retard, erreurs, suppression | 6,6:1 avec blanc, 5,2:1 sur `dangerTint` |
| `dangerTint` | `#F6E0DA` | Fond de pastille « en retard » | |

## Voyant d'échéance

Le voyant indique où en est une tâche du jardin ; l'arrosage en est le premier cas. Il combine
**toujours** couleur, icône et texte : il doit rester lisible sans distinguer les couleurs.

| Statut | Couleur (texte / fond) | Icône Ionicons | Texte |
|---|---|---|---|
| `Ok` | `success` / `successTint` (vert) | `checkmark-circle-outline` | « Prochain : {date} » |
| `DueSoon` | `water` / `waterTint` (bleu) | `water-outline` pour l'arrosage, `calendar-outline` sinon | « À faire aujourd'hui » |
| `Overdue` | `danger` / `dangerTint` (brique) | `warning-outline` | « En retard de {n} j » |

## Typographie

- Une seule famille : **Nunito**, ronde et très lisible sur téléphone. Titres en ExtraBold,
  corps en Regular, mise en valeur en SemiBold et Bold.
- Chargée au démarrage par `@expo-google-fonts/nunito` ; l'écran de démarrage reste affiché
  jusque-là. Si le chargement échoue, l'app démarre avec la police système.

Échelle exposée par `theme.typography` (à étaler dans un style : `...typography.body`) :

| Jeton | Usage | Police | Taille / interligne |
|---|---|---|---|
| `title` | Titre d'écran | Nunito ExtraBold | 24 / 30 |
| `subtitle` | Nom d'un élément ou d'une zone, titre d'état vide, en-têtes | Nunito ExtraBold | 18 / 23 |
| `body` | Corps de texte, boutons, champs | Nunito Regular | 15 / 21 |
| `caption` | Légendes, pastilles, messages sous les champs | Nunito Regular | 13 / 18 |

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
sur le fond et sur la carte. Les aplats (`primary`, `water`, `danger`) y sont clairs : le
texte posé dessus est le fond sarcelle (`primaryText`), pas du blanc.

| Jeton | Valeur | Contraste |
|---|---|---|
| `background` | `#092328` | |
| `card` | `#0F3A3C` | |
| `border` | `#12544F` | |
| `text` | `#E8F5E9` | 14,6:1 / 11:1 |
| `textMuted` | `#8BBB92` | 7,5:1 / 5,7:1 |
| `primary` | `#8BBB92` | 7,5:1 avec `primaryText` |
| `primaryText` | `#092328` | 7:1 sur `water`, 6,1:1 sur `danger` |
| `leaf` · `leafPale` | `#2A835F` · `#12544F` | Décor |
| `success` | `#8BBB92` | 5,3:1 sur `successTint` |
| `successTint` | `#123F3E` | |
| `water` | `#7FB0CC` | 7:1 / 5,3:1, 5,1:1 sur `waterTint` |
| `waterTint` | `#133B4C` | |
| `danger` | `#E8826F` | 6,1:1 / 4,6:1, 4,9:1 sur `dangerTint` |
| `dangerTint` | `#4A2620` | |

## À reprendre

- L'icône de l'app et le splash gardent la terre cuite et la crème de la première charte :
  à redessiner dans la nouvelle palette lors de la refonte du design (phase 6).
