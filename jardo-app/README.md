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

## Vérifier

```bash
npx tsc --noEmit
```

```bash
npx expo lint
```
