# Front Jardo : roadmap

## Fait

- ✅ Projet `jardo-app` (Expo SDK 57, Expo Router, TanStack Query).
- ✅ Socle du nouveau modèle : onglets Jardin · Aujourd'hui · Journal, détail d'un espace,
  d'une zone, d'une plante, d'un tas de bois, formulaires simples, « Fait » optimiste.
- ✅ Types de l'API générés depuis son Swagger, sélecteur de date (Android et web).
- ✅ Testé en local dans le navigateur (vue mobile), branché sur l'API.

## Prochaines étapes (en local)

1. **Enrichir les écrans** : fiches détaillées, formulaires complets, filtres du journal.
2. **Tests du front.**
3. **Confort** : retour haptique sur « Fait », message « annuler » après un « Fait ».

## Plus tard, depuis le PC perso

4. **Test sur téléphone** avec Expo Go : `npx expo start`, puis scanner le QR code
   (l'API doit alors écouter sur le réseau local, pas seulement sur `localhost`).
5. **Héberger l'API en HTTPS**, obligatoire pour un APK installé, qui bloque le HTTP.
   Options : tunnel (gratuit, PC allumé), petit VPS (~4 €/mois, SQLite persistant),
   Azure App Service (~10 €/mois, SQLite mal adapté). Il faudra alors ajouter
   l'**authentification**.
6. **APK installable** : `npx eas-cli@latest build -p android --profile preview`.
7. Notification des tâches dues, photos, stades de croissance, météo.
