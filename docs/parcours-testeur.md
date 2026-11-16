# Parcours d'un testeur : du premier lancement au premier rappel (16/11/2026)

Le [benchmark](benchmark-concurrents.md#ce-qui-manque-vraiment-à-une-v1-pour-des-testeurs) en fait le
premier critère : décrire son jardin, ajouter une plante, recevoir le bon rappel, **sans aide**. J'ai
refait ce chemin comme un proche de Maxime, à l'aise avec un téléphone, pas avec les apps de jardin.

**Méthode.** Version web sur une origine neuve, sans le jardin d'exemple (`npx expo start --web
--no-dev`), à 375 de large, thème clair. Rien sur un téléphone : les notifications n'existent pas sur
le web, tout ce qui les concerne est lu dans le code et dans ses tests. Les captures sont sur la
branche `captures/parcours-testeur`.

## Verdict

| Étape | Sans aide ? | Pourquoi |
|---|---|---|
| Décrire son jardin | **Oui** | L'assistant est court, dessiné, et se comprend sans lire |
| Ajouter une plante | **Avec une hésitation** | La fiche d'un espace vide s'ouvre sur « Aucune tâche », pas sur « Ajouter une plante » |
| Recevoir le bon rappel | **Non** | La notification est éteinte, rangée au cinquième rang de Réglages, et rien n'y mène |

Mon avis : le plus dur est fait, et bien fait. L'assistant, le choix de l'espèce et les rappels
proposés sont au niveau d'une app publiée. Ce qui manque, ce sont les **raccords** entre ces écrans :
après chaque étape réussie, l'app ne dit pas quelle est la suivante. Un testeur ira jusqu'à sa
première plante, cochera « Arroser tous les 3 jours », puis attendra une notification qui ne viendra
jamais. C'est là qu'il conclura que l'app ne rappelle pas, alors que tout est prêt derrière un
interrupteur qu'il n'a pas vu.

## Le parcours, écran par écran

| 1. Accueil de l'assistant | 2. Choix de la maison | 3. Espaces à cocher |
|---|---|---|
| ![](https://github.com/PNJ-Max/Jardo/blob/captures/parcours-testeur/01-assistant-accueil.jpg?raw=true) | ![](https://github.com/PNJ-Max/Jardo/blob/captures/parcours-testeur/02-assistant-maison.jpg?raw=true) | ![](https://github.com/PNJ-Max/Jardo/blob/captures/parcours-testeur/03-assistant-espaces.jpg?raw=true) |

**L'assistant (1 à 3) : rien à redire sur le fond.** Trois écrans, un seul choix par écran, des
dessins qui parlent. Deux réserves :

- L'accueil ne parle que de la carte. Il ne dit pas ce que l'app fait pour moi : noter, rappeler.
- **Impasse si l'on ne coche rien** : le bouton devient « Afficher la carte » et mène à une carte où
  tout est voilé et où rien ne réagit au toucher (capture 11). Pour s'en sortir, il faut deviner
  l'icône de liste de l'en-tête, puis le « + ».

| 4. La carte | 5. Toucher « Potager » | 6. L'onglet Contenu |
|---|---|---|
| ![](https://github.com/PNJ-Max/Jardo/blob/captures/parcours-testeur/04-carte.jpg?raw=true) | ![](https://github.com/PNJ-Max/Jardo/blob/captures/parcours-testeur/05-espace-taches.jpg?raw=true) | ![](https://github.com/PNJ-Max/Jardo/blob/captures/parcours-testeur/06-espace-contenu.jpg?raw=true) |

**La carte (4) est belle et muette.** Rien n'invite à toucher le potager. Les étiquettes ressemblent
assez à des boutons pour qu'on essaie, mais la serre et les petits fruits, dessinés et non cochés, ne
répondent pas : on touche, il ne se passe rien, et rien ne dit pourquoi.

**La fiche de l'espace (5) est le premier vrai accroc.** Je viens de créer mon potager, je veux y
mettre mes tomates, et l'écran me dit « Aucune tâche pour cet espace » avec un seul bouton :
« Ajouter une tâche à cet espace ». La plante est derrière l'onglet « Contenu », un mot qui ne dit pas
« c'est ici qu'on plante ». L'état vide qui convient existe déjà (« Rien n'y pousse encore », avec
« Ajouter une plante »), mais il est caché dans cet onglet. Sous le nom : « 4 zones · 0 élément ». Ni
« zone » ni « élément » ne sont des mots de jardinier.

| 7. Nouvelle plante | 8. Choix de l'espèce | 9. Rappels proposés |
|---|---|---|
| ![](https://github.com/PNJ-Max/Jardo/blob/captures/parcours-testeur/07-plante-formulaire.jpg?raw=true) | ![](https://github.com/PNJ-Max/Jardo/blob/captures/parcours-testeur/08-plante-espece.jpg?raw=true) | ![](https://github.com/PNJ-Max/Jardo/blob/captures/parcours-testeur/09-plante-rappels-proposes.jpg?raw=true) |

**Le formulaire (7 à 9) : le meilleur écran, mal ordonné.** « En ce moment : ail, fève » un 16
novembre, c'est exactement ce qu'on attend d'une app de jardin.

- **Le nom passe avant l'espèce**, et c'est lui qui a le curseur. Qui tape « Tomates » dans Nom et
  valide n'a ni rappels proposés ni onglet Conseils, sans savoir qu'il les a manqués : rien ne dit que
  l'espèce est ce qui les apporte. Dans l'autre sens, choisir l'espèce remplit le nom.
- **« Rappels proposés » n'explique rien** : ni qu'il faut cocher, ni où le rappel apparaîtra.
- **« Planter, à partir d'aujourd'hui » est proposé pour un pommier qui a vingt ans.** Le jardin d'un
  testeur existe déjà : c'est le cas courant, pas l'exception. La proposition reste ensuite sur la
  fiche, sans moyen de l'écarter (capture 13).
- La zone est tout en bas, sur « Aucune », même quand le potager a ses quatre parcelles : la plante
  atterrit « Sans zone ».
- Après « Créer la plante », rien ne confirme les rappels créés ni ne dit où les retrouver.

| 10. Aujourd'hui | 13. Fiche du pommier | 12. Un espace ajouté ensuite |
|---|---|---|
| ![](https://github.com/PNJ-Max/Jardo/blob/captures/parcours-testeur/10-aujourdhui.jpg?raw=true) | ![](https://github.com/PNJ-Max/Jardo/blob/captures/parcours-testeur/13-fiche-pommier.jpg?raw=true) | ![](https://github.com/PNJ-Max/Jardo/blob/captures/parcours-testeur/12-hors-carte.jpg?raw=true) |

**Aujourd'hui (10) tient sa promesse** : « Planter, Ail, une seule fois », un bouton « Fait ».

**Mais le rappel n'arrive pas.** C'est le défaut le plus grave du parcours, et il ne se voit sur
aucun écran :

- Le « Rappel du jour » est éteint à l'installation (`defaultReminderSettings`, `src/lib/reminders.ts`).
- Il s'active dans Réglages, cinquième section, sous le nom, les cinq climats, la carte et la
  sauvegarde. Aucun écran n'y renvoie.
- Le mot « rappel » désigne deux choses : la tâche que je coche dans « Rappels proposés », et la
  notification de Réglages. Ayant coché un rappel, je crois en avoir un.
- Même activé à 10 h pour 8 h, le premier rappel n'arrive que le lendemain : rien ne le dit.

**Un espace ajouté après l'assistant (12)** va dans « Hors carte », alors que la carte dessine, voilé,
le verger qui lui est destiné. Pour le poser, il faut aller dans Réglages, « Modifier la carte ».

| 11. Assistant sans rien cocher | 15. Aujourd'hui, jardin vide | 14. Adresse inconnue |
|---|---|---|
| ![](https://github.com/PNJ-Max/Jardo/blob/captures/parcours-testeur/11-carte-sans-espace.jpg?raw=true) | ![](https://github.com/PNJ-Max/Jardo/blob/captures/parcours-testeur/15-aujourdhui-vide.jpg?raw=true) | ![](https://github.com/PNJ-Max/Jardo/blob/captures/parcours-testeur/14-page-introuvable.jpg?raw=true) |

**Les états vides** sont soignés (15), avec une réserve : un jardin sans aucune tâche affiche « Tout
est fait pour aujourd'hui », ce qui est faux, rien n'a été demandé. **L'adresse inconnue (14)** est
l'écran d'Expo, noir et en anglais, avec un lien « Sitemap » qui ne mène nulle part depuis #72. Un
testeur ne devrait pas le croiser, mais c'est le seul écran de l'app qui n'est pas de Jardo.

## Ce que je corrige, dans l'ordre

Une PR par sujet, les plus utiles d'abord. Les deux sujets déjà connus sont confirmés par le parcours.

1. **Un espace vide s'ouvre sur son contenu**, pas sur « Aucune tâche » : l'invitation « Ajouter une
   plante » devient le premier écran du potager qu'on vient de créer.
2. **Le rappel du jour se propose sur Aujourd'hui** dès qu'une tâche existe et qu'il est éteint : une
   carte, un bouton « Activer », et « Plus tard » pour ne plus la voir. C'est le raccord qui manque
   entre « j'ai coché un rappel » et « mon téléphone me le rappelle ».
3. **Écarter une proposition de rappel** sur la fiche d'une plante.
4. **L'écran « page introuvable » en français**, avec un retour au jardin.

## Ce que je laisse à décider à Maxime

1. **Demander le rappel dans l'assistant, en troisième étape ?** C'est le moment où l'on dit oui le
   plus volontiers, mais Android cesse d'afficher sa demande de permission après un refus répété : la
   poser avant qu'une seule tâche existe, c'est risquer un refus qui dure. Je propose la carte sur Aujourd'hui
   (PR 2) et de garder l'assistant sans notification. À trancher après trois testeurs.
2. **« Tâche » ou « rappel » ?** Les deux mots désignent la même chose selon l'écran. Mon avis : garder
   « tâche » pour ce qui est à faire et réserver « rappel » à la notification, donc renommer « Rappels
   proposés » en « Tâches proposées ». C'est moins vendeur, et c'est un choix de ton : le tien.
3. **L'espèce avant le nom dans le formulaire de plante**, et le nom facultatif, repris de l'espèce.
   Je le ferais : c'est l'espèce qui apporte le calendrier et les rappels. Cela touche au modèle (le
   nom est obligatoire), d'où la question.
4. **Rendre la carte active** : toucher un emplacement voilé proposerait « Ajouter une serre ici », et
   un espace créé prendrait de lui-même l'emplacement libre de son type. Cela règle d'un coup la carte
   muette, l'impasse de l'assistant sans rien cocher et le « Hors carte » inattendu. C'est le plus
   gros chantier de cette liste, et il change un principe de la vision (« un emplacement libre ne
   réagit pas »).
5. **Les mots « zone » et « élément ».** « 4 parcelles · aucune plante » se lit mieux que « 4 zones ·
   0 élément », mais « zone » est le mot du modèle pour un rang ou une tablette de serre.
6. **« Déjà planté »** : pour un arbre en place, proposer de renseigner l'année de plantation plutôt
   que le rappel « Planter ». La PR 3 permet seulement de l'écarter.

## Frictions notées, non traitées

- L'accueil de l'assistant ne dit pas ce que fait l'app au-delà de la carte.
- Assistant sans rien cocher : carte inerte (décision 4).
- Le formulaire d'espace ne propose pas de nom d'après le type choisi (« Verger »).
- La zone par défaut d'une plante est « Aucune », même avec des parcelles.
- Rien ne confirme les rappels créés avec la plante.
- « Tout est fait pour aujourd'hui » sur un jardin sans tâche ; « À jour » sur un espace vide.
- Activé après l'heure choisie, le rappel ne dit pas qu'il commencera demain.
- Le Journal vide montre ses deux rangées de filtres au-dessus de « Le journal est vide ».
- « Ajouter un espace » figure deux fois sur la liste vide (bouton et « + »).

**Vu sur le web seulement, à constater sur l'APK avant d'en conclure quoi que ce soit :**

- Le dessin en tête de la fiche d'un espace disparaît au retour d'un formulaire.
- Après une longue pause, l'origine a perdu sa base : « Error code 1: no such table: spaces » s'est
  affiché sous le formulaire, en anglais, puis l'app est repartie de l'assistant. Probablement le
  navigateur d'essai qui a vidé son stockage, mais le message brut, lui, vient de l'app.

## Hypothèses

- Le testeur a un jardin qui existe déjà : il décrit ce qui est en place plus qu'il ne planifie.
- Il installe l'APK seul, sans que Maxime soit à côté, et ne lit pas de mode d'emploi.
- « Recevoir le bon rappel » veut dire une notification sur le téléphone, pas une ligne dans un onglet.
