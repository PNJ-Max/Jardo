# Front Jardo : écrans du MVP

Question centrale de l'app : **« qu'est-ce que je dois arroser maintenant ? »**
Le premier écran y répond sans aucune navigation.

Navigation : 3 onglets en bas (À arroser · Zones · Plantes), plus des écrans de détail.

## 1. À arroser (onglet d'accueil)

- **API :** `GET /api/watering/needed`
- Liste des plantes en retard ou à arroser aujourd'hui, les plus urgentes d'abord (le tri est fait
  par l'API).
- Chaque ligne : nom, zone (`zoneName`), voyant rouge/orange, « en retard de N jours ».
- **Action principale : un tap sur « Arrosé »** → `POST /api/plants/{id}/waterings`.
  La ligne disparaît immédiatement (mise à jour optimiste).
- Tirer vers le bas pour rafraîchir.
- **État vide :** « Tout est arrosé 🌱 », c'est le résultat qu'on veut voir.

## 2. Zones

- **API :** `GET /api/zones`
- Liste des zones avec `plantsNeedingWater` en pastille : un coup d'œil indique où il y a du travail.
- Bouton « + » pour créer une zone (`POST /api/zones`).

## 3. Détail d'une zone

- **API :** `GET /api/zones/{id}`, plantes de la zone.
- Bouton **« Arroser toute la zone »** → `POST /api/zones/{id}/waterings`.
- Modifier / supprimer la zone (`PUT`, `DELETE`). La suppression demande une confirmation.
- Ajouter une plante dans cette zone.

## 4. Plantes

- **API :** `GET /api/plants`
- Toutes les plantes, avec leur voyant. Filtre sur les archivées.
- Bouton « + » pour créer une plante (`POST /api/plants`).

## 5. Fiche plante

- **API :** `GET /api/plants/{id}`, `GET /api/plants/{id}/waterings`, `GET /api/plants/{id}/observations`
- En-tête : nom, espèce, zone, date de plantation, intervalle d'arrosage, voyant, prochaine échéance.
- Bouton « Arrosé » (avec choix de la date, sans date future, comme l'API l'impose).
- **Journal** : arrosages et observations dans une chronologie unique.
- Ajouter une observation (`POST /api/plants/{id}/observations`), la supprimer
  (`DELETE /api/observations/{id}`).
- Menu : modifier (`PUT`), archiver / désarchiver, supprimer.

## 6. Formulaires (création et modification)

- **Plante :** nom (obligatoire, 100 max), espèce (100 max), date de plantation,
  intervalle d'arrosage (1 à 365 jours, 3 par défaut), zone.
- **Zone :** nom (+ les champs définis par `ZoneDtos`).
- Les erreurs de validation renvoyées par l'API (ProblemDetails) s'affichent sous le champ concerné.

## Voyant : code visuel

| `wateringStatus` | Couleur | Texte |
|---|---|---|
| `Ok` | vert | « Prochain arrosage le {date} » |
| `DueSoon` | orange | « À arroser aujourd'hui » |
| `Overdue` | rouge | « En retard de {daysOverdue} j » |

Ne pas se reposer sur la couleur seule : on ajoute toujours le texte ou une icône (accessibilité).

## Plus tard (hors MVP)

Stades de croissance, météo, photos sur les observations, notification quotidienne.
