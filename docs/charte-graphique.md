# Charte graphique

Les jetons de couleur, de typographie, d'espacement et de rayon sont dans
[`jardo-app/src/theme/`](../jardo-app/src/theme/index.ts). Aucun écran ne code de couleur en
dur : tout passe par `useTheme()` ou `createStyles()`, qui suivent le mode clair / sombre du
téléphone, ou celui choisi dans les réglages de l'app.

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
| `primaryText` | `#FFFFFF` | Texte et icônes sur `primary`, `water`, `danger`, `soil` (« Demain » en glissant) | 7,9:1 sur `soil` |
| `leaf` | `#66BB6A` | Décor (illustrations, pastilles de fond) | |
| `leafPale` | `#A5D6A7` | Décor | |
| `success` | `#1B5E20` | Tâche à jour | 7:1 sur `successTint` |
| `successTint` | `#E8F5E9` | Fond de pastille « à jour » | |
| `water` | `#2F6690` | Arrosage à faire aujourd'hui, actions d'arrosage | 6,1:1 avec blanc, 5,2:1 sur `waterTint` |
| `waterTint` | `#E3EEF6` | Fond du voyant d'arrosage du jour | |
| `danger` | `#A33A2A` | En retard, erreurs, suppression | 6,6:1 avec blanc, 5,2:1 sur `dangerTint` |
| `dangerTint` | `#F6E0DA` | Fond de pastille « en retard » | |
| `surfaceSunken` | `#EAF2E8` | Fond des champs remplis, du bouton fermer | `text` 11:1, `textMuted` 5,2:1 |
| `tile` | `#E4F0DE` | Tuile des pictogrammes, type choisi | 6,7:1 avec `primary` |
| `soil` | `#694B34` | À faire aujourd'hui, hors arrosage | 7,5:1 sur le fond, 7,9:1 sur blanc, 6,6:1 sur `soilTint` |
| `soilTint` | `#F2EADF` | Fond du voyant `soil` | |
| `glow` | `#F6C76E` | Lueur des fenêtres : « Fait », focus, lucioles. Décor | |
| `lawn` | `#B3D6A9` | Sol des vignettes, onglet actif. Décor | 4,9:1 avec `primary` |
| `skyTop` | `#D3EAEE` | Haut du ciel d'Aujourd'hui, fondu vers `background` | 4,7:1 avec `textMuted` |

## Voyant d'échéance

Le voyant indique où en est une tâche du jardin ; l'arrosage en est le premier cas. Il combine
**toujours** couleur, icône et texte : il doit rester lisible sans distinguer les couleurs. Il n'a
pas de bordure : un fond teinté de rayon 8 (`radius.sm`). Dans le thème, `due.DueSoon` est la terre et
`due.Watering` le bleu de l'eau.

| Statut | Couleur (texte / fond) | Icône Ionicons | Texte |
|---|---|---|---|
| `Ok` | `success` / `successTint` (vert) | `checkmark-circle-outline` | « Prochain : {date} » |
| `DueSoon` | `soil` / `soilTint` (terre) ; `water` / `waterTint` (bleu) pour l'arrosage | `sunny-outline` ; `water-outline` pour l'arrosage | « À faire aujourd'hui » ; « À arroser aujourd'hui » |
| `Overdue` | `danger` / `dangerTint` (brique) | `warning-outline` | « En retard de {n} j » |

## Typographie

- Une seule famille : **Nunito**, ronde et très lisible sur téléphone. Titres en ExtraBold,
  corps en Regular, mise en valeur en SemiBold et Bold.
- Chargée au démarrage par `@expo-google-fonts/nunito` ; l'écran de démarrage reste affiché
  jusque-là. Si le chargement échoue, l'app démarre avec la police système.

Échelle exposée par `theme.typography` (à étaler dans un style : `...typography.body`) :

| Jeton | Usage | Police | Taille / interligne |
|---|---|---|---|
| `display` | Date du jour, nom en tête de fiche, titre de formulaire | Nunito ExtraBold, approche −0,3 | 32 / 36 |
| `title` | Titre d'écran | Nunito ExtraBold | 24 / 30 |
| `section` | Titre de section, en casse de phrase, couleur `text` | Nunito ExtraBold | 17 / 22 |
| `subtitle` | Nom d'un élément ou d'une zone, titre d'état vide, en-têtes | Nunito ExtraBold | 18 / 23 |
| `body` | Corps de texte, boutons, champs | Nunito Regular | 15 / 21 |
| `caption` | Légendes, pastilles, messages sous les champs | Nunito Regular | 13 / 18 |

Pour mettre en valeur, on change de famille, jamais de `fontWeight` (Android et le web
synthétiseraient un faux gras) : `{ ...typography.body, fontFamily: fonts.bodySemiBold }`.
Familles disponibles dans `theme.fonts` : `heading`, `body`, `bodyMedium`, `bodySemiBold`.

## Formes et espacements

- Rayons (`theme.radius`) : `sm` 8 (voyant d'échéance), `md` 14 (cartes, champs, boutons, tuiles de pictogramme), `lg` 18 (surfaces groupées, tuiles de zone).
- Pastilles et boutons ronds : entièrement arrondis.
- Espacements : 4 / 8 / 16 / 24 (`spacing.xs` à `spacing.lg`).

## Icônes

`@expo/vector-icons` (Ionicons), style contour (variantes `-outline`).

### Icône de l'app

Une pousse de deux feuilles dans un pot en terre cuite évasé, dessinée au pinceau de la carte
(même projection, même lumière, mêmes arêtes que les vignettes) : `assets/source/icons.ts`
produit les SVG. Pas de texte : la silhouette doit rester lisible à 48 dp.

| Élément | Couleur |
|---|---|
| Fond de l'icône (adaptative, iOS, favicon) | `#1B5E20`, le `primary` clair |
| Corps du pot, ombré par la lumière de la carte | `#CF8E5B` terre cuite (`pot` du décor) |
| Bord du pot | `#AE6F3E` (`potRim`) |
| Terre | `#694B34` (`soilBed`) |
| Tige | `#3E8A4B` (`leafDark`) |
| Grande feuille | `#5EA864` (`leaf`) |
| Petite feuille | `#A5D6A7` (`leafLight`, le vert moyen de la palette claire) |
| Fond du splash clair | `#F6FAF6`, le `background` clair |
| Fond du splash sombre | `#092328`, le `background` sombre ; le motif y garde les teintes du jour, passées de 15 % vers ce fond |

- Sources SVG dans [`jardo-app/assets/source/`](../jardo-app/assets/source/), avec la commande de régénération des PNG
  et un [aperçu](../jardo-app/assets/source/apercu.png) sous les masques des lanceurs.
- Le motif tient dans un cercle de rayon 30 sur le calque de 108 dp, à l'intérieur de la zone de sécurité
  des icônes adaptatives (cercle de 66 dp) : aucun masque de lanceur ne le rogne.
- L'ombre au sol n'est posée que sur le fond vert de l'icône ; les splashs n'en ont pas.
- L'icône monochrome (icônes thématiques Android 13+) reprend la silhouette, avec un jour entre le bord et le corps du pot.

## Mode sombre

L'app suit le réglage du téléphone (`userInterfaceStyle: "automatic"`), sauf si l'on choisit
Clair ou Sombre dans ses réglages. Contrastes mesurés
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
| `primaryText` | `#092328` | 7:1 sur `water`, 6,1:1 sur `danger`, 8,8:1 sur `soil` |
| `leaf` · `leafPale` | `#2A835F` · `#12544F` | Décor |
| `success` | `#8BBB92` | 5,3:1 sur `successTint` |
| `successTint` | `#123F3E` | |
| `water` | `#7FB0CC` | 7:1 / 5,3:1, 5,1:1 sur `waterTint` |
| `waterTint` | `#133B4C` | |
| `danger` | `#E8826F` | 6,1:1 / 4,6:1, 4,9:1 sur `dangerTint` |
| `dangerTint` | `#4A2620` | |
| `surfaceSunken` | `#0C2E32` | `text` 12,9:1, `textMuted` 6,6:1 |
| `tile` | `#164441` | 5:1 avec `primary` |
| `soil` | `#D9B98F` | 8,8:1 sur le fond, 6,7:1 sur la carte, 7:1 sur `soilTint` |
| `soilTint` | `#3A2F24` | |
| `glow` | `#F4C76F` | Décor |
| `lawn` | `#1D4A41` | Décor, 4,6:1 avec `primary` |
| `skyTop` | `#03141A` | 8,6:1 avec `textMuted` |

## Accessibilité

Les règles que tout composant tient ; `__tests__/components/accessibility.test.tsx` garde celles des
composants partagés.

- **Rôle et nom.** Tout élément touchable a un rôle (`button`, `link`, `tab`, `radio`…) et un nom
  qui se comprend hors contexte : « Ajouter un espace », pas « Ajouter ». `Button` pose
  `accessibilityRole="button"` et se nomme par son titre, même quand l'indicateur de chargement
  remplace le texte. Un bouton à icône seule a un `accessibilityLabel` (« Fermer », « Retour »,
  « Effacer : Récolte »). Un champ se nomme par son libellé : le `Text` voisin n'est pas relié au
  `TextInput` sur Android.
- **États.** `aria-selected` pour une puce, un onglet ou le type d'espace choisi (avec
  `aria-checked` pour un `radio`), `aria-expanded` pour ce qui se replie (`expanded` sur `Button`),
  `aria-busy` pendant un chargement, `disabled` sur le `Pressable`. Les props `aria-*`, et non
  `accessibilityState`, parce que React Native Web ignore ce dernier. Un groupe de choix a le rôle
  `radiogroup` et son libellé ; il n'est pas `accessible`, sans quoi TalkBack ne lirait plus ses
  éléments.
- **Cibles tactiles : 48 dp au moins, `hitSlop` compris.** Un contrôle plus petit se complète d'un
  `hitSlop` qui ne mord pas sur le voisin (une pastille de 40 prend 4 de chaque côté, entre deux
  lignes séparées de 8). Un bouton de barre d'en-tête mesure 48 × 48.
- **Titres.** Le titre d'un écran et d'une section a le rôle `header` (`SectionTitle`, nom d'une
  fiche, date d'Aujourd'hui).
- **Formulaires.** L'ordre de lecture suit l'ordre visuel : cible, champs, bouton d'action ancré en
  bas. L'erreur d'un champ est une zone vive (`accessibilityLiveRegion="polite"`, via
  `FieldMessage`), annoncée à son apparition, et lue avec le champ (`accessibilityHint`).
- **Images décoratives cachées** (`aria-hidden`) : pictogrammes, icônes à côté d'un texte, canvas des
  vignettes et du ciel. Ce que l'image dit est toujours dit par le texte voisin ou par le nom du
  contrôle. La carte du jardin a pour alternative la liste des espaces, une bascule nommée dans
  l'en-tête de l'onglet Jardin.
- **Grandes polices (échelle de 1,3 à 2).** Rien d'important n'est coupé ni ne se chevauche : pas de
  hauteur fixe sur un texte (`minHeight`, jamais `height`), pas de `numberOfLines` sur ce qui nomme ou
  date quelque chose, une disposition qui passe d'une colonne à une autre quand la place manque (les
  tuiles de zone passent à une par ligne au-delà de 1,3). Ce qui a une hauteur imposée (libellés de
  la barre d'onglets) ne grandit pas : `tabBarAllowFontScaling: false`, `maxFontSizeMultiplier` de 1,3
  sur les onglets d'une fiche.
- **Tester.** Rôle et nom par `getByRole(role, { name })`, état par `{ selected: true }`, jamais par
  le texte seul. Sur le web, vérifier qu'aucun `<button>` n'en contient un autre : un `Button` ne se
  pose pas dans un élément touchable qui a le rôle `button` (`Card` avec `onPress`, ligne de liste).

## À reprendre

- La [direction visuelle](direction-visuelle.md) fixe l'usage de ces jetons ; ses composants
  (pictogrammes, surfaces groupées, ciel du jour…) arrivent étape par étape.
