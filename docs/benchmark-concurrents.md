# Benchmark des concurrents

Deuxième version, du 05/11/2026. La première datait du 20/10/2026, quand Jardo n'était encore
qu'une API et quelques écrans. Ce document situe l'app **telle qu'elle est aujourd'hui** face aux
applications Android qu'un jardinier familial francophone peut croiser sur le Play Store. Ce n'est
pas une liste de fonctionnalités à copier.

**Méthode.** Chaque concurrent a été relevé sur sa fiche Google Play, ouverte en français depuis la
Belgique le 05/11/2026. Les textes sont paraphrasés, jamais recopiés. Ce que dit la fiche est une
**déclaration du développeur**, pas un essai : personne n'a installé ces apps. Ce qui est **déduit**
est signalé comme tel. Pour Jardo, chaque affirmation vient du code de `jardo-app/src` à la date du
document, y compris les rappels proposés (PR 6, déjà sur `main`).

## Les concurrents (relevés du 05/11/2026)

La recherche « potager jardin » sur le Play Store renvoie une trentaine d'apps. Six comptent pour un
jardin familial francophone. Les autres sont des calendriers lunaires, des outils d'IA ou des apps
sans audience.

| App | Audience | Prix et données | Ce qu'elle déclare |
|---|---|---|---|
| [Jardingue](https://play.google.com/store/apps/details?id=com.agenceixp.jardingue) (Agence IXP) | 1 k+ installations, pas de note affichée, v1.20.2 du 01/11/2026 | Achats intégrés ; hors connexion, aucune donnée collectée | Calendrier de semis selon la région, fiches plantes, rappels (semer, repiquer, arroser, récolter), suivi du potager, boîtes de semis avec photos et étiquettes QR. Potager seulement |
| [Mon Potager](https://play.google.com/store/apps/details?id=com.globedition.monpotager) (Glob Edition) | 1 k+, pas de note, mise à jour du 13/05/2026 | Gratuite ; aucun compte, aucune donnée collectée, « tout reste sur le téléphone » | Plan du potager par parcelles (export PDF ou image), suivi des semis godet par godet, rappels d'arrosage calculés (matin, midi, soir), calendrier cultural, Gantt, statistiques de récolte, journal avec photos, plusieurs jardins, export XML. Potager, balcon, intérieur |
| [Grainly](https://play.google.com/store/apps/details?id=com.grainly.app) (M. Desroy) | 1 k+, mise à jour du 28/10/2026 | Gratuite sans pub, version Premium ; déclare pouvoir collecter position, données personnelles et financières | Calendrier adapté au climat local et au gel, plan du jardin, carnet de cultures, catalogue de plus de 6 000 plantes et variétés, diagnostic de plantes par IA sur photo. Serre et carrés compris |
| [Planter](https://play.google.com/store/apps/details?id=com.perculacreative.peter.gardenplanner) | 500 k+, 4,2 ★ (4,24 k avis), mise à jour du 30/10/2026 | Achats intégrés ; peut collecter position et données personnelles | Grille de plantation, associations, calendrier selon la zone et les gelées, plus de 50 légumes. **Anglais seulement** (la fiche le dit). Légumes uniquement, pas de fleurs |
| [Gardroid](https://play.google.com/store/apps/details?id=com.hookah.gardroid.free) (D. De Kerf) | 100 k+, 4,4 ★ (1,5 k avis), mise à jour du 25/08/2025 | Contient des annonces, version Premium ; aucune donnée collectée | Périodes de semis et de récolte, conseils par plante, notifications par plante, cahier de notes. Fiche en traduction automatique approximative. Pas de plan |
| [Fryd](https://play.google.com/store/apps/details?id=org.alphabeet.app) (Fryd GmbH) | 100 k+, 3,4 ★ (1,89 k avis), mise à jour du 27/10/2026 | Achats intégrés ; peut collecter position et données personnelles | Plan avec placement automatique, plus de 4 000 variétés, score d'associations, rotation pluriannuelle, rappels saisonniers, communauté en ligne |

Ajouts depuis le 20/10 : **Mon Potager**, **Grainly**, **Gardroid** et **Fryd**. Mon Potager est le
plus proche de Jardo par son pari (local, sans compte, plan, journal). Grainly et Mon Potager datent
de 2026 et montrent que le créneau se remplit : la fiche de Mon Potager dit avoir été publiée en
mars 2026 (déduit d'un agrégateur, non vérifié sur la fiche).

Non retenus : *Calendrier du potager* et *Calendrier lunaire* (calendriers seuls), *Gardenize*
(3,9 ★, anglophone, orienté suivi de plantes), *GrowIt* (identification de plantes), *Potagerr*,
*GardenPlan* et les apps « IA » (aucune audience lisible). Je ne les ai pas ouvertes une à une :
c'est un choix de tri, pas un relevé.

**Écart avec le relevé du 20/10.** Jardingue annonçait alors 261 variétés, la météo avec alerte de
pluie et les programmes d'arrosage goutte-à-goutte. La fiche d'aujourd'hui ne mentionne plus ces
points, mais met en avant les boîtes de semis et les étiquettes QR. Le catalogue et la météo
existent peut-être toujours : la fiche a été réécrite, ne rien en conclure.

## Jardo aujourd'hui (vérifié dans le code)

- **Données** : tout dans SQLite sur le téléphone, ni serveur ni compte. Sauvegarde et restauration
  par fichier (`src/data/backup.ts`), version du format incluse.
- **Structure** : un jardin, des espaces typés (potager, verger, petits fruits, serre, bois de
  chauffage), des zones, des plantes, des tas de bois avec stock et séchage. Journal d'interventions
  unique.
- **Tâches** : trois récurrences (tous les N jours, chaque année, une fois), échéance calculée,
  « Reporter », « Fait » qui écrit au journal, annulation de cinq secondes.
- **Rappels** : notification locale quotidienne à l'heure choisie, programmée sur 14 jours
  (`src/lib/reminders.ts`). Désactivée tant que l'utilisateur ne l'active pas.
- **Rappels proposés** : une plante liée au catalogue propose arroser, semer, planter, récolter,
  tailler ; rien n'est créé sans un geste.
- **Catalogue** : 63 espèces (38 légumes, 8 arbres fruitiers, 7 petits fruits, 10 aromatiques),
  fiches « Conseils » avec calendrier selon le climat du jardin (cinq climats, choisis dans Réglages).
- **Carte** : carte isométrique animée en accueil (Skia), assistant de création du jardin avec
  plusieurs dispositions.
- **Météo** : prévision Open-Meteo pour la ville choisie ; une note dit quand la pluie dispense
  d'arroser. Pas d'alerte de gel (aucune trace dans `weather.ts`).
- **Hors connexion** : tout marche sans réseau, sauf la météo et la recherche de ville.
- **Absent** : photos, statistiques de récolte, plusieurs jardins, foyer partagé, version iPhone
  testée, tests sur téléphone réel (l'APK n'a pas encore été essayé par des testeurs).

## Jardo face aux concurrents

✔ = fait et vérifié (Jardo : code ; autres : fiche). ○ = partiel ou à nuancer. — = non mentionné sur la
fiche, ce qui ne prouve pas l'absence.

| | Jardo | Mon Potager | Jardingue | Grainly | Planter | Fryd | Gardroid |
|---|---|---|---|---|---|---|---|
| Hors connexion | ✔ (sauf météo) | ✔ | ✔ | — | — | — | ○ (images en ligne) |
| Données | Sur le téléphone | Sur le téléphone | Aucune collectée | Peut collecter position | Peut collecter | Peut collecter | Aucune collectée |
| Compte requis | Non | Non | Non | — | — | — | Non |
| Sauvegarde / export | ✔ fichier | ✔ XML | — | — | — | — | — |
| Périmètre | Tout le jardin, bois compris | Potager | Potager | Potager, serre | Légumes | Potager | Potager |
| Calendrier de semis | ✔ selon le climat, 63 espèces | ✔ | ✔ | ✔ climat, gel | ✔ zone, gelées | ✔ | ✔ |
| Rappels | ✔ locaux, quotidiens, proposés | ✔ arrosage | ✔ | — | — | ✔ saisonniers | ✔ par plante |
| Tâches annuelles (taille…) | ✔ | — | — | ○ (entretien) | — | — | — |
| Carte / plan | ✔ isométrique animée | ✔ plan libre | ✔ forme du potager | ✔ | ✔ grille | ✔ | — |
| Météo | ✔ prévision + pluie | — | — | ✔ (gel, météo) | — | — | — |
| Journal | ✔ unique | ✔ avec photos | ○ | ✔ | — | — | ✔ notes |
| Photos | — | ✔ | ✔ semis | ✔ | — | — | — |
| Prix | Gratuit, sans pub | Gratuit | Achats intégrés | Premium | Achats intégrés | Achats intégrés | Pubs + Premium |
| Langue | Français | Français | Français | Français | Anglais | Français | Français approximatif |

## Où Jardo est devant

- **Le périmètre.** Verger, petits fruits, serre et bois de chauffage dans la même app que le
  potager. Aucune fiche relevée ne parle de bois ni de tailles annuelles de verger.
- **La carte.** Isométrique, animée, avec un assistant : personne d'autre ne montre le jardin comme
  un petit village vu d'en haut. Ce qui reste à prouver, c'est que les testeurs en tirent plus qu'un
  effet d'accueil.
- **Les rappels qui ne s'imposent pas.** Proposés d'après l'espèce et le climat, créés seulement sur
  un geste, regroupés en une notification par jour. Les concurrents annoncent des rappels, sans
  qu'on voie si l'utilisateur les compose.
- **Le journal comme colonne vertébrale.** Faire une tâche, c'est écrire au journal.
- **Données et confidentialité**, à égalité avec Mon Potager, Jardingue et Gardroid, devant Grainly,
  Planter et Fryd qui déclarent pouvoir collecter la position et des données personnelles. Seule
  fuite de Jardo : la ville envoyée à Open-Meteo pour la météo, à déclarer sur la fiche.
- **Sans abonnement ni publicité** pour l'instant.

## Où Jardo est derrière

- **Les photos.** Mon Potager, Jardingue et Grainly en proposent ; Jardo non. Pour un journal de
  jardin, c'est l'écart le plus visible.
- **L'ampleur du catalogue.** 63 espèces contre plus de 4 000 variétés (Fryd) ou 6 000 (Grainly). Le
  choix est assumé (le catalogue sert la saisie, pas l'encyclopédie), mais un testeur qui cherche
  une variété précise trouvera « sans fiche ».
- **Le suivi des semis et des récoltes chiffrées.** Godets, taux de germination, Gantt et
  statistiques chez Mon Potager ; Jardo ne totalise pas encore les récoltes par saison.
- **Le gel.** Pas d'alerte, alors que Grainly et Planter en font un argument et que c'est le risque
  qui coûte des plants.
- **Plusieurs jardins.** Mon Potager les gère ; Jardo n'en a qu'un.
- **L'audience et le recul.** Planter a plus de 500 000 installations ; Jardo n'a aucun utilisateur
  hors de son auteur. Aucune évaluation réelle sur téléphone.
- **Le plan libre.** La carte de Jardo choisit parmi des dispositions ; on ne dessine pas son jardin
  tel qu'il est, au contraire de Mon Potager et de Jardingue.

## Ce qui manque vraiment à une V1 pour des testeurs

Ce n'est pas ce qui manque pour battre un concurrent, seulement ce qui empêcherait un testeur de
s'en servir et de dire ce qu'il en pense.

1. **Un APK installé sur de vrais téléphones**, avec les vérifications encore non faites sur
   appareil : migrations sur une vraie base, notifications, interrupteurs natifs, TalkBack
   ([guide](guide-apk-test.md)).
2. **Un premier lancement qui mène au premier rappel.** Le chemin « décrire son jardin, ajouter une
   plante, activer le rappel » doit se faire sans aide : c'est ce que les testeurs jugeront en
   premier. Le déduit : à observer sur trois personnes, pas à deviner.
3. **Une façon de recueillir leurs retours** (un formulaire, une adresse) et la sauvegarde sous la
   main, pour ne rien perdre si l'app est réinstallée.
4. **Les mentions légales du Play Store** : politique de confidentialité et déclaration de la ville
   envoyée à Open-Meteo, avant même un test interne.

À garder pour après les retours : photos, alerte de gel, plusieurs jardins, récoltes chiffrées.

## Positionnement proposé pour la fiche Play Store

> Jardo est l'app du jardin familial tout entier : potager, verger, petits fruits et bois de chauffage
> sur une même carte vue d'en haut. Elle note ce que vous faites, et vous rappelle ce qui est à faire
> au bon moment, selon votre climat. Vos données restent sur votre téléphone : pas de compte, pas de
> publicité, et tout marche sans réseau.

À vérifier avant publication : le mot « tout » de « tout marche sans réseau » (la météo demande une
connexion) et la mention des photos si elles arrivent.

## Enseignements

- **La demande est réelle et le créneau se remplit.** Deux apps françaises sérieuses datent de 2026.
  Le potager seul est occupé ; le jardin entier avec le bois et le verger l'est beaucoup moins
  (déduit des fiches, pas d'un décompte exhaustif).
- **Le local est devenu la norme chez les petits.** Mon Potager et Jardingue en font un argument ; Jardo
  ne se distingue plus par là, il s'aligne.
- **Le savoir reste la valeur.** Les grosses apps jouent la taille du catalogue ; Jardo joue la
  justesse de peu d'espèces et des rappels qui en découlent.
- **Photos et gel sont les deux demandes que l'on peut prévoir** : les trois apps les plus récentes
  les mettent en avant.
