# Revue de Jardo par Fable (16/11/2026)

Avis sur le code et le produit, après lecture de `jardo-app/src`, des tests et des docs, et un tour
de l'app dans Chrome (375 de large, clair et sombre). Rien n'a été essayé sur un téléphone : ce qui
touche au natif est jugé à la lecture du code.

## En bref

- **Le code est bon et n'a pas besoin d'être réécrit.** Aucun problème de performance mesurable à
  l'échelle d'un jardin familial, peu de duplication. Les faiblesses sont quelques écritures fragiles,
  des lectures sans borne qui pèseront dans deux ou trois ans, et des trous dans le parcours.
- **Le risque n'est plus dans le code, il est dans l'absence d'essai réel.** 1 873 tests, aucun
  lancement sur un appareil. Le prochain travail utile est l'APK, pas un refactor.

## À garder

- Le découpage domaine / services / écrans : `src/domain` n'importe rien hors de lui-même, l'échéance
  ne se calcule qu'à un endroit. L'horloge injectée et les jours en chaîne ferment les bugs de fuseau.
- Les tests sur une vraie SQLite, sans mock entre l'écran et la base.
- La file des transactions (`data/db.ts`), `createStyles` et les jetons, le compilateur React (ne pas
  rajouter de `useMemo`), « Fait » avec annulation, l'accessibilité traitée comme une fonction, et le
  refus des dépendances.

## Ce qui est faible

Mesures sur une base de trois ans (72 plantes, 72 tâches, 9 000 entrées), `node:sqlite` sur PC :
tâches dues 10 à 20 ms, liste des espaces 11 ms, « Fait » 8 ms et 11 requêtes, journal entier 55 ms.

1. **« Fait » n'est écrit qu'après 1,2 s d'animation** (`components/tasks.tsx:274-282`, « Tout
   arroser » dans `components/today.tsx:163-169`). Taper « Fait » puis verrouiller le téléphone peut
   perdre l'écriture si Android ferme l'app : à vérifier sur l'APK.
2. **Une plante et ses rappels ne s'enregistrent pas d'un seul tenant** (`api/queries.ts:279-284`) :
   un rappel refusé laisse la plante créée, et un second appui en crée une deuxième.
3. **Un `ROLLBACK` qui échoue cache l'erreur d'origine** (`data/db.ts:34-37`).
4. **Les rappels sont tous annulés puis reprogrammés un par un** à chaque retour sur l'app
   (`lib/notifications.ts:57-63`) : une app fermée dans l'intervalle ne rappelle plus rien.
5. **Le journal se lit toujours en entier** (`data/journal.ts:352-355`, sans `LIMIT`) : l'onglet après
   chaque « Fait », la fiche d'un espace pour en montrer cinq lignes (`components/sections.tsx:196`),
   la feuille d'une récolte pour la dernière (`components/task-sheet.tsx:83`). Sans effet pour des
   testeurs.
6. **La carte s'anime à 30 images par seconde tant que l'accueil est affiché**
   (`components/map/skia-scene-impl.tsx:75-81`), et chaque vignette immobile est un `Canvas` Skia. À
   mesurer sur l'APK (batterie, défilement).
7. **`src/lib` est un fourre-tout** (logique pure, adaptateurs natifs, vocabulaire), avec des imports
   dans les deux sens vers `data`. Aucune règle ESLint ne garde les frontières.
8. **`components/tasks.tsx`** (528 lignes, cinq minuteurs dans `TaskRow`) : ne plus rien y ajouter.
9. **Accessibilité** : « Annuler » disparaît après 5 s même sous TalkBack (`components/undo.tsx:8`),
   et flotte 49 points trop haut hors des onglets (`undo.tsx:11`).
10. **Restes** : une vingtaine de `String(id)` sur des identifiants déjà en chaîne, `capitalize` et le
    filtre de cible en double, la restauration optimiste écrite trois fois (`api/queries.ts:467`).

Bundle Android : 5,7 Mo (Hermes), normal. 967 Ko de police Material Symbols partent dans l'APK sans
servir, tirés par `expo-router` : rien à faire sans bricoler Expo.

## Mon avis sur le produit

Je garderais le positionnement « tout le jardin », le local sans compte, la carte dessinée, Lanterne
et le refus du jeu. Là où je pense qu'on se trompe :

1. **On ne peut pas noter une intervention depuis l'onglet Journal** : il faut passer par Jardin,
   l'espace, son onglet Journal. Quatre gestes pour la moitié de la promesse de l'app.
2. **Le rappel du jour est éteint et caché dans Réglages** (`lib/reminders.ts:13`). Un testeur qui
   crée ses tâches ne recevra rien, et conclura que l'app ne rappelle pas.
3. **Le « retard » est un mot de gestionnaire de tâches.** Le jardin d'exemple accueille par « 11
   choses à faire, dont 8 en retard », bordé de rouge. Un arrosage n'est pas « en retard de 6 jours »,
   il est à faire. Je garderais le retard pour ce qui a une vraie date (taille, traitement).
4. **L'app s'ouvre sur une carte muette** alors qu'on vient savoir quoi faire. Ouvrir sur Aujourd'hui,
   ou signaler sur la carte les espaces qui attendent.
5. **L'alerte de gel est presque gratuite** : la prévision porte déjà la température minimale, la note
   de pluie donne le modèle. C'est l'argument de deux concurrents.
6. **Le catalogue a été construit avant de savoir si quelqu'un note quoi que ce soit**, et le web a
   reçu trop de soin. Je n'y ajouterais plus rien avant les retours.
7. **Le Journal n'a pas suivi la direction visuelle** : une carte bordée par entrée, sous deux rangées
   de filtres. Si un écran doit être refait, c'est lui.

## Améliorations, par rapport impact sur effort

Une ligne, une PR. « Toi » : il faut ta décision. Aucune n'est faite : la consigne du 16/11 réserve
le temps restant à la sécurité et à la perte de données avant l'APK.

| # | Amélioration | Impact | Effort | Qui |
|---|---|---|---|---|
| 1 | « Noter une intervention » depuis l'onglet Journal | Fort | Petit | Seul |
| 2 | Écrire les « Fait » en attente quand l'app quitte le premier plan | Fort, rare | Petit | Seul |
| 3 | Note de gel sur Aujourd'hui | Fort | Petit | Seul (seuil à confirmer) |
| 4 | Délai d'« Annuler » adapté au lecteur d'écran | Moyen | Très petit | Seul |
| 5 | Le `ROLLBACK` qui échoue garde l'erreur d'origine | Faible | Très petit | Seul |
| 6 | Règle ESLint qui garde `src/domain` pur | Moyen | Très petit | Seul |
| 7 | Plante et rappels dans une seule transaction | Moyen | Moyen | Seul |
| 8 | Proposer le rappel depuis Aujourd'hui, à la première tâche | Fort | Moyen | Seul, visible sur téléphone |
| 9 | Journal en surfaces groupées, filtres repliés | Moyen | Moyen | Seul, sur maquette |
| 10 | Rappels à identifiants stables, sans tout annuler | Moyen | Moyen | Seul, après l'APK |
| 11 | Journal paginé | Dans deux ans | Moyen | Seul |
| 12 | Ménage (`String(id)`, doublons), « Reporter à… » un autre jour, hauteur d'« Annuler » | Faible | Petit | Seul |
| 13 | « À faire » plutôt qu'« en retard » pour ce qui revient tous les N jours | Fort | Petit | **Toi** |
| 14 | Ouvrir sur Aujourd'hui, ou signaler sur la carte ce qui attend | Fort | Petit | **Toi** |
| 15 | Activer le rappel à la fin de l'assistant | Fort | Petit | **Toi** |
| 16 | Lien « Donner mon avis » dans Réglages | Fort pour le test | Très petit | **Toi** (quelle adresse ?) |
| 17 | Arrêter l'animation de la carte après quelques secondes | À mesurer | Petit | **Toi**, après l'APK |
| 18 | Photos au journal | Fort | Gros | **Toi**, après les testeurs |

## Limites

Lu : la couche de données, les hooks, les onglets, les fiches, les formulaires, la carte, les
rappels ; pas chaque fiche d'espèce ni chaque scène dessinée. La suite de tests a pris 106 s sur une
machine chargée ; onze tests d'Aujourd'hui y ont dépassé leur délai et passent seuls en 7 s.
