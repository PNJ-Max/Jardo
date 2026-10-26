# Direction visuelle : le jardin dessiné

La charte v2 ([`charte-graphique.md`](charte-graphique.md)) fixe la palette et la police. Ce
document fixe comment les mettre en œuvre pour que Jardo ait une identité propre. Il guide la
refonte du design de la phase 6 : il ne change aucun jeton existant, il en ajoute.

Maquette comparative (actuel / proposé, clair et sombre, sur Aujourd'hui, la fiche du potager et
le formulaire « Nouvel espace ») :
[Jardo, direction visuelle](https://claude.ai/artifact/XocpKweEQ2UFkqYXZSHKex). Validée par
Maxime le 26/10/2026 : le ciel du jour, les sections encadrées et le mode clair sur fond blanc
sont retenus.

## Le constat

Un développeur a jugé les captures « très basiques, IA ». En cause, la mise en œuvre de la
charte, pas la charte elle-même :

- **Tout est la même carte.** Chaque tâche, zone ou message est un rectangle blanc bordé, rayon
  12, posé dans une liste. Rien ne distingue une tâche en retard d'une zone ou d'un message.
- **La carte et l'interface ne se parlent pas.** La carte du jardin est chaude et matérielle
  (pelouse, terre, bois, tuiles, fenêtres allumées, lucioles) ; l'interface est un vert menthe
  froid, en icônes Ionicons standard.
- **Des marques de modèle par défaut.** Titres de section en capitales espacées, icône dans une
  pastille ronde, état vide réduit à une icône et un emoji.
- **Une typographie à plat.** 24 au plus gros : rien ne porte la voix de l'app.

## Principes

1. **Un seul dessin.** Tout ce qui est illustré vient du pinceau de la carte (`Painter` et
   fonctions `draw*` de [`jardo-app/src/map/decor.ts`](../jardo-app/src/map/decor.ts)) : même
   projection, même lumière, mêmes matières. De jour en mode clair, de nuit en mode sombre.
2. **Le vert parle, la terre décore.** Texte et actions restent dans les jetons de la charte v2.
   Les tons chauds de la carte servent au décor ; seul `soil`, assez contrasté, porte du texte.
3. **La hiérarchie par la surface, pas par la bordure.** Les lignes d'une même section partagent
   une surface. La carte isolée devient l'exception : une vignette, une tuile de zone.
4. **Le mouvement répond au geste.** « Fait », ouverture d'une fiche, changement d'onglet. Un seul
   moment d'ambiance : les lucioles du ciel d'Aujourd'hui, la nuit.
5. **Pas un jeu.** Ni points, ni série de jours, ni mascotte, ni récompense. Les vignettes sont
   immobiles hors des gestes.

Le mode clair reste sur fond blanc : `background` `#F6FAF6`, surfaces `#FFFFFF`, aucun fond
crème ni teinté. C'est ce qui a plu sur la maquette.

## Jetons à ajouter

Les jetons existants ne changent pas. Valeurs reprises de la palette de la carte, contrastes
calculés selon WCAG 2.1.

### Couleurs

| Jeton | Clair | Sombre | Rôle | Contraste |
|---|---|---|---|---|
| `surfaceSunken` | `#EAF2E8` | `#0C2E32` | Fond des champs remplis, du bouton fermer | `text` 11 / 12,9:1 ; `textMuted` 5,2 / 6,6:1 |
| `tile` | `#E4F0DE` | `#164441` | Tuile des pictogrammes, type choisi | `primary` 6,7 / 5:1 |
| `soil` | `#694B34` | `#D9B98F` | « À faire aujourd'hui » hors arrosage | 7,5:1 sur le fond, 7,9:1 sur blanc / 8,8:1 et 6,7:1 |
| `soilTint` | `#F2EADF` | `#3A2F24` | Fond du voyant `soil` | `soil` 6,6 / 7:1 |
| `glow` | `#F6C76E` | `#F4C76F` | Lueur des fenêtres : « Fait », focus, lucioles. Décor | |
| `lawn` | `#B3D6A9` | `#1D4A41` | Sol des vignettes, onglet actif. Décor | |
| `skyTop` | `#D3EAEE` | `#03141A` | Haut du ciel d'Aujourd'hui, fondu vers `background` | `textMuted` 4,7 / 8,6:1 |

Les vignettes et pictogrammes utilisent en plus la palette du décor (`decor.ts` : bois, tuile,
verre, fruits) et sa variante de nuit : ce ne sont pas des jetons du thème.

### Voyant d'échéance

Le point resté ouvert dans [`front-ecrans.md`](front-ecrans.md#voyant-déchéance--code-visuel) est
tranché : `DueSoon` hors arrosage prend `soil` / `soilTint` avec l'icône soleil ; l'arrosage
garde `water`. Le voyant perd sa bordure (fond teinté, rayon 8) et garde couleur, icône et texte.

### Rayons

Un rayon unique devient une échelle : `radius.sm` 8 (voyant), `radius.md` 14 (champs, tuiles de
pictogramme), `radius.lg` 18 (surfaces groupées, tuiles de zone), pastilles et boutons ronds
entièrement arrondis.

### Typographie

Toujours Nunito seule.

| Jeton | Usage | Police | Taille / interligne |
|---|---|---|---|
| `display` (nouveau) | Date du jour, nom en tête de fiche, titre de formulaire | ExtraBold | 32 / 36, approche −0,3 |
| `section` (nouveau) | Titre de section, en casse de phrase, couleur `text` | ExtraBold | 17 / 22 |

`SectionTitle` abandonne les capitales espacées : « En retard », suivi du nombre de lignes en
`textMuted`, chiffres tabulaires (`fontVariant: ['tabular-nums']`). Le titre « En retard » prend
`danger`.

## Composants signatures

Dans l'ordre où ils seront refaits.

1. **Surface groupée** (`Group`) : les lignes d'une section dans une surface `card`, rayon 18,
   bordure `border`, séparateurs fins entre lignes. Remplace la pile de `Card` dans les listes.
2. **Ligne de tâche** : pictogramme de l'intervention sur une tuile `tile` de 44, intervention en
   Bold 16, puis voyant et cible côte à côte. Le bouton « Fait » à droite.
3. **Bouton « Fait »** : pastille de 40 de haut, contour `primary` et texte « Fait ». Au toucher,
   elle se remplit, la coche devient une pousse, une lueur `glow` s'étend, retour haptique, puis
   la ligne se replie et le message « Noté au journal : Arroser, Carré 2 · Annuler » monte.
   L'appui long garde l'écran « Fait » précisé.
4. **Ciel du jour** : en-tête d'Aujourd'hui, environ 210 de haut. Ciel `skyTop` fondu vers le
   fond, ligne d'horizon du jardin (maison, arbre, serre, haie), soleil le jour, fenêtres allumées
   et lucioles la nuit. Par-dessus : la date en `display` et une phrase (« 3 choses à faire au
   jardin, dont 1 en retard » ; « Tout est fait pour aujourd'hui » quand c'est le cas).
5. **Vignette d'espace** : la scène isométrique du type d'espace. En tête de fiche (environ 230 de
   haut, bouton retour rond posé dessus, sans barre de navigation), en petit dans la liste des
   espaces et dans le choix du type.
6. **Tuile de zone** : un carré de terre vu de dessus, bordé de bois, garni selon son contenu ;
   « Ajouter une zone » est un carré vide en pointillés.
7. **Champs** : remplis (`surfaceSunken`), sans bordure, rayon 14, anneau `primary` de 2 au focus,
   erreur en anneau `danger`. Le bouton principal du formulaire est ancré en bas et dit ce qu'il
   fait (« Créer l'espace », « Enregistrer les modifications »). Le titre du formulaire est en
   `display` (« Nouvel espace »), avec un bouton fermer rond.
8. **Barre d'onglets** : pictogrammes maison bicolores (Jardin, Aujourd'hui, Journal) ; l'onglet
   actif est en `primary`, rempli de `lawn`.
9. **États vides illustrés** : le jardin au repos (banc sous l'arbre le jour, fenêtre allumée la
   nuit), une phrase et l'action qui débloque (« Ajouter un espace »). Plus d'emoji.

## Illustrations

Toutes dessinées par le code avec `decor.ts`, comme la carte :

| Illustration | Contenu | Où |
|---|---|---|
| Potager | Carrés surélevés, tomates, salades, rangs | Fiche, liste, choix du type |
| Verger | Deux pommiers | Idem |
| Petits fruits | Rangs d'arbustes à baies | Idem |
| Serre | Serre vitrée, semis | Idem |
| Bois de chauffage | Tas de bûches | Idem |
| Horizon | Maison, arbre, serre, haie, conifères | Ciel d'Aujourd'hui |
| Jardin au repos | Banc, arbre, lampe | États vides |
| Tuiles de zone | Carré vu de dessus, garni de 0 à n plantes | Contenu d'un espace |

Chaque scène est enregistrée une fois en `SkPicture` (`createPicture`, comme
[`skia-scene-impl.tsx`](../jardo-app/src/components/map/skia-scene-impl.tsx)), mise en cache par
type et par thème au niveau du module, puis posée avec `<Picture>`. On ne recalcule jamais une
scène par ligne de liste. Les tuiles de zone, simples, peuvent rester des formes Skia directes.

## Pictogrammes

Un pictogramme maison par type d'intervention (`entryKinds` de `lib/garden.ts`), en 32 × 32,
trait `ink` (`#2E4A31` / `#CFE3D1`) de 1,6 et remplissages du décor :

| Intervention | Pictogramme |
|---|---|
| Arrosage | Arrosoir |
| Semis | Sachet de graines |
| Plantation | Plant en motte |
| Taille | Sécateur |
| Traitement | Pulvérisateur |
| Fertilisation | Sac d'engrais |
| Récolte | Panier de tomates |
| Observation | Loupe sur une feuille |
| Apport de bois | Brouette de bûches |
| Consommation de bois | Bûche et flamme |
| Autre | Carnet |

Ils servent dans les lignes de tâche, le journal et ses filtres. Ionicons reste pour la
navigation et les actions génériques (retour, fermer, ajouter, chevron).

## Animations

Toutes en Reanimated 4 (déjà installé), toutes coupées quand le téléphone demande de réduire les
animations (`useReducedMotion`) :

| Moment | Animation | Durée |
|---|---|---|
| « Fait » | Remplissage, coche → pousse, lueur `glow`, haptique léger, puis repli de la ligne | ~0,8 s puis 0,4 s |
| « Annuler » | La ligne revient à sa place | 0,3 s |
| Message « Noté au journal » | Monte depuis le bas | 0,3 s |
| Changement d'onglet d'une fiche | L'indicateur glisse sous l'onglet choisi | 0,2 s |
| Ouverture d'une fiche | Transition de la pile par défaut, vignette en place dès l'ouverture | |
| Lucioles | Clignotement lent, la nuit seulement, dans le ciel d'Aujourd'hui | boucle de 3,4 s |

Le retour haptique demande `expo-haptics` (inclus dans Expo Go), à ajouter par
`npx expo install expo-haptics`.

## Mise en œuvre

Une PR par étape, chacune avec ses tests d'écran à jour, `npx expo lint` et `npx tsc --noEmit`
verts, et une capture clair / sombre dans la description.

1. **Jetons** : couleurs, échelle de rayons, `display` et `section` dans `src/theme/` ;
   `SectionTitle` en casse de phrase ; voyant sans bordure et `DueSoon` hors arrosage en terre.
   Charte mise à jour avec ces jetons et leurs contrastes.
2. **Pictogrammes** : les onze pictogrammes et ceux de la barre d'onglets, un composant
   `KindIcon` ; branchés sur les lignes de tâche et le journal.
3. **Surfaces et « Fait »** : `Group`, ligne de tâche refaite sur Aujourd'hui et les fiches,
   bouton « Fait » animé avec haptique, message « Noté au journal ».
4. **Ciel du jour** : en-tête d'Aujourd'hui, horizon jour et nuit, lucioles.
5. **Vignettes d'espace** : les cinq scènes en cache, en tête de fiche, dans la liste des espaces ;
   tuiles de zone dans l'onglet Contenu.
6. **Formulaires** : champs remplis, bouton ancré, titre en `display`, choix du type d'espace sur
   les vignettes.
7. **États vides et icône** : jardin au repos ; icône de l'app et splash redessinés dans la palette
   v2 (le point « À reprendre » de la charte).

Les étapes 2 et 4 sont indépendantes ; 3 attend 2, 6 attend 5.
