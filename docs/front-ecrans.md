# Front Jardo : écrans

Écrans du MVP de la [vision produit](vision-produit.md), décrits au niveau du concept. Les
endpoints seront fixés avec l'API ([étapes de migration](modele-domaine.md#stratégie-de-migration)),
et le détail visuel par les maquettes revues.

> Le MVP du front suit ce document : les trois onglets, le détail d'un espace, d'une zone et
> d'un élément, les formulaires et les réglages. Ce qui reste à faire est listé dans le
> [suivi](../suivi-progression.md).

Navigation : 3 onglets en bas (**Jardin** · **Aujourd'hui** · **Journal**), plus des écrans de
détail. L'accueil est **Jardin** : on ouvre l'app sur son jardin, pas sur une liste de corvées.

Juste après le MVP, la carte isométrique du jardin remplace la liste des espaces dans l'onglet
Jardin : chaque espace y est dessiné, et le toucher ouvre l'espace. La carte ne porte ni liste
ni voyant ; les tâches restent dans Aujourd'hui. Un bouton affiche la liste des espaces. Détail
dans l'[étude de la carte](etude-carte-potager.md).

## 1. Jardin (onglet d'accueil)

- Liste des espaces, avec leur type (icône) et le nombre de tâches dues.
- Bouton « + » pour créer un espace, en choisissant son type.
- Les espaces archivés s'affichent à la demande, sous la liste ; on les désarchive depuis leur
  écran.
- Une roue dans l'en-tête ouvre les réglages.

## 2. Aujourd'hui

- Tâches dues aujourd'hui ou en retard, tous espaces et toutes catégories, les plus en retard
  d'abord ; puis « cette semaine ».
- Chaque ligne : intervention (arroser, tailler…), cible (élément, zone ou espace), voyant.
- **Action principale : un tap sur « Fait »**, qui note l'intervention au journal. La ligne
  disparaît immédiatement (mise à jour optimiste).
- Un message « Annuler » reste quelques secondes après un « Fait » : il supprime l'entrée notée
  au journal, et la tâche revient.
- Un appui long sur « Fait » ouvre un écran pour préciser le jour (passé) et une note.
- Tirer vers le bas pour rafraîchir.
- **État vide :** « Rien à faire aujourd'hui 🌱 », c'est le résultat qu'on veut voir.


## 3. Espace

- En-tête : nom, type, description.
- Zones de l'espace, puis éléments, groupés par zone. Pour un tas de bois : stock restant et
  état de séchage.
- Tâches dues de l'espace, et accès à son journal.
- Ajouter une zone, un élément (proposé selon le type d'espace), une intervention, une tâche.
- Les éléments archivés s'affichent à la demande, dans leur zone.
- Modifier, archiver, supprimer l'espace. La suppression demande une confirmation. On change son
  type depuis Modifier : l'API refuse un type incohérent (un bois de chauffage qui contiendrait
  des plantes), et son message s'affiche sous le formulaire.

## 4. Zone

- Éléments de la zone, tâches dues, journal de la zone.
- Action sur toute la zone : noter une intervention (« arroser le carré 2 », « désherber »).
- Modifier, supprimer.

## 5. Fiche élément

- **Plante** (culture, arbre, arbuste) : nom, espèce, variété, quantité, espace et zone, dates
  de semis et de plantation.
- **Tas de bois** : essence, volume initial, stock restant, date de coupe, prêt à brûler à
  partir de quand.
- Tâches de l'élément avec leur voyant ; ajouter, modifier, supprimer une tâche.
- **Journal** de l'élément : toutes ses interventions dans une chronologie unique.
- Bouton « Noter une intervention » (avec choix de la date, sans date future).
- Menu : modifier, archiver / désarchiver, supprimer. Modifier permet aussi de déplacer
  l'élément vers une autre zone de son espace ; son journal et ses tâches le suivent.

## 6. Journal

- Chronologie de tout le jardin, la plus récente d'abord.
- Filtres par espace (archivés compris) et par type d'intervention, en pastilles qui défilent.
- Pas de chargement progressif : l'API renvoie tout le journal d'un coup, la liste n'affiche que
  ce qui est à l'écran.

## 7. Formulaires (création et modification)

- **Espace :** nom, type, description.
- **Zone :** nom, description.
- **Plante :** nom (obligatoire), espèce, variété, quantité et unité, dates de semis et de
  plantation, zone.
- **Tas de bois :** nom, essence, volume en stères, longueur des bûches, date de coupe, durée
  de séchage.
- **Intervention :** type (proposé selon la cible), date, note, et les champs du type :
  quantité récoltée ou consommée, hauteur, problème, traitement.
- **Tâche :** type d'intervention, proposé selon la cible (les soins pour une plante,
  l'observation ou « autre » pour un tas de bois), récurrence (tous les N jours, chaque année à
  partir d'une date, une seule fois).
- **« Fait » précisé :** jour (pas de date future) et note.
- Les erreurs de validation renvoyées par l'API (ProblemDetails) s'affichent sous le champ concerné.

## 8. Réglages

- Apparence : Système (par défaut, suit le téléphone), Clair ou Sombre. Le choix est mémorisé
  sur l'appareil.

## Voyant d'échéance : code visuel

Il s'applique à toute tâche ; l'arrosage en est le premier cas. Statuts calculés par l'API :

| Statut | Couleur | Texte |
|---|---|---|
| `Ok` | sauge foncée | « Prochain : {date} » |
| `DueSoon` | bleu eau pour l'arrosage | « À faire aujourd'hui » (« À arroser aujourd'hui ») |
| `Overdue` | brique | « En retard de {daysOverdue} j » |

La couleur et l'icône de `DueSoon` pour les tâches autres que l'arrosage sont à trancher avec
les maquettes.

Ne pas se reposer sur la couleur seule : on ajoute toujours le texte ou une icône (accessibilité).
Valeurs, icônes et contrastes : [charte graphique](charte-graphique.md#voyant-déchéance).

## Plus tard (hors MVP)

Carte isométrique dans l'onglet Jardin, notifications des tâches dues, récoltes chiffrées et bilans,
photos sur le journal, catalogue d'espèces, météo.
