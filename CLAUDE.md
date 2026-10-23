# Jardo

App de gestion du jardin : potager, verger, petits fruits, bois de chauffage… On y
organise ce que contient le jardin, on note ce qu'on y fait, et l'app rappelle ce qui est à
faire. L'arrosage est le premier de ces rappels, pas le cœur de l'app.
Objectif : une vraie app, publiable un jour sur le Play Store.

Vision : [`docs/vision-produit.md`](docs/vision-produit.md). Modèle cible :
[`docs/modele-domaine.md`](docs/modele-domaine.md). L'app implémente ce modèle.

Les données vivent sur le téléphone (SQLite), sans serveur : voir
[`docs/etude-architecture-donnees.md`](docs/etude-architecture-donnees.md). L'ancienne API .NET est
retirée du dépôt ; le tag `api-dotnet` en garde le dernier état.

- `jardo-app/` : l'app Expo (React Native + TypeScript), Expo Router, TanStack Query, expo-sqlite. Tests Jest dans `jardo-app/__tests__/`. Règles Expo dans `jardo-app/AGENTS.md`.
- `docs/` : décisions d'architecture et charte. `suivi-progression.md` : état du projet et feuille de route.

## Commandes

```bash
npm --prefix jardo-app run web -- --port 8081
npm --prefix jardo-app test
```

Dans `jardo-app/` : `npx expo lint` et `npx tsc --noEmit`.

## Méthode

- **Réfléchir avant de coder.** Expliciter ses hypothèses. Si la demande est ambiguë ou admet plusieurs approches, les exposer et demander plutôt que trancher en silence ; dire franchement quand une approche plus simple existe.
- **La simplicité d'abord.** Le minimum de code qui résout le problème posé : pas de fonctionnalité, d'option, de configuration ni de gestion d'erreur pour des cas qui n'existent pas encore.
- **Des changements chirurgicaux.** Chaque ligne modifiée se rattache à la demande. Ne pas reformater, renommer ni « améliorer » le code voisin ; supprimer ce que son propre changement rend inutile, signaler le reste dans la PR.
- **Un objectif vérifiable.** Traduire la tâche en critères de réussite qu'on peut vérifier (un test qui échoue puis passe, un build, une capture), boucler jusqu'à les atteindre, et ne jamais déclarer une tâche finie sans les avoir vérifiés.
- **Lire de façon ciblée.** Chercher avant d'ouvrir, et ne lire que les parties utiles d'un fichier : le contexte coûte.

## Règles de code

- Niveau professionnel. Un commentaire n'existe que si le *pourquoi* n'est pas évident à la lecture. Jamais de commentaire pédagogique qui explique le langage, le framework ou ce que fait la ligne.
- Identifiants et noms de fichiers de code en anglais ; textes affichés à l'utilisateur et documentation en français.
- Pas de sur-ingénierie : pas de couche, de dépendance ou d'abstraction qu'aucun besoin actuel ne justifie (pas de Repository ni de Redux : TanStack Query porte l'état des écrans, les services de `src/data/` parlent directement à la base).
- Suivre les conventions existantes : logique pure dans `src/domain/`, services dans `src/data/` (règles refusées en `ProblemError`), horloge injectée (`Clock`) plutôt que `new Date()` dans la logique. Voir [`docs/front-architecture.md`](docs/front-architecture.md).

## Workflow

- Chaque tâche se fait sur une branche dédiée et arrive sur `main` par une Pull Request (`gh pr create`).
- Avant d'ouvrir la PR : `npm test`, `npx expo lint` et `npx tsc --noEmit` verts (dans `jardo-app/`).
- Mettre à jour `suivi-progression.md` (section « Où on en est ») dans la même PR.
