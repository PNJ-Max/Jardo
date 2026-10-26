# Étude : où vivent les données de Jardo

Étude d'architecture du 21/10/2026, sans code. Les arbitrages de Maxime datent du même jour.
Elle tranche la question laissée ouverte par le [benchmark](benchmark-concurrents.md#ce-que-jardo-en-retient) :
faut-il héberger l'API avant de publier, ou garder les données sur le téléphone ?

## En bref

- **Les données vivent sur le téléphone**, dans une base SQLite (`expo-sqlite`). Il n'y a ni
  serveur ni compte, rien à héberger : 0 €/mois. L'app marche au fond du jardin sans réseau.
- **La logique métier passe en TypeScript dans l'app.** Les tests C# servent de spécification au
  portage. L'API .NET est retirée après la bascule. Elle reste dans l'historique git et peut
  revenir comme serveur de synchronisation.
- **Contre la perte du téléphone**, deux protections sans serveur : la sauvegarde automatique
  d'Android et l'export manuel d'un fichier.
- **La synchronisation (foyer, plusieurs appareils) se décidera quand le foyer arrivera.** Le
  schéma s'y prépare dès maintenant avec des identifiants UUID.
- **La migration tient en sept PR.** L'app reste utilisable à chacune, et les quatre premières ne
  changent rien à l'écran.

## La question

L'app Expo parle à l'API ASP.NET Core qui tourne sur le PC de Maxime. Pour la publier, il faudrait
héberger l'API et sa base, gérer des comptes et sécuriser le tout. Même hébergée, l'app ne marche
pas sans réseau, alors qu'au fond du jardin la connexion est souvent mauvaise. Jardingue, le
concurrent français, marche entièrement hors connexion et déclare ne collecter aucune donnée. Il en
fait un argument.

## Les arbitrages de Maxime

| Question | Réponse | Ce que ça implique |
|---|---|---|
| Hors connexion ou partage en famille d'abord ? | **Hors connexion d'abord** | Tout marche sans réseau et sans compte dès la v1 ; le foyer vient plus tard |
| Budget mensuel une fois publiée ? | **0 €** | Ni serveur payant ni offre gratuite qui s'endort au mauvais moment |
| Place du .NET ? | **Peu importe** | On prend la meilleure architecture pour l'app, même si le .NET quitte le projet |
| Horizon de publication ? | **Famille d'abord, public plus tard**, sans date | D'abord des APK et le test interne du Play Store ; la fiche publique quand l'app sera mûre |

## Ce que l'existant impose

- **La logique métier ne se limite pas aux calculs purs.** `DueDateCalculator`,
  `WoodPileCalculator` et `LatestInterventions` sont les plus visibles, mais les services
  (`JournalService`, `SpaceService`, `TaskService`, `WoodPileService`, `PlantService`,
  `ZoneService`, `GardenMapService` et leurs aides `InterventionTarget`, `ItemPlacement`,
  `TaskQueries`, `WoodMovements`, `GardenLayouts`) font environ 2 000 lignes. Ils portent
  **51 règles métier** : cohérence des cibles, types acceptés par un espace, noms uniques, stock de
  bois jamais négatif, etc. L'API compte **148 cas de test**.
- **Aucun code C# ne tourne dans une app Expo.** Garder les données sur le téléphone, c'est porter
  cette logique en TypeScript. Faire tourner du .NET sur Android reviendrait à refaire l'app en
  .NET MAUI, déjà écarté (voir [l'architecture du front](front-architecture.md#décision--expo-react-native--typescript)).
- **Rien de dérivé n'est stocké.** Échéances, stock et séchage se calculent à la lecture. Une
  future synchronisation n'aura donc pas d'état dérivé à réconcilier, seulement des lignes.
- **Les identifiants sont des entiers auto-incrémentés.** Deux appareils qui créent des lignes
  hors connexion produiraient les mêmes. Il faut des UUID avant d'avoir de vraies données.
- **Le stock de bois ne passe jamais sous zéro.** Cet invariant porte sur plusieurs lignes. Sur un
  seul appareil, une transaction le garantit. En fusionnant deux appareils, il peut sauter.
- **Côté front, TanStack Query accepte n'importe quelle fonction asynchrone.** Les 17 hooks de
  `jardo-app/src/api/queries.ts` appellent aujourd'hui `api()` (`client.ts`). Ils peuvent appeler
  une couche locale sans changer leurs clés de cache ni leurs invalidations.
- **Tester sur le téléphone demande aujourd'hui l'API sur le PC**, le profil `lan` et des règles
  de pare-feu (voir le [README de jardo-app](../jardo-app/README.md#tester-sur-téléphone)).

## Les options

**A. Serveur d'abord.** C'est la situation actuelle, mise en ligne : API .NET hébergée (Azure
Container Apps, Render, Fly.io…), base Postgres hébergée (Supabase, Neon…) et authentification
(Supabase Auth, ASP.NET Core Identity…). Il faut ajouter le HTTPS, des comptes, des droits par
jardin, la suppression de compte, des migrations de production, des sauvegardes et de la
surveillance.

**B1. Local d'abord, sans synchronisation.** Une base SQLite sur le téléphone, la logique métier
dans l'app, aucun serveur. Plus tard, une synchronisation facultative pour le foyer.

**B2. Local d'abord, avec un moteur de synchronisation dès la v1.** Même base locale, plus un
moteur qui la réplique vers un serveur : PowerSync, ou libSQL et Turso, déjà intégrés à
`expo-sqlite`. Le partage marche dès le départ, mais il faut des comptes et un serveur.

**C. Hybride.** Le serveur reste la source de vérité. L'app garde un cache lisible hors connexion
et une file d'écritures qu'elle rejoue au retour du réseau.

**D. API auto-hébergée sur le PC.** C'est A, mais sur le PC de Maxime, exposé par un tunnel
Cloudflare : pas de facture d'hébergement, mais le PC doit rester allumé.

## Comparaison

| Critère | A. Serveur | B1. Local | B2. Local + sync | C. Hybride | D. PC |
|---|---|---|---|---|---|
| Hors connexion | Non : aucun écran sans réseau | **Complet** | Complet, synchronisé au retour du réseau | Partiel : lecture du cache, écritures en attente ; échéances et stock ne se recalculent qu'au retour du serveur, sauf à dupliquer la logique | Non, et le PC doit être allumé |
| Confidentialité (formulaire Play) | Contenu du jardin et identifiants collectés ; politique de confidentialité ; suppression de compte | **Aucune donnée collectée** (traitée sur l'appareil) ; politique de confidentialité tout de même | Comme A | Comme A | Comme A |
| Coût à 0 € | Seulement avec des offres qui s'endorment ou se mettent en pause, sans sauvegarde ; confortable dès 7 à 25 $/mois | **0 €** | PowerSync gratuit désactivé après une semaine d'inactivité (Pro à 49 $/mois), Turso gratuit plus large ; dans tous les cas, une base serveur et des comptes | Comme A | Électricité, plus un nom de domaine payant pour une adresse stable |
| Comptes et sécurité | Tout à construire : inscription, jetons, droits par jardin, suppression de compte dans l'app et sur le web, API exposée à durcir | **Aucun compte** ; la surface d'attaque est le téléphone | Comme A, plus les règles de synchronisation par utilisateur | Comme A, plus le rejeu des écritures | Comme A, plus le réseau domestique exposé |
| Téléphone perdu | Rien de perdu si la base est sauvegardée (pas de sauvegarde chez Supabase gratuit) | Sauvegarde automatique Android et export manuel ; rien de sûr si l'utilisateur a coupé la sauvegarde | Copie sur le serveur | Copie sur le serveur, sauf les écritures en attente | Selon les sauvegardes du PC |
| Famille, plusieurs appareils | Oui | Non, plus tard par une synchronisation | Oui | Oui | Oui |
| Notifications locales | Seulement à partir des dernières données lues en ligne ; sinon des push (FCM, tâche planifiée sur le serveur), hors d'Expo Go | **Simples** : l'app calcule les échéances et planifie ses rappels (`expo-notifications`, dans Expo Go) | Comme B1 | Sur le cache, à recalculer au retour du serveur | Comme A |
| Effort de migration | Faible pour la logique (le .NET reste) ; élevé pour l'hébergement, les comptes et la sécurité | **Élevé, une seule fois** : porter environ 2 000 lignes et 148 tests, basculer le front ; plus simple ensuite | B1, plus le moteur, son schéma et les comptes | **Le plus élevé** : serveur, file d'écritures, conflits, logique dupliquée | Faible en code, élevé en exploitation |
| Maintenabilité pour un développeur .NET | Deux langages, deux déploiements, un serveur à surveiller | **Un seul langage** (TypeScript), un seul livrable (l'APK), des tests Jest proches de xUnit, du SQL déjà connu | B1, plus un service tiers à comprendre | Deux implémentations de la même logique à garder alignées | A, plus l'administration du PC |

## Coûts vérifiés le 21/10/2026

| Service | Offre gratuite | Premier palier payant |
|---|---|---|
| [Supabase](https://supabase.com/pricing) | 500 Mo, 50 000 utilisateurs actifs par mois, 2 projets ; **pause après une semaine d'inactivité**, aucune sauvegarde automatique | Pro dès 25 $/mois, sauvegardes quotidiennes gardées 7 jours |
| [Render](https://render.com/docs/free) | 750 h par mois ; **mise en veille après 15 min sans trafic, environ une minute de réveil** ; Postgres gratuit de 1 Go qui **expire 30 jours** après sa création (14 jours de grâce) | Starter vers 7 $/mois ([source secondaire](https://temps.sh/blog/render-pricing-2026), la page de prix officielle ne l'affiche pas en texte) |
| [Fly.io](https://docs.fly.io/about/pricing) | Aucune pour une nouvelle organisation (essai de 2 h ou 7 jours) | 2,19 $/mois (shared-cpu-1x, 256 Mo) ; volume à 0,15 $/Go/mois |
| [Azure Container Apps](https://learn.microsoft.com/azure/container-apps/billing) | Par mois et par abonnement : 180 000 vCPU-secondes, 360 000 Gio-secondes, 2 millions de requêtes ; peut descendre à zéro instance | À l'usage au-delà |
| [Azure App Service F1](https://learn.microsoft.com/azure/app-service/web-sites-monitor) | Quota de CPU quotidien (60 min selon des sources secondaires) ; l'app est arrêtée et répond 403 quand il est atteint | Paliers payants |
| [Neon](https://neon.com/pricing) | 0,5 Go par projet, 100 h de calcul par mois ; mise en veille après 5 min | À l'usage (0,106 $ par heure de calcul, 0,35 $/Go/mois) |
| [PowerSync](https://powersync.com/pricing) | 2 Go synchronisés et 500 Mo hébergés par mois, 50 clients simultanés ; **désactivé après une semaine d'inactivité** ; édition auto-hébergée gratuite | Pro dès 49 $/mois |
| [Turso](https://turso.tech/pricing) | 100 bases, 5 Go, 3 Go synchronisés par mois | Developer à 5,99 $/mois |
| Tunnel Cloudflare ([guide](https://flaviocopes.com/cloudflare-tunnel/)) | Gratuit ; une adresse stable demande un domaine géré chez Cloudflare (sans domaine, l'adresse est aléatoire et change à chaque lancement) | Le domaine |
| [EAS](https://expo.dev/pricing) (builds Expo) | 15 builds Android, file d'attente basse priorité | Paliers payants |
| [Sauvegarde Android](https://developer.android.com/identity/data/autobackup) | 25 Mo par app sur le Drive de l'utilisateur, hors de son quota | Sans objet |
| Google Play | Sans objet | 25 $ une fois, pour le compte développeur |

**Avec B1, Jardo coûte 0 €/mois.** Les seules dépenses sont le compte Play et, peut-être, un nom
de domaine pour la politique de confidentialité. Une page statique gratuite fait aussi l'affaire
(Google Sites, GitHub Pages depuis un dépôt public).

À 0 €, A reste possible, mais avec une minute de réveil chez Render (la base expire au bout de
30 jours) ou un démarrage à froid d'Azure plus Neon. Supabase est l'exception : il ne se met en
pause qu'après une semaine sans aucune requête, donc rarement pour une app utilisée chaque jour,
mais il ne sauvegarde rien. Et dans tous les cas, l'app ne marche pas sans réseau.

## Recommandation : B1, local d'abord

**Pourquoi B1.**

1. C'est la seule option qui respecte les quatre arbitrages à la fois : hors connexion complet,
   0 € sans offre qui s'endort, aucune contrainte sur le .NET, une publication pour la famille sans
   comptes.
2. Le hors-connexion fait partie de la structure, au lieu d'être une couche de cache ajoutée
   au-dessus.
3. « Aucune donnée collectée » devient un argument, comme chez Jardingue.
4. Tout un chantier disparaît : hébergement, comptes, suppression de compte, sécurité d'une API
   exposée, migrations sur un serveur, surveillance.
5. Les notifications, prochaine étape de la [feuille de route](vision-produit.md#étapes-suivantes),
   deviennent plus simples : les données et le calcul d'échéance sont sur le téléphone.
6. Le développement aussi : plus besoin de l'API sur le PC, du profil `lan` ni de règles de
   pare-feu pour l'API. Seul Metro reste nécessaire pour Expo Go. Un APK installé chez un proche
   marche sans rien d'autre.
7. Le modèle s'y prête : rien de dérivé n'est stocké, donc une synchronisation reste possible
   plus tard.

**Ce que ça coûte.**

- **Porter environ 2 000 lignes et 148 tests.** C'est le gros de l'effort, fait une fois, en
  quatre PR qui ne touchent aucun écran.
- **Le .NET quitte le projet**, ce que Maxime accepte.
- **Pas de foyer partagé avant la synchronisation.** La vision le place de toute façon à l'étape 7.
- **La perte de données est plus probable qu'avec un serveur sauvegardé.** Elle est atténuée par
  la sauvegarde Android et l'export.
- **Chaque mise à jour de l'app migre la base des téléphones.** Fini « recréer la base de dev » :
  les migrations deviennent du code de production, testé.

**Pourquoi pas les autres.**

- **B2 maintenant** : il faut des comptes et une base serveur, et payer ou subir des offres
  gratuites qui se désactivent. Le moteur impose son schéma, pour un foyer qui n'arrive qu'à
  l'étape 7. On s'y prépare sans le construire.
- **C** cumule les inconvénients : le serveur et ses comptes, plus une file d'écritures que le
  serveur peut refuser après coup. Pour un hors-connexion utile (un « Fait » qui remet la tâche à
  jour), la logique métier devrait exister deux fois.
- **A et D** : pas de hors-connexion, un coût récurrent ou des réveils lents, des comptes.

**Ce que deviennent l'API .NET et ses tests.**

- **Les tests deviennent la spécification.** Chaque cas C# devient un cas Jest de même scénario et
  de même intitulé. La relecture du portage se fait cas par cas.
- **L'API reste en état de marche sur `main` jusqu'à la bascule (étape 5)**, puis elle est
  retirée (étape 6). Un tag `api-dotnet` marque le dernier commit qui la contient.
- **Aucune duplication** : après la bascule, le TypeScript est la seule implémentation.
- **Le .NET peut revenir comme serveur de synchronisation** (voir [plus loin](#plus-tard--la-synchronisation)).

**Quand.** Après l'étape en cours de la carte, et avant les notifications. Chaque nouvelle
fonctionnalité de l'API, d'ici là, s'ajoute à ce qu'il faudra porter. Les étapes 1 à 4 créent de
nouveaux dossiers sans toucher aux écrans : elles peuvent avancer en même temps que le travail
sur la carte. La bascule (étape 5) touche tous les écrans : elle se fait quand aucune autre PR du
front n'est en cours.

## La cible technique

| Besoin | Choix | Pourquoi |
|---|---|---|
| Base | [`expo-sqlite`](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/), un fichier `jardo.db` | Inclus dans Expo Go ; transactions, copie de base (`backupDatabaseAsync`), sessions et changesets utiles à une future synchronisation |
| Accès aux données | **SQL écrit à la main**, derrière une petite interface `Db` (exécuter, lire des lignes, lire une ligne, transaction) | Une dizaine de tables et des requêtes simples ; un développeur .NET connaît le SQL ; aucune dépendance ; la même interface tourne sous Jest |
| Migrations | Une liste ordonnée de scripts SQL, numérotée par `PRAGMA user_version`, appliquée au démarrage dans `onInit` de `SQLiteProvider` (le motif de la doc Expo) | Pas d'outil en plus ; chaque migration testée sur une base de la version précédente |
| Identifiants | UUID en texte (`randomUUID()` d'`expo-crypto`, UUID v4, confirmé à l'étape 2 dans la doc du SDK 57 : Android, iOS, web, inclus dans Expo Go) | Créer hors connexion sans collision, prêt pour la synchronisation. Changer de clés plus tard, avec de vraies données, obligerait à reconstruire chaque table : SQLite ne modifie pas une clé étrangère en place |
| Dates | `TEXT` : `YYYY-MM-DD` pour les jours du jardin, ISO 8601 UTC pour les instants | La convention actuelle du front ; l'ordre alphabétique est l'ordre chronologique |
| Domaine | `src/domain/` : calculs et règles purs, sans SQLite ; la date du jour en paramètre | L'équivalent des calculateurs purs et de `TimeProvider` : testable sans base ni horloge |
| Services | `src/data/` : un module par ressource (jardin, carte, espaces, zones, plantes, tas de bois, journal, tâches), écritures en transaction, réponses de la même forme que les DTO actuels | Les écrans changent à peine |
| Erreurs | Une règle refusée lève une erreur au format du ProblemDetails actuel (titre, détail, erreurs par champ) | Les formulaires affichent toujours l'erreur sous le champ |
| Cache et écrans | TanStack Query reste : les hooks appellent `src/data/` au lieu d'`api()`, avec les mêmes clés et les mêmes invalidations | États de chargement et « Fait » optimiste conservés |
| Tests | Jest. Domaine sans base ; services et écrans sur une vraie SQLite en mémoire via [`node:sqlite`](https://nodejs.org/api/sqlite.html) (« release candidate », sans option depuis Node 22.13), `better-sqlite3` en repli | Pas de fausse base : les règles et le SQL sont testés ensemble ; les écrans n'ont plus besoin de `mockApi` |
| Jardin d'exemple | Seulement en développement ; une installation neuve démarre sur un jardin vide | Le rôle de `DbSeeder` |
| Mode web | `expo-sqlite` web est **en alpha** (fichiers wasm, en-têtes COOP/COEP pour `SharedArrayBuffer`) | Les sessions vérifient leurs écrans dans le navigateur. **Vérifié à l'étape 2 : la base s'ouvre, migre et se remplit en mode web avec Metro**, à trois conditions : `web.output` en `"single"` (le rendu statique du serveur de dev n'embarque pas le worker), l'extension `wasm` dans `metro.config.js`, et un seul onglet de l'app à la fois (l'OPFS réserve la base à un onglet). Les en-têtes COOP/COEP ne servent qu'aux API synchrones, que Jardo n'utilise pas ([détail](front-architecture.md#données-locales-srcdata)) |

**Drizzle, l'alternative écartée pour l'instant.** C'est un ORM TypeScript qui sait parler à
`expo-sqlite`. Il apporte des requêtes typées et des migrations générées, ce qui rappelle EF Core.
En contrepartie, il faut une configuration Metro pour importer les fichiers `.sql`, un traitement à
part sous Jest et un outil de plus (`drizzle-kit`). La règle « pas de dépendance sans besoin » le
laisse de côté. On y reviendra si le SQL écrit à la main devient pénible.

**Une convention change à la bascule.** « Le voyant vient du serveur » devient « le voyant vient
du domaine ». Les écrans ne recalculent toujours rien : ils affichent ce que les services
renvoient.

## Risques de sécurité et de données

### Avec B1, dès la bascule

| Risque | Traitement |
|---|---|
| Lecture des données d'un téléphone volé ou rooté | Le bac à sable Android réserve la base à l'app. Pas de chiffrement au repos au départ : un jardin n'est pas une donnée sensible, et SQLCipher ne tourne pas dans Expo Go. À revoir si des données personnelles arrivent (photos géolocalisées, membres du foyer) |
| Téléphone perdu ou changé | Sauvegarde automatique Android laissée active ([`android.allowBackup`](https://docs.expo.dev/versions/v57.0.0/config/app/), vrai par défaut) : la base part sur le Drive de l'utilisateur (25 Mo au plus, un seul instantané), restaurée à la réinstallation avec le même compte Google. Plus un export et un import manuels, livrés à l'étape 7. La restauration se vérifie pour de vrai sur l'APK de test ([procédure](#vérifier-la-sauvegarde-automatique-sur-lapk)). Dans Expo Go, la base appartient à Expo Go : la protection ne vaut que pour l'APK |
| Migration ratée après une mise à jour | Migrations en transaction, testées sur une base de la version précédente ; copie de la base avant chaque migration |
| Base qui dépasse 25 Mo | Le texte d'un jardin en est loin. Les photos, prévues plus tard, dépasseraient vite le plafond : à traiter avec elles (exclusion de la sauvegarde automatique, export à part) |
| Export partagé à n'importe qui | L'envoi est voulu par l'utilisateur, donc exempté de la déclaration de partage. Le fichier contient tout le jardin : l'écran d'export le dit |
| Import d'un fichier abîmé ou trafiqué | Vérifier la version, le schéma et les règles métier avant d'écrire ; tout dans une transaction, refus en bloc |
| Secret dans l'APK | Aucun n'est nécessaire. Toute variable `EXPO_PUBLIC_*` est lisible dans l'APK |
| Formulaire « sécurité des données » | « Aucune donnée collectée ni partagée » tant que rien ne quitte l'appareil : ni statistiques d'usage, ni rapport de plantage envoyé (Sentry ou Crashlytics changeraient la réponse). L'export est un envoi voulu par l'utilisateur, vers son propre espace : Google l'exempte explicitement. La sauvegarde automatique, l'app n'y accède pas, mais l'[aide de Google](https://support.google.com/googleplay/android-developer/answer/10787469) n'en parle pas : à confirmer en remplissant le formulaire. La politique de confidentialité reste exigée |

### Quand la synchronisation viendra

- **Authentification**, auprès d'un fournisseur ou avec ASP.NET Core Identity. Jetons rangés dans
  [`expo-secure-store`](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/), que son plugin
  exclut déjà de la sauvegarde automatique.
- **Droits par jardin.** Chaque ligne porte son jardin. Le serveur vérifie, à chaque écriture ou
  dans chaque règle de synchronisation, que l'utilisateur en est membre. Ce contrôle ne se confie
  jamais à l'app.
- **Suppression du compte dans l'app et sur une page web.** Google Play l'[exige](https://support.google.com/googleplay/android-developer/answer/13327111)
  de toute app qui crée des comptes, et le lien se déclare dans le formulaire.
- **TLS partout.** Les règles métier sont revérifiées par le serveur, ou leur écart est assumé
  (un stock sous zéro après fusion, signalé à l'utilisateur).
- **Formulaire « sécurité des données » à refaire** : contenu du jardin et identifiants collectés.

## Plan de migration

Une PR par étape, qui passe les vérifications de [`CLAUDE.md`](../CLAUDE.md#workflow). L'app reste
utilisable à chaque étape.

1. **Domaine pur en TypeScript.** `src/domain/` : échéances (`DueDateCalculator`), stock et
   séchage (`WoodPileCalculator`), dernière intervention qui vaut pour une cible
   (`LatestInterventions`, à partir de lignes déjà lues), vocabulaire des types et de ce que chaque
   type d'espace accepte. Les cas de `DueDateCalculatorTests` et `WoodPileCalculatorTests` sont
   portés.
   *À la fin :* l'app tourne toujours sur l'API, rien ne change à l'écran.
2. **Socle SQLite.** `expo-sqlite` et l'interface `Db` ; le schéma complet en UUID, repris de
   `GardenDbContext`, contraintes comprises (noms uniques, clés étrangères, table unique des
   éléments) ; migrations par `user_version` ; jardin d'exemple en développement ; harnais Jest sur
   `node:sqlite`. Le `SQLiteProvider` est monté à la racine : l'app ouvre et migre la base au
   démarrage, sans encore la lire.
   *À la fin :* rien ne change à l'écran. On a la preuve que la base s'ouvre dans Expo Go sur
   Android et en mode web, ou bien on a décidé comment vérifier sans le web.
3. **Services locaux, partie 1 : jardin, carte, espaces, zones, plantes.** Mêmes règles que
   `GardenService`, `GardenMapService`, `SpaceService`, `ZoneService`, `PlantService` et
   `ItemPlacement`. Le catalogue `GardenLayouts` devient une constante. Les cas des tests
   correspondants sont portés.
   *À la fin :* app inchangée.
4. **Services locaux, partie 2 : journal, tâches, tas de bois.** `JournalService` (règle
   d'application, cohérence des cibles), `TaskService` et `TaskQueries` (échéances, tâches dues,
   « Fait »), `WoodPileService` (stock jamais négatif). Les cas restants sont portés.
   *À la fin :* app inchangée, et les 148 cas ont leur équivalent.
5. **Bascule.** `queries.ts` appelle `src/data/`. `types.ts` devient la référence, écrite à la main
   à partir des types générés. Les identifiants passent en chaînes dans les routes et les
   formulaires. Les tests d'écran tournent sur la couche locale au lieu de `mockApi`. La convention
   « le voyant vient du domaine » entre dans `front-architecture.md`. C'est la plus grosse PR, mais
   surtout mécanique.
   *À la fin :* l'app marche sans API ni réseau, en web et dans Expo Go. Vérifié par un parcours
   complet, en mode avion sur le téléphone. L'API est encore dans le dépôt, mais plus appelée.
6. **Retrait de l'API .NET.** Le tag `api-dotnet` d'abord. Puis la suppression de `Jardo.Api`,
   `Jardo.Api.Tests`, `Jardo.slnx`, du job API de la CI, de `client.ts`, de `src/api/generated/`,
   du script `api:types` et du profil `lan`. Les docs suivent : `CLAUDE.md`, README,
   `front-architecture.md`, `front-roadmap.md` (dont l'étape « Héberger l'API en HTTPS »), et
   `modele-domaine.md`, où « l'API l'implémente » devient « l'app l'implémente ». Maxime peut retirer la règle de pare-feu « Jardo API (dev) » ; celle de Metro
   reste.
   *À la fin :* CI verte, app inchangée.
7. **Sauvegarde.** Export d'un fichier JSON versionné par le partage Android, et import qui
   remplace le jardin après confirmation, validé et en transaction. Les modules (`expo-sharing`,
   `expo-document-picker`, `expo-file-system`) se vérifient dans la doc du SDK 57. La sauvegarde
   automatique est vérifiée par une vraie restauration sur un build EAS (`adb shell bmgr`), et ses
   règles ajustées si besoin.
   *À la fin :* un test prouve qu'un export suivi d'un import redonne le même jardin, et une
   restauration réelle a été faite.
   *Fait le 26/10/2026* pour l'export et l'import ([fichier et règles](#la-sauvegarde-livrée)).
   La restauration automatique ne se vérifie que sur un build installé : elle revient à la
   session de l'APK de test ([procédure](#vérifier-la-sauvegarde-automatique-sur-lapk)).

**Ensuite, hors de cette migration :**

- les notifications locales, planifiées à chaque écriture et à chaque ouverture de l'app à partir
  des échéances calculées ;
- l'APK pour la famille, par EAS et le test interne du Play Store, qui n'impose pas le seuil de
  testeurs ;
- la politique de confidentialité ;
- plus tard, la fiche publique. Un compte développeur personnel doit d'abord mener un
  [test fermé](https://support.google.com/googleplay/android-developer/answer/14151465) avec
  12 testeurs pendant 14 jours.

## La sauvegarde livrée

**Le fichier.** Réglages → « Exporter mon jardin » écrit `jardo-AAAA-MM-JJ.json` et l'ouvre dans
la feuille de partage du téléphone ([`expo-sharing`](https://docs.expo.dev/versions/v57.0.0/sdk/sharing/),
fichier écrit par [`expo-file-system`](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/) dans
le cache de l'app). L'écran dit que le fichier contient tout le jardin. Le JSON porte une
enveloppe et les lignes de chaque table, telles qu'en base et dans l'ordre d'insertion :

```json
{ "format": "jardo", "formatVersion": 1, "schemaVersion": 1, "exportedAt": "2026-10-26T17:56:45.900Z",
  "tables": { "gardens": […], "spaces": […], "zones": […], "garden_items": […],
              "journal_entries": […], "garden_tasks": […], "garden_map_slots": […] } }
```

`formatVersion` change si l'enveloppe change ; `schemaVersion` est la version de la base
(`PRAGMA user_version`) dont viennent les lignes. Le jardin garde son identifiant : restaurer sur
un nouveau téléphone redonne le même jardin, ce qu'une future synchronisation demandera.

**L'import.** « Importer un jardin » choisit un fichier
([`expo-document-picker`](https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/)) et le
vérifie en entier avant d'écrire quoi que ce soit (`readBackup`, `src/data/backup.ts`) :

1. du JSON, au format `jardo`, d'une version connue. Un fichier d'une version plus récente de
   l'app est refusé (« mettez l'app à jour ») ;
2. chaque table et chaque colonne du schéma, rien de plus, et des valeurs du bon type ;
3. les règles des services, rejouées sur le contenu (`src/data/backup-rules.ts`) : un seul jardin,
   identifiants uniques, noms d'espaces et de zones uniques, champs validés comme dans les
   formulaires, types acceptés par chaque espace, cohérence des cibles (la zone dans l'espace,
   l'élément dans sa zone), champs selon le type d'intervention, rythme des tâches, stock de bois
   jamais négatif, emplacements de la carte. Ce que la base contient déjà reste accepté : un espace
   archivé garde ses éléments et son historique. La date future du journal n'est pas revérifiée,
   elle dépend du jour de l'import.

Le premier écart refuse tout le fichier, avec la ligne en cause et la règle. Sinon, une
confirmation dit ce que contient le fichier et qu'il remplace le jardin actuel ; le remplacement
se fait en une transaction, où les contraintes du schéma revérifient chaque ligne. Au moindre
refus, rien n'a changé. Tous les écrans relisent ensuite.

**Les migrations futures.** `backupUpgrades` tient une mise à niveau par migration : elle
transforme les tables d'un export de la version précédente comme la migration a transformé la
base. Un export ancien s'importe donc migré à la volée ; une migration qui ne peut pas se rejouer
sur un fichier y lève un refus clair. Un test exige une entrée par migration, et un autre confronte
les colonnes déclarées au schéma réel : ajouter une migration sans mettre la sauvegarde à jour
fait échouer les tests.

**Le mode web.** La feuille de partage du web ne partage pas un fichier local : l'export y est
téléchargé, l'import lit le fichier choisi dans le navigateur (`src/lib/backup-file.web.ts`).
Vérifié le 26/10/2026 dans le navigateur : export, refus d'un fichier trafiqué, import qui
redonne le même jardin.

### Vérifier la sauvegarde automatique sur l'APK

La sauvegarde automatique d'Android (`android.allowBackup`, vrai par défaut, laissé tel quel)
copie les fichiers de l'app, la base comprise, sur le Drive du compte Google. Elle ne se vérifie
que sur un build installé : dans Expo Go, la base appartient à Expo Go. À faire lors de la session
qui produira l'APK de test, d'après la [procédure d'Android](https://developer.android.com/identity/data/testingbackup) :

1. Un téléphone Android 6 ou plus, connecté à Internet, avec un compte Google choisi comme compte
   de sauvegarde (Paramètres → Google → Sauvegarde). Débogage USB activé, `adb devices` le voit.
2. Installer l'APK, créer un petit jardin (un espace, une plante, une intervention, une tâche), puis
   fermer l'app.
3. Forcer une sauvegarde, `<package>` étant l'`android.package` d'`app.json` :

   ```bash
   adb shell bmgr enabled
   adb shell bmgr list transports
   adb shell bmgr backupnow <package>
   ```

   La dernière commande doit répondre `Package <package> with result: Success`. Sinon, lire
   `adb logcat` (messages de `BackupManagerService`).
4. Désinstaller puis réinstaller le même APK : la restauration a lieu à l'installation.

   ```bash
   adb uninstall <package>
   adb install jardo.apk
   ```

5. Ouvrir l'app : le jardin doit être là, saisies les plus récentes comprises. La base est en mode
   WAL : si les dernières saisies manquent, vérifier que le fichier `-wal` est bien sauvegardé
   avant de toucher aux règles de sauvegarde.

Le résultat se note ici et dans `suivi-progression.md`. Un réglage à ajuster (exclure un fichier,
ou les photos plus tard) passe par la configuration Expo, jamais par le dossier `android/`.

## Plus tard : la synchronisation

Elle viendra avec le foyer ([étape 7 de la vision](vision-produit.md#étapes-suivantes)) ou avec
un deuxième appareil. Le budget de 0 € oriente vers les offres gratuites sans mise en pause, ou
vers l'auto-hébergement. Pistes à comparer le moment venu :

| Piste | Principe | Pour | Contre |
|---|---|---|---|
| Notre API .NET en serveur de synchronisation | L'app envoie ses changements (changesets de session SQLite ou journal des écritures), le serveur les applique avec les règles métier et renvoie ceux des autres | Tout est maîtrisé, le .NET revient, les règles sont revérifiées par le serveur | Protocole, conflits et comptes à écrire ; hébergement gratuit qui s'endort |
| [PowerSync](https://powersync.com/pricing) | Base Postgres sur le serveur, SQLite sur le téléphone ; les écritures passent par notre propre backend | Éprouvé, SDK React Native, édition auto-hébergeable gratuite | Offre cloud gratuite désactivée après une semaine d'inactivité, Pro à 49 $ ; schéma et backend imposés |
| libSQL et [Turso](https://turso.tech/pricing) via `expo-sqlite` | `syncLibSQL()` réplique la base locale vers une base Turso | Intégré à `expo-sqlite`, offre gratuite large | Une base par foyer, écriture hors connexion à vérifier, droits par utilisateur à construire |
| Fichier sur le Drive | Export et import automatisés vers le Drive de l'utilisateur | Gratuit, sans serveur | Connexion Google, fusion à écrire, pas de temps réel ; plutôt pour plusieurs appareils d'une même personne que pour un foyer |
| ElectricSQL | Synchronisation depuis Postgres | Sans objet | Sa base locale (PGlite) [ne tourne pas sous React Native](https://electric-sql.com/docs/integrations/expo) : écarté pour l'instant |

- **Ce que le schéma prépare dès maintenant** : les UUID.
- **Ce qu'il ne prépare pas exprès** : horodatage de modification, suppressions logiques. Le moteur
  choisi dira ce qu'il lui faut.
- **Conflits à prévoir** : deux consommations de bois notées hors connexion, qui passent le stock
  sous zéro une fois fusionnées ; deux renommages du même espace. Les échéances, calculées à la
  lecture, n'en posent pas.

## Sources

Consultées le 21/10/2026. Les prix changent : à revérifier avant toute dépense.

- Hébergement : [Supabase](https://supabase.com/pricing), [Render](https://render.com/docs/free)
  (et [Starter, source secondaire](https://temps.sh/blog/render-pricing-2026)),
  [Fly.io](https://docs.fly.io/about/pricing),
  [Azure Container Apps](https://learn.microsoft.com/azure/container-apps/billing),
  [Azure App Service, quotas](https://learn.microsoft.com/azure/app-service/web-sites-monitor),
  [Neon](https://neon.com/pricing), [tunnel Cloudflare](https://flaviocopes.com/cloudflare-tunnel/).
- Synchronisation : [PowerSync](https://powersync.com/pricing), [Turso](https://turso.tech/pricing),
  [ElectricSQL et Expo](https://electric-sql.com/docs/integrations/expo).
- Expo, SDK 57 : [`expo-sqlite`](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/),
  [`expo-notifications`](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/) (notifications
  locales dans Expo Go, push seulement dans un build de développement),
  [`expo-secure-store`](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/),
  [configuration de l'app](https://docs.expo.dev/versions/v57.0.0/config/app/),
  [offre EAS](https://expo.dev/pricing), [Drizzle avec Expo](https://orm.drizzle.team/docs/get-started/expo-new).
- Android et Play : [sauvegarde automatique](https://developer.android.com/identity/data/autobackup),
  [sécurité des données](https://support.google.com/googleplay/android-developer/answer/10787469),
  [suppression de compte](https://support.google.com/googleplay/android-developer/answer/13327111),
  [test fermé des nouveaux comptes personnels](https://support.google.com/googleplay/android-developer/answer/14151465).
- Node : [`node:sqlite`](https://nodejs.org/api/sqlite.html).
