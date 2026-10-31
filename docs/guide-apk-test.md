# Guide : un APK de test pour les proches

Pas à pas pour produire un APK de Jardo, l'installer sur le téléphone de quelques proches, le
mettre à jour, puis passer plus tard aux tests internes du Play Store. Le dépôt est déjà prêt
(`jardo-app/eas.json`, identifiant de l'app dans `jardo-app/app.json`) : il ne reste que ton compte
Expo et la commande de build.

**Le vocabulaire en deux lignes pour un développeur .NET.** EAS (Expo Application Services) est le
service d'Expo qui compile l'app dans le cloud : pas besoin d'Android Studio ni du SDK Android sur
ton PC. `eas.json` joue le rôle des profils de publication : chaque profil (`development`,
`preview`, `production`) est une manière de compiler.

## Les trois profils de `eas.json`

| Profil | Produit | Pour quoi faire |
|---|---|---|
| `development` | Client de développement, distribution interne | Développer sur un téléphone avec du code natif que Expo Go n'inclut pas. Pas utile pour les proches. Il demande `npx expo install expo-dev-client` avant le premier build, que le dépôt n'a pas encore |
| `preview` | **APK**, distribution interne, numéro de build incrémenté | **Les proches** : un fichier `.apk` installable à la main |
| `production` | **AAB** (app bundle), numéro de build géré par EAS | Le Play Store, qui n'accepte plus les APK pour publier |

`"appVersionSource": "remote"` : EAS garde de son côté le numéro de build Android (`versionCode`) et
l'incrémente à chaque build `production` (`"autoIncrement": true`). La [doc d'Expo](https://docs.expo.dev/build-reference/app-versions/)
recommande `remote` depuis EAS CLI 12 : rien à modifier ni à commiter à chaque build, donc pas de
conflit entre branches, et le `versionCode` ne risque pas d'être oublié (le Play Store refuse un
numéro déjà utilisé). Le numéro **visible** (`version` dans `app.json`, aujourd'hui `1.0.0`) reste à
changer à la main avant une version que tu veux nommer.

## 1. Créer le compte Expo

1. Va sur <https://expo.dev/signup> et crée un compte (e-mail et mot de passe). Il est gratuit.
2. Retiens le **nom d'utilisateur** : c'est le propriétaire du projet EAS.

## 2. Te connecter depuis le PC

Dans `jardo-app/` :

```bash
npx eas-cli@latest login
```

`npx eas-cli@latest` lance la dernière version de l'outil sans l'installer (comme `dotnet tool run`).
Vérifier que la connexion a marché :

```bash
npx eas-cli@latest whoami
```

## 3. Lier le dépôt à un projet EAS

Une seule fois :

```bash
npx eas-cli@latest init
```

La commande crée un projet sur ton compte (ou en lie un existant) et note son identifiant, le
`projectId`, dans la configuration. Regarde ensuite `git diff jardo-app/app.json` : le `projectId`
doit y apparaître. **Commite cette modification** (par une PR comme le reste) : sans lui, un autre
PC ou la CI ne retrouveront pas le projet.

## 4. Lancer le build `preview`

```bash
npx eas-cli@latest build --platform android --profile preview
```

- À la **première** build Android, EAS propose de **générer une clé de signature** (keystore) :
  accepte. Elle est gardée sur les serveurs d'Expo. **C'est elle qui identifie ton app** : un APK
  signé avec une autre clé ne peut pas mettre à jour un APK déjà installé. Pour la télécharger en
  sauvegarde : `npx eas-cli@latest credentials`. Ne la commite jamais dans le dépôt.
- Le build se déroule dans le cloud ; la commande attend la fin (tu peux l'interrompre, il continue :
  `npx eas-cli@latest build:list` ou le tableau de bord sur <https://expo.dev>).
- À la fin, EAS affiche l'adresse de la page du build, avec le lien de téléchargement de l'APK.

## 5. L'installer chez les proches

1. Envoie-leur le **lien de la page du build** (message, e-mail). Par défaut, [toute personne qui a
   l'adresse peut y accéder](https://docs.expo.dev/build/internal-distribution/) ; pour exiger un
   compte Expo, il y a l'option « Unauthenticated access to internal builds » dans les réglages du
   projet sur expo.dev. Ne poste pas le lien en public.
2. Sur le téléphone Android, ouvrir le lien et télécharger l'APK.
3. Ouvrir le fichier téléchargé. Android avertit que l'app ne vient pas du Play Store et demande
   d'autoriser l'installation depuis cette source (le navigateur ou l'appli de messagerie qui a
   ouvert le fichier) : **Paramètres** de la fenêtre qui s'affiche, activer l'autorisation, revenir
   en arrière, puis **Installer**. Les libellés varient selon la marque du téléphone. Play Protect
   peut demander une analyse : « Installer quand même » est normal pour une app de test.
4. Une fois installée, on peut retirer l'autorisation de la source.

L'APK peut aussi se copier par câble USB ou se transférer par une appli de messagerie.

## 6. Mettre l'app à jour

À chaque nouvelle version, on relance le même build ; le proche installe le nouvel APK **par-dessus**
l'ancien (même lien de page, ou le nouveau). L'installation conserve les données **si** :

- le `package` est le même (`com.pnjmax.jardo`) ;
- l'APK est signé avec la **même clé** (donc ne pas changer de compte Expo ni de projet EAS en route) ;
- le numéro de build n'est pas plus bas que celui de l'app installée : Android refuse de
  rétrograder. Le profil `preview` a donc `autoIncrement`, comme `production`, et EAS compte un
  seul numéro pour les deux.

## 7. Ce qu'il advient de leurs données

Les données vivent dans une base SQLite **sur le téléphone** (aucun serveur).

- **Mise à jour par-dessus :** la base reste. Au démarrage, l'app applique ses migrations
  (`src/data/migrations.ts`, une transaction par migration) sur la base existante : une migration
  qui échoue ne laisse rien à moitié fait. L'app ne copie pas la base avant de migrer (c'est prévu
  dans l'[étude d'architecture](etude-architecture-donnees.md), pas encore fait), d'où l'export de
  précaution ci-dessous quand une version change le schéma.
- **Désinstallation :** le jardin disparaît avec l'app, sauf restauration automatique d'Android (ci-dessous).
- **Un export de précaution avant toute mise à jour :** Réglages → Sauvegarde → « Exporter mon jardin »
  produit `jardo-AAAA-MM-JJ.json`, à partager vers une messagerie ou le Drive. « Importer un jardin »
  le relit et remplace le jardin actuel. Demande aux proches de le faire avant de désinstaller ou
  de changer de téléphone.

### La sauvegarde automatique d'Android

Vérifié dans la documentation : `android.allowBackup` vaut **vrai par défaut** dans Expo
([doc](https://docs.expo.dev/versions/v57.0.0/config/app/)), et `app.json` ne le modifie pas. La
sauvegarde automatique d'Android copie les fichiers internes de l'app, bases SQLite comprises, sur le
Drive du compte Google du téléphone, dans la limite de **25 Mo par app**
([doc Android](https://developer.android.com/identity/data/autobackup)). `expo-sqlite` range la base
dans `<dossier interne>/files/SQLite` (c'est la valeur de `defaultDatabaseDirectory` dans le module
Android), donc dans les fichiers sauvegardés. Aucune configuration supplémentaire n'est nécessaire.

Limites à connaître :

- l'utilisateur doit avoir la sauvegarde Google activée (Paramètres → Google → Sauvegarde) ;
- un seul instantané, restauré à la réinstallation avec le même compte Google ;
- dépasser 25 Mo coupe la sauvegarde : sans objet pour du texte, mais les photos prévues plus tard
  demanderont de les exclure ;
- **à confirmer sur un vrai téléphone** : la restauration pour un APK installé à la main (hors Play
  Store) n'est pas documentée et peut se comporter autrement. L'export de fichier reste la sauvegarde
  sûre.

**Vérifier toi-même** (téléphone en débogage USB, `adb devices` le voit). Procédure complète dans
[`etude-architecture-donnees.md`](etude-architecture-donnees.md#vérifier-la-sauvegarde-automatique-sur-lapk) :

```bash
adb shell bmgr enabled
```

```bash
adb shell bmgr list transports
```

```bash
adb shell bmgr backupnow com.pnjmax.jardo
```

La dernière commande doit répondre `Package com.pnjmax.jardo with result: Success`. Ensuite,
`adb uninstall com.pnjmax.jardo`, réinstalle l'APK et regarde si le jardin est revenu (ce test
reste à faire et à noter dans `suivi-progression.md`).

## 8. Ce que coûte l'offre gratuite d'EAS

D'après la [page des tarifs d'Expo](https://expo.dev/pricing) et la [doc de facturation](https://docs.expo.dev/billing/plans/)
(consultées le 30/10/2026, à revérifier : les offres changent) :

- **0 $ par mois**, sans dépassement facturable : à la limite, les builds s'arrêtent, rien n'est débité.
- **EAS Build** : jusqu'à **15 builds Android et 15 builds iOS** ; les quotas se renouvellent chaque mois.
- File d'attente **à basse priorité** : en heure de pointe, l'attente peut dépasser 90 minutes.
- Durée maximale d'un build : 45 minutes ; pas de machines « large ».
- EAS Update (mises à jour sans APK) : 1 000 utilisateurs actifs par mois. Jardo ne s'en sert pas encore.

Pour quelques proches, quinze builds par mois suffisent largement. Préférer un build `preview` par
version utile plutôt qu'un par petite correction.

## 9. Plus tard : les tests internes du Play Store

Le Play Store n'installe que des **AAB**, jamais un APK. Étapes à venir :

1. **Compte développeur Google Play** : <https://play.google.com/console>, **25 $ de frais uniques**
   ([aide Google](https://support.google.com/googleplay/android-developer/answer/6112435)).
   Vérification d'identité demandée.
2. **Créer l'app** dans la console avec le même identifiant `com.pnjmax.jardo`.
3. **Produire l'AAB** : `npx eas-cli@latest build --platform android --profile production`
   (le numéro de build s'incrémente tout seul grâce à `autoIncrement`).
4. **Déposer l'AAB** dans la piste « Test interne », soit à la main dans la console, soit avec
   `npx eas-cli@latest submit --platform android` (il demande une clé de compte de service Google
   créée dans la console : voir la doc d'EAS Submit au moment de le faire).
5. **Ajouter les testeurs** par adresse Gmail ; ils installent depuis un lien du Play Store, sans
   « sources inconnues », et l'app se met à jour toute seule.

Le [test interne n'impose aucun seuil de testeurs](https://support.google.com/googleplay/android-developer/answer/14151465).
Pour la **fiche publique**, un compte personnel créé après le 13/11/2023 doit d'abord mener un
**test fermé avec au moins 12 testeurs pendant 14 jours consécutifs**. Google Play App Signing
prend alors en charge la clé de signature définitive.

**Rappel important : l'identifiant `com.pnjmax.jardo` devient définitif à la première publication
sur le Play Store.** D'ici là, il peut encore changer dans `app.json` (`android.package` et
`ios.bundleIdentifier`) ; mais un APK installé avec un autre identifiant est une autre app pour
Android : les proches devraient la réinstaller et réimporter leur export.
