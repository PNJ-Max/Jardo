# Front Jardo : écrans

Écrans du MVP de la [vision produit](vision-produit.md), décrits au niveau du concept. Les
endpoints seront fixés avec l'API ([étapes de migration](modele-domaine.md#stratégie-de-migration)),
et le détail visuel par les maquettes revues.

> Le MVP du front suit ce document : les trois onglets, le détail d'un espace, d'une zone et
> d'un élément, les formulaires et les réglages. Ce qui reste à faire est listé dans le
> [suivi](../suivi-progression.md).

Navigation : 3 onglets en bas (**Jardin** · **Aujourd'hui** · **Journal**), plus des écrans de
détail. L'accueil est **Jardin** : on ouvre l'app sur son jardin, pas sur une liste de corvées.

Depuis l'étape 4 de l'[étude de la carte](etude-carte-potager.md), l'onglet Jardin montre la carte
isométrique du jardin quand elle est configurée, et la liste des espaces sinon. La carte ne porte
ni liste ni voyant ; les tâches restent dans Aujourd'hui.

## 1. Jardin (onglet d'accueil)

**Carte**, quand le jardin a un modèle de carte (`MapLayout`) que l'app sait dessiner :

- La scène du modèle, de jour en mode clair, de nuit en mode sombre. Pincer pour zoomer (jusqu'à
  ×5), glisser pour se déplacer, double-toucher pour zoomer, bouton pour recentrer.
- Chaque emplacement occupé porte le nom de son espace ou de sa zone (celui des carrés à partir
  d'un zoom de ×1,45). Toucher le dessin ou l'étiquette ouvre l'espace, ou la zone pour un carré.
- Un emplacement libre est voilé, sans étiquette, et ne réagit pas au toucher.
- La bande **« Hors carte »**, sous la carte, liste les espaces actifs sans emplacement, puis les
  zones d'un potager de la carte qui n'ont pas de carré (« Carré 5 · Potager »). Les espaces
  archivés n'y sont pas : la liste les montre à la demande.
- Un bouton de l'en-tête affiche la **liste des espaces**, et inversement. La liste reste la voie
  des lecteurs d'écran.

**Liste des espaces**, sans carte configurée ou à la demande :

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


## Fiches : principe commun

Les fiches d'un espace, d'une zone, d'une plante et d'un tas de bois sont en **onglets** plutôt
qu'en une longue page. L'en-tête (nom, type, informations clés) et la barre d'onglets restent en
place ; seul le contenu de l'onglet défile. La fiche s'ouvre sur **Tâches**. La barre de
navigation donne le type de fiche (Espace, Zone, Plante, Tas de bois), l'en-tête son nom.

- **Tâches** : d'abord celles de la cible elle-même, puis « Ajouter une tâche à cette plante »
  (à cette zone, à cet espace, à ce tas), qui crée toujours la tâche sur la cible de la fiche.
  Viennent ensuite, **repliées**, les tâches qui ne lui appartiennent pas en propre :
  - celles de ce qui la contient, sous « Valent aussi pour cette plante » : un groupe par
    provenance (« Carré 4 · Zone », « Potager · Espace »), car un arrosage du carré vaut pour
    ses plantes ;
  - pour un espace ou une zone, celles de ce qu'ils contiennent (« Tâches des zones et des
    éléments », « Tâches des éléments »), chaque ligne nommant sa cible.

  L'en-tête d'un groupe replié dit combien il compte de tâches, et combien sont en retard ou à
  faire aujourd'hui : rien d'urgent ne se cache.
- **Journal** : bouton « Noter une intervention » (avec choix de la date, sans date future),
  puis la chronologie de la cible.
- **Infos** : tous les détails, puis Modifier, Archiver / Désarchiver, Supprimer. Ces actions ne
  sont pas dans la barre de navigation, où le bouton du menu développeur d'Expo Go les
  masquerait pendant les essais.

Une ligne de tâche tient sur deux ou trois lignes de texte : l'intervention, puis le voyant et
la cible côte à côte quand la place le permet. Le bouton « Fait » est moins haut que la ligne
mais sa zone de toucher dépasse 48 dp.

## 3. Espace

- En-tête : icône du type, nom, type, nombre de zones et d'éléments.
- Onglets **Tâches** · **Contenu** · **Journal** · **Infos**.
- Contenu : les zones de l'espace, puis les éléments groupés par zone. Pour un tas de bois :
  stock restant et état de séchage. Ajouter une zone, un élément (proposé selon le type
  d'espace). Les éléments archivés s'affichent à la demande, dans leur zone.
- Infos : description ; modifier, archiver, supprimer l'espace. La suppression demande une
  confirmation. On change son type depuis Modifier : l'API refuse un type incohérent (un bois de
  chauffage qui contiendrait des plantes), et son message s'affiche sous le formulaire.

## 4. Zone

- En-tête : nom, espace, nombre d'éléments.
- Onglets **Tâches** · **Plantes** (ou **Tas de bois**) · **Journal** · **Infos**.
- Action sur toute la zone : noter une intervention (« arroser le carré 2 », « désherber »).
- Infos : description ; modifier, supprimer.

## 5. Fiche élément

- Onglets **Tâches** · **Journal** · **Infos**.
- **Plante** (culture, arbre, arbuste) : l'en-tête donne nom, zone et espace, espèce, variété et
  quantité ; Infos ajoute les dates de semis et de plantation.
- **Tas de bois** : l'en-tête donne nom, essence, stock restant et état de séchage ; Infos ajoute
  volume initial, longueur des bûches, date de coupe, prêt à brûler à partir de quand.
- Tâches de l'élément avec leur voyant ; ajouter, modifier, supprimer une tâche.
- **Journal** de l'élément : toutes ses interventions dans une chronologie unique.
- Infos : modifier, archiver / désarchiver, supprimer. Modifier permet aussi de déplacer
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

Une page à part entière, ouverte par la roue de l'en-tête de l'onglet Jardin.

- **Jardin** : nom du jardin, enregistré par l'API ; « Enregistrer le nom » n'apparaît qu'une
  fois le nom changé. Les erreurs de validation s'affichent sous le champ.
- **Apparence** : Système (par défaut, suit le téléphone), Clair ou Sombre. Le choix est mémorisé
  sur l'appareil.
- **À propos** : nom et version de l'app.

## Voyant d'échéance : code visuel

Il s'applique à toute tâche ; l'arrosage en est le premier cas. Statuts calculés par l'API :

| Statut | Couleur | Texte |
|---|---|---|
| `Ok` | sauge foncée | « Prochain : {date} » |
| `DueSoon` | brun terre ; bleu eau pour l'arrosage | « À faire aujourd'hui » (« À arroser aujourd'hui ») |
| `Overdue` | brique | « En retard de {daysOverdue} j » |

Hors arrosage, `DueSoon` est brun terre avec une icône soleil ; le voyant n'a pas de bordure
([direction visuelle](direction-visuelle.md#voyant-déchéance)).

Ne pas se reposer sur la couleur seule : on ajoute toujours le texte ou une icône (accessibilité).
Valeurs, icônes et contrastes : [charte graphique](charte-graphique.md#voyant-déchéance).

## Plus tard (hors MVP)

Assistant de configuration de la carte, notifications des tâches dues, récoltes chiffrées et bilans,
photos sur le journal, catalogue d'espèces, météo.
