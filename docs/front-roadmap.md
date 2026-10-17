# Front Jardo : roadmap

## Fait

- ✅ Projet `jardo-app` (Expo SDK 57, Expo Router, TanStack Query).
- ✅ Tous les écrans du MVP : à arroser, zones, plantes, fiches, formulaires, observations.
- ✅ Testé en local dans le navigateur (vue mobile), branché sur l'API.

## Prochaines étapes (en local)

1. **Finitions visuelles** : couleurs, typo, icône et splash de l'app, mode sombre.
2. **Sélecteur de date** à la place de la saisie `AAAA-MM-JJ`.
3. **Confort** : retour haptique à l'arrosage, message « annuler » après un arrosage.

## Plus tard, depuis le PC perso

4. **Test sur téléphone** avec Expo Go : `npx expo start`, puis scanner le QR code
   (l'API doit alors écouter sur le réseau local, pas seulement sur `localhost`).
5. **Héberger l'API en HTTPS**, obligatoire pour un APK installé, qui bloque le HTTP.
   Options : tunnel (gratuit, PC allumé), petit VPS (~4 €/mois, SQLite persistant),
   Azure App Service (~10 €/mois, SQLite mal adapté). Il faudra alors ajouter
   l'**authentification**.
6. **APK installable** : `npx eas-cli@latest build -p android --profile preview`.
7. Notification quotidienne d'arrosage, photos, stades de croissance, météo.
