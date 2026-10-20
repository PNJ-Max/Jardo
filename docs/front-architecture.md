# Front Jardo : architecture

Application mobile Android pour gérer son jardin. Elle consomme l'API
`Jardo.Api`, sans autre back-end.

## Décision : Expo (React Native + TypeScript)

Le front est une **vraie app native**, pas un site web installé. Le choix tient en trois critères :

1. **Test immédiat sur le téléphone.** `npx expo start` affiche un QR code. On le scanne avec
   l'app *Expo Go* et l'app tourne sur le téléphone en direct. Aucun HTTPS ni hébergement n'est
   nécessaire pendant le développement.
2. **APK sans Android Studio.** `eas build` compile dans le cloud et renvoie un lien
   d'installation. Pas de SDK Android à configurer sur Windows.
3. **Natif quand il le faut.** Notifications d'arrosage, appareil photo pour les observations,
   stockage local : tout est disponible via des modules Expo.

**Alternatives écartées :**

- *Angular PWA* : pas de vraies notifications sur iPhone, pas d'APK, et il faut du HTTPS
  dès le premier test sur téléphone.
- *Ionic + Capacitor* : demande Android Studio et le SDK Android en local, et le rendu
  reste celui d'une page web.
- *.NET MAUI* : outillage lourd et écosystème plus mince, ce qui complique le développement
  assisté par IA.
- *Flutter* : très bon, mais Dart serait le seul usage de ce langage dans le projet.

## Pile technique

| Besoin | Choix | Pourquoi |
|---|---|---|
| Framework | Expo SDK 57, TypeScript strict | Standard actuel de React Native |
| Navigation | **Expo Router** | Routes basées sur les fichiers, onglets et piles prêts à l'emploi |
| Données serveur | **TanStack Query** | Cache, rechargement, états chargement/erreur, mises à jour optimistes |
| Client API | `fetch` + types générés depuis le Swagger de l'API par `@hey-api/openapi-ts` | Contrat toujours aligné sur l'API ; `openapi-typescript` exige TypeScript 5, `@hey-api/openapi-ts` accepte TypeScript 6 |
| Formulaires | `useState` + validation légère, erreurs de l'API sous les champs | Suffisant pour six formulaires simples |
| Dates | `@react-native-community/datetimepicker` sur Android, `<input type="date">` sur le web | Recommandé par Expo et inclus dans Expo Go ; le module n'existe pas sur le web |
| Style | `StyleSheet` + `src/theme/` (`useTheme`, `createStyles`) | Aucune dépendance ; suit le mode clair / sombre du téléphone ; jetons décrits dans la [charte graphique](charte-graphique.md) |
| Polices | `@expo-google-fonts/nunito` + `expo-font` | Chargée au démarrage, écran de démarrage maintenu jusque-là |
| Icônes | `@expo/vector-icons` (Ionicons) | Inclus dans Expo |
| Notifications (plus tard) | `expo-notifications` | Rappel d'arrosage local |

Rien de plus. Pas de Redux : TanStack Query couvre l'état serveur, et l'état local reste
dans `useState`.

## Structure

```
jardo-app/                    (à la racine du repo, à côté de Jardo.Api)
├── src/app/                  écrans, un fichier = une route (Expo Router)
│   ├── (tabs)/
│   │   ├── index.tsx         Jardin : les espaces (accueil)
│   │   ├── today.tsx         Aujourd'hui : les tâches dues et « Fait »
│   │   └── journal.tsx       Journal : la chronologie du jardin
│   ├── space/[id].tsx        détail d'un espace (tâches, zones, éléments, journal)
│   ├── zone/[id].tsx         détail d'une zone
│   ├── plant/[id].tsx        fiche plante
│   ├── wood-pile/[id].tsx    fiche tas de bois
│   └── */form.tsx            formulaires en modale : space, zone, plant, wood-pile,
│                             entry (intervention), task ; ?id= pour modifier
├── src/api/
│   ├── generated/            types générés depuis le Swagger (ne pas modifier)
│   ├── types.ts              noms courts des contrats (Space, GardenTask…)
│   ├── client.ts             fetch, ApiError (ProblemDetails), query string
│   └── queries.ts            hooks TanStack Query, clés de cache, invalidations
├── src/components/ui/        briques de base (boutons, carte, champs, date, pastille, états)
├── src/components/           lignes et sections métier (tâche, intervention, espace, élément)
├── src/lib/                  vocabulaire du domaine, dates, confirmations, navigation
├── src/theme/                palettes clair / sombre, typographie, useTheme, createStyles
└── app.json                  configuration Expo
```

## Contrat de l'API

Les types de `src/api/generated/` sont générés depuis `/swagger/v1/swagger.json`. Après un
changement de DTO côté .NET, API démarrée :

```bash
npm --prefix jardo-app run api:types
```

Le fichier généré est commité : le front compile sans l'API. Côté API, `Program.cs` configure
Swagger pour que le contrat soit exact (types de référence non nuls, enums nullables, propriétés
des réponses toujours présentes via `ResponsePropertiesRequiredFilter`).

## Conventions

- **Le voyant vient du serveur.** On affiche le `status` d'une tâche (`Ok` / `DueSoon` / `Overdue`),
  `daysOverdue` et `nextDueDate` tels quels. Le front ne recalcule jamais l'échéance, ni le stock
  ou le séchage d'un tas de bois : c'est la règle posée côté API.
- **Erreurs.** L'API renvoie du ProblemDetails (RFC 9457). Un seul utilitaire transforme
  une réponse d'erreur en message lisible pour l'écran.
- **Dates.** Les dates du jardin sont des `DateOnly` : on les manipule en chaîne `YYYY-MM-DD`,
  sans conversion de fuseau. Le champ de date (`DateField`) peut interdire les jours futurs.
- **Mise à jour optimiste** pour « Fait » : la tâche quitte les listes de tâches dues aussitôt,
  et revient si l'API refuse.
- **Invalidations par famille de ressources.** Une intervention ou un « Fait » recharge le
  journal, les tâches, les compteurs des espaces et les tas de bois ; une tâche, les tâches et
  les espaces ; un espace, une zone ou un élément, tout le jardin (`src/api/queries.ts`).
- **Mobile-first, une main.** Les actions principales sont en bas de l'écran, avec de
  grandes zones de toucher.
- **Commentaires** : comme dans le back, on explique *pourquoi*, pas ce que fait la ligne.

## Connexion à l'API

**Pour l'instant, tout tourne en local sur le PC** : l'app en mode web dans le navigateur
(`npm run web`, port 8081), l'API sur `http://localhost:5015`. Rien n'est exposé sur le réseau.

- L'URL de l'API vaut `http://localhost:5015` par défaut, et peut être changée avec
  `EXPO_PUBLIC_API_URL` dans un fichier `jardo-app/.env.local`.
- La politique CORS `FrontDev` de `Program.cs` autorise `http://localhost:8081`. Elle ne sert
  qu'au mode web : une app native n'est pas soumise à CORS.
- Test sur téléphone et hébergement HTTPS : plus tard, depuis le PC perso (voir la roadmap).

## Hors périmètre du MVP

Authentification, mode hors-ligne complet, iOS (possible plus tard avec le même code),
publication sur le Play Store.
