# Jardo : app mobile

Front Expo (React Native) de l'API `Jardo.Api`. Architecture et écrans dans [`../docs`](../docs/front-architecture.md).

## Lancer en local

Dans deux terminaux :

```bash
dotnet run --project ../Jardo.Api
```

```bash
npm run web
```

Puis ouvrir http://localhost:8081, de préférence en vue mobile (F12, puis mode appareil).

## Tester sur téléphone

Le téléphone (Android) et le PC doivent être sur le **même Wi-Fi**, et le PC en réseau **privé**.

1. **Expo Go** : installer l'app depuis le Play Store. Elle doit gérer le **SDK 57** (le
   projet est en `expo ~57`) ; sinon Expo Go refuse d'ouvrir le projet.
2. **Pare-feu Windows, une seule fois** : PowerShell **en administrateur**, pour ouvrir l'API
   (5015) et Metro (8081) en profil réseau privé uniquement.

   ```powershell
   New-NetFirewallRule -DisplayName "Jardo API (dev)" -Direction Inbound -Protocol TCP -LocalPort 5015 -Action Allow -Profile Private
   New-NetFirewallRule -DisplayName "Jardo Metro (dev)" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Private
   ```

   Pour les refermer :

   ```powershell
   Remove-NetFirewallRule -DisplayName "Jardo API (dev)", "Jardo Metro (dev)"
   ```
3. **API**, avec le profil `lan` (écoute sur toutes les interfaces, développement uniquement) :

   ```bash
   dotnet run --project ../Jardo.Api --launch-profile lan
   ```
4. **Metro** :

   ```bash
   npx expo start
   ```
5. Dans Expo Go, scanner le QR code affiché dans le terminal. L'app déduit l'adresse de l'API
   de celle de Metro : rien à saisir. Pour forcer une autre adresse, mettre
   `EXPO_PUBLIC_API_URL=http://192.168.x.x:5015` dans `jardo-app/.env.local`, puis relancer
   Metro avec `npx expo start -c`.

Le mode web continue de marcher avec le profil `http` habituel.

**Pannes courantes**

- *Le QR code ne charge pas / « timeout »* : Wi-Fi différent entre PC et téléphone (ou « isolation
  des clients » activée sur la box), ou pare-feu non ouvert. Vérifier aussi que Windows qualifie
  le Wi-Fi de réseau **privé** (Paramètres, Réseau et Internet, Wi-Fi, propriétés) : en réseau
  public, les règles ci-dessus ne s'appliquent pas.
- *L'app s'ouvre mais affiche « API injoignable »* : l'API tourne sans `--launch-profile lan`,
  ou le port 5015 est bloqué. Test depuis le navigateur du téléphone :
  `http://<ip-du-pc>:5015/swagger`.
- *« Project is incompatible with this version of Expo Go »* : mettre à jour Expo Go.
- *Adresse du PC changée* (box qui redistribue les IP) : relancer Metro, l'app relit l'adresse.

## Vérifier

```bash
npx tsc --noEmit
```

```bash
npx expo lint
```
