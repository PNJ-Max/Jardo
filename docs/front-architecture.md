# Front Jardo : architecture

Application mobile Android pour consulter et arroser son potager. Elle consomme l'API
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
| Client API | `fetch` + types écrits à la main (`src/api/types.ts`) | `openapi-typescript` n'accepte pas encore TypeScript 6 |
| Formulaires | `useState` + validation légère, erreurs de l'API sous les champs | Suffisant pour 3 formulaires |
| Style | `StyleSheet` + `src/theme.ts` | Aucune dépendance ; la charte viendra plus tard |
| Icônes | `@expo/vector-icons` (Ionicons) | Inclus dans Expo |
| Notifications (plus tard) | `expo-notifications` | Rappel d'arrosage local |

Rien de plus. Pas de Redux : TanStack Query couvre l'état serveur, et l'état local reste
dans `useState`.

## Structure

```
jardo-app/                    (à la racine du repo, à côté de Jardo.Api)
├── src/app/                  écrans, un fichier = une route (Expo Router)
│   ├── (tabs)/
│   │   ├── index.tsx         « À arroser »
│   │   ├── zones.tsx         liste des zones
│   │   └── plantes.tsx       toutes les plantes
│   ├── zone/[id].tsx         détail d'une zone
│   ├── zone/form.tsx         création / modification (?id=)
│   ├── plante/[id].tsx       fiche plante + journal
│   ├── plante/form.tsx       création / modification (?id= ou ?zoneId=)
│   └── plante/observation.tsx
├── src/api/                  client fetch, hooks TanStack Query, types
├── src/components/           ui.tsx (briques de base), plants.tsx (voyant, ligne plante)
├── src/lib/                  dates, confirmations, navigation
├── src/theme.ts              couleurs et espacements
└── app.json                  configuration Expo
```

## Conventions

- **Le voyant vient du serveur.** On affiche `wateringStatus` (`Ok` / `DueSoon` / `Overdue`),
  `daysOverdue` et `nextWateringDate` tels quels. Le front ne recalcule jamais l'échéance,
  c'est la règle déjà posée côté API.
- **Erreurs.** L'API renvoie du ProblemDetails (RFC 9457). Un seul utilitaire transforme
  une réponse d'erreur en message lisible pour l'écran.
- **Dates.** Les dates d'arrosage sont des `DateOnly` : on les manipule en chaîne
  `YYYY-MM-DD`, sans conversion de fuseau.
- **Mises à jour optimistes** pour l'arrosage : le voyant passe au vert immédiatement, et
  revient en arrière si l'API refuse.
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
