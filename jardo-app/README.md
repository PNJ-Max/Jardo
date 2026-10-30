# Jardo : app mobile

App Expo (React Native). Les données sont dans une base SQLite sur l'appareil : aucun serveur à
lancer. Architecture et écrans dans [`../docs`](../docs/front-architecture.md).

## Lancer en local

```bash
npm run web
```

Puis ouvrir http://localhost:8081, de préférence en vue mobile (F12, puis mode appareil).

## Tester sur téléphone

Le téléphone (Android) et le PC doivent être sur le **même Wi-Fi**, et le PC en réseau **privé**.

1. **Expo Go** : installer l'app depuis le Play Store. Elle doit gérer le **SDK 57** (le
   projet est en `expo ~57`) ; sinon Expo Go refuse d'ouvrir le projet.
2. **Pare-feu Windows, une seule fois** : PowerShell **en administrateur**, pour ouvrir Metro
   (8081) en profil réseau privé uniquement.

   ```powershell
   New-NetFirewallRule -DisplayName "Jardo Metro (dev)" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Private
   ```

   Pour la refermer :

   ```powershell
   Remove-NetFirewallRule -DisplayName "Jardo Metro (dev)"
   ```
3. **Metro** :

   ```bash
   npx expo start
   ```
4. Dans Expo Go, scanner le QR code affiché dans le terminal.

**Pannes courantes**

- *Le QR code ne charge pas / « timeout »* : Wi-Fi différent entre PC et téléphone (ou « isolation
  des clients » activée sur la box), ou pare-feu non ouvert. Vérifier aussi que Windows qualifie
  le Wi-Fi de réseau **privé** (Paramètres, Réseau et Internet, Wi-Fi, propriétés) : en réseau
  public, la règle ci-dessus ne s'applique pas.
- *« Project is incompatible with this version of Expo Go »* : mettre à jour Expo Go.
- *Adresse du PC changée* (box qui redistribue les IP) : relancer Metro, l'app relit l'adresse.

## Installer un APK de test

Pour produire un APK à installer chez des proches (compte Expo, build EAS, mises à jour, puis tests
internes du Play Store) : [`../docs/guide-apk-test.md`](../docs/guide-apk-test.md).

## Vérifier

```bash
npm test
```

```bash
npx tsc --noEmit
```

```bash
npx expo lint
```
