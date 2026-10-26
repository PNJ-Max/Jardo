# Jardo

[![CI](https://github.com/PNJ-Max/Jardo/actions/workflows/ci.yml/badge.svg)](https://github.com/PNJ-Max/Jardo/actions/workflows/ci.yml)

Application de gestion du jardin. Potager, verger, petits fruits, bois de chauffage : on y
organise ce que contient le jardin, on note ce qu'on y fait, et l'app rappelle ce qui est à
faire. Une app mobile (Expo) dont les données restent sur le téléphone : pas de serveur, pas de
compte.

La [vision produit](docs/vision-produit.md) et le [modèle du domaine](docs/modele-domaine.md)
décrivent la cible : un jardin, ses espaces typés (potager, verger, petits fruits, serre, bois de
chauffage), leurs zones et leurs plantes, un journal d'interventions et des tâches qui rappellent
ce qui est à faire.

## Tâches et échéances

Une tâche vise un espace, une zone ou un élément, avec un type d'intervention et un rythme :
tous les N jours (arroser), chaque année à une date (tailler), ou une seule fois. L'app calcule
son échéance à partir de la dernière intervention de même type notée au journal, sur la cible
ou sur ce qui la contient : arroser le carré compte pour chacune de ses plantes. Faire une
tâche, c'est noter l'intervention au journal.

| État | Signification |
|---|---|
| `Ok` | l'échéance est dans le futur, ou la tâche ponctuelle est faite |
| `DueSoon` | l'échéance est aujourd'hui |
| `Overdue` | l'échéance est dépassée (`daysOverdue` donne le retard) |

L'état est recalculé à chaque lecture, jamais stocké. Chaque espace compte ses tâches dues ;
l'écran « Aujourd'hui » liste celles de tout le jardin, les plus en retard d'abord, et peut y
ajouter celles des six prochains jours.

## Lancer

```bash
cd jardo-app
npm install
npm run web      # http://localhost:8081
npm test
```

Pour essayer l'app sur un téléphone, voir [`jardo-app/README.md`](jardo-app/README.md).

## Structure

```
jardo-app/
├── src/domain/      logique pure : échéances, tas de bois, vocabulaire (sans base ni horloge)
├── src/data/        base SQLite locale, migrations, services qui appliquent les règles
├── src/api/         types des écrans et hooks TanStack Query au-dessus de src/data
├── src/app/         écrans (Expo Router)
└── __tests__/       Jest, sur une vraie base SQLite en mémoire
docs/                décisions d'architecture et charte
```

L'architecture du front est détaillée dans [`docs/front-architecture.md`](docs/front-architecture.md).
L'app a d'abord reposé sur une API ASP.NET Core, retirée du dépôt : le tag `api-dotnet` en garde
le dernier état (`git checkout api-dotnet`).

## Feuille de route

Voir [`suivi-progression.md`](suivi-progression.md).
