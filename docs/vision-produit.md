# Vision produit

## Positionnement

Jardo est l'app de **gestion du jardin**. Quand on se dit « j'ai un jardin à gérer », c'est
elle qu'on ouvre. On y organise tout ce que contient le jardin (potager, verger, petits
fruits, bois de chauffage…), on note ce qu'on y fait, et l'app rappelle ce qui est à faire.

Le rappel d'arrosage est le **premier service**, pas le cœur de l'app : c'est une tâche
récurrente parmi d'autres, au même titre que tailler les pommiers ou rentrer du bois.

## Pour qui

Un **particulier qui a un jardin familial**, débutant ou expérimenté. Il veut savoir ce qu'il
a planté, où et quand, ce qu'il a fait et ce qui reste à faire.

Le foyer (plusieurs personnes sur le même jardin) viendra plus tard ; le modèle ne doit pas
l'empêcher. Les petits maraîchers ne sont pas visés : leurs besoins (planification de
production, rendements, traçabilité) en feraient un autre produit.

## Structure d'un jardin

```
Jardin
└── Espaces typés : potager, verger, petits fruits, bois de chauffage…
    └── Zones, facultatives : carré, planche, rang
        └── Éléments suivis : cultures, arbres, arbustes, tas de bois
```

- Le **jardin** est le tout. Un seul au MVP ; plusieurs plus tard (résidence secondaire,
  jardin partagé).
- Un **espace** est une partie du jardin d'un type donné. Le type décide de ce qu'on y suit,
  des formulaires proposés et des tâches suggérées.
- Une **zone** découpe un espace quand c'est utile : les carrés du potager, un rang de
  framboisiers. Un verger peut s'en passer.
- Un **élément** est ce qu'on suit : une culture (« 2 rangs de carottes »), un arbre
  fruitier, un framboisier, un tas de bois.

Le modèle détaillé est dans [`modele-domaine.md`](modele-domaine.md).

## Ce qu'on suit par type d'espace

| Espace | Éléments | Ce qu'on suit |
|---|---|---|
| Potager | Cultures : espèce, variété, quantité (pieds, rangs, m²) | Semis, plantation, arrosage, traitements, récoltes, fin de culture ; historique par carré d'une saison à l'autre |
| Verger | Arbres fruitiers, un par un | Variété, date de plantation, tailles, traitements, récoltes, sur plusieurs années |
| Petits fruits | Arbustes et buissons (framboisiers, groseilliers…) | Comme le verger, souvent par rang |
| Bois de chauffage | Tas de bois | Essence, volume en stères, date de coupe, séchage (« prêt à brûler » à partir de quand), consommation et stock restant |

Pour tous les types : un **journal d'interventions** daté et des **tâches** qui reviennent.

Espèces et variétés se saisissent librement au MVP. Un catalogue viendra ensuite.

## Services

1. **Rappel d'arrosage.** Premier service : une tâche « arroser tous les N jours » avec son
   voyant (à jour, à faire aujourd'hui, en retard).
2. **Journal d'interventions.** Une chronologie unique par élément, par espace et pour tout le
   jardin : semis, plantation, arrosage, taille, traitement, fertilisation, récolte,
   observation, apport ou consommation de bois.
3. **Calendrier des tâches.** « Aujourd'hui au jardin » et « cette semaine » : toutes les
   tâches dues, de tous les espaces. Une tâche revient tous les N jours (arrosage), chaque année
   à une période (taille, traitement d'hiver) ou une seule fois. Faire une tâche, c'est noter
   l'intervention au journal.

Viendront ensuite : notifications, récoltes chiffrées et bilans de saison, photos, catalogue
d'espèces avec périodes de semis et tâches de saison suggérées, rotation des cultures, météo.

## Accueil et carte

Au MVP, l'accueil est **« Aujourd'hui au jardin »** : les tâches dues, toutes catégories, et
un accès aux espaces.

L'accueil envisagé ensuite est une **carte isométrique du jardin**, un « village vu d'en
haut » où chaque espace est dessiné à sa place. Une étude séparée en définit le rendu et les
données propres (position, emprise, type visuel). La structure métier décrite ici n'en dépend
pas.

## MVP

- Un jardin, ses espaces typés : potager, verger, petits fruits, bois de chauffage.
- Zones dans les espaces.
- Cultures, arbres et arbustes (saisie libre), tas de bois.
- Journal d'interventions unifié.
- Tâches récurrentes ou ponctuelles, avec voyant d'échéance ; l'arrosage en est un cas.
- Accueil « Aujourd'hui au jardin », navigation par espaces, journal du jardin.

## Étapes suivantes

Dans l'ordre envisagé, à re-prioriser au fil de l'eau :

1. Carte isométrique comme accueil.
2. Notifications locales des tâches dues.
3. Récoltes chiffrées, bilans par saison et par culture ; photos sur le journal.
4. Catalogue d'espèces : périodes de semis, intervalles par défaut, tâches de saison
   proposées. Rotation des cultures par carré.
5. Autres types d'espaces : serre, aromatiques, massifs, pelouse, compost, poulailler…
6. Météo : la pluie décale l'arrosage, alertes de gel.
7. Foyer partagé (qui a fait quoi) et plusieurs jardins.
8. Publication : API hébergée, authentification, build et fiche Play Store.

## Ce qu'on ne fera pas

- **Outil professionnel de maraîchage** : planification de production, rendements à
  l'hectare, comptabilité, traçabilité pour la certification.
- **Réseau social ou communauté** : pas de fil, de partage public, de forum.
- **Marketplace** : ni vente de graines ni échange entre jardiniers.
- **Plan au centimètre** : la carte situe les espaces, ce n'est pas un logiciel de dessin.
- **Capteurs et arrosage automatique** : Jardo rappelle, il ne pilote pas de matériel.
- **Encyclopédie botanique** : le catalogue sert la saisie et les rappels, il ne remplace
  pas un guide.
