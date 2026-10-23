# Front Jardo : roadmap

## Fait

- ✅ Projet `jardo-app` (Expo SDK 57, Expo Router, TanStack Query).
- ✅ Socle du nouveau modèle : onglets Jardin · Aujourd'hui · Journal, détail d'un espace,
  d'une zone, d'une plante, d'un tas de bois, formulaires simples, « Fait » optimiste.
- ✅ Types de l'API générés depuis son Swagger, sélecteur de date (Android et web).
- ✅ Testé en local dans le navigateur (vue mobile), branché sur l'API.
- ✅ Données locales : base SQLite sur l'appareil, API .NET retirée (tag `api-dotnet`). Voir la
  [migration « local d'abord »](etude-architecture-donnees.md#plan-de-migration).

## Prochaines étapes (en local)

1. **Enrichir les écrans** : fiches détaillées, formulaires complets, filtres du journal.
2. **Tests du front.**
3. **Confort** : retour haptique sur « Fait », message « annuler » après un « Fait ».

## Plus tard, depuis le PC perso

4. **Test sur téléphone** avec Expo Go : `npx expo start`, puis scanner le QR code.
5. **APK installable** : `npx eas-cli@latest build -p android --profile preview`.
6. Notification des tâches dues, photos, stades de croissance, météo.
