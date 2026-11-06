# Audit de sécurité de Jardo

Audit des 05 et 06/11/2026, mené par Claude à la demande de Maxime, avant d'envoyer l'app à des
proches. Code audité : `main` à `56f08a5`. Les fichiers et lignes cités s'y rapportent. Grille de
référence : [OWASP MASVS 2.1](https://mas.owasp.org/MASVS/).

Ce rapport vit dans un dépôt public. Il ne contient aucun secret : aucun n'a été trouvé. Les adresses
e-mail y sont volontairement masquées. Les correctifs cités sont dans des PR ouvertes, que Maxime reste libre de
fusionner : rien n'a été fusionné.

## Résumé en dix lignes

1. **Rien de grave, et rien qui empêche d'envoyer l'APK à des proches.** Reste à passer la liste de
   contrôle du premier APK, car aucun APK n'existe encore.
2. Aucun secret dans le dépôt, sur toutes les branches, le tag, les `refs/pull/*` et trois commits orphelins.
3. Aucune injection SQL, aucun script injecté sur le web, aucune écriture sans geste de l'utilisateur.
4. L'app n'a que trois entrées extérieures : un fichier importé, un lien ou un intent, une réponse d'Open-Meteo.
5. Le risque le plus sérieux est hors de l'app : `main` n'est pas protégée, et GitHub et Expo sont le seul
   chemin par lequel une version piégée atteindrait les proches ([C1](#c1)).
6. Le dépôt public relie une identité à une adresse professionnelle, et un force-push ne l'efface pas ([C2](#c2)).
7. Un fichier piégé pouvait laisser des écrans en erreur jusqu'au prochain import : corrigé par #69 et #70.
8. Une autre app pouvait ouvrir une adresse externe via l'app ou faire effacer le placement de la carte en
   un toucher : corrigé par #72.
9. Une réponse hostile d'Open-Meteo pouvait faire tomber Aujourd'hui : corrigé par #71. `.gitignore`
   laissait passer des fichiers de signature : corrigé par #73.
10. Sur les 28 alertes de `npm audit`, aucune n'est atteignable depuis l'app sur le téléphone. Ne pas lancer
    `npm audit fix --force`.

## Les constats

**Gravité** évaluée pour une app locale, sans compte, confiée à des proches. **Confirmé** : reproduit par un
test ou une commande. **Théorique** : déduit du code, et ce qui manque est dit.

| # | Gravité | État | Où | Comment reproduire | Correctif |
|---|---|---|---|---|---|
| <a id="c1"></a>C1 | **Moyenne** | Confirmé | Réglages GitHub de `main` | `gh api repos/PNJ-Max/Jardo/branches/main/protection` répond 404. `gh api "repos/PNJ-Max/Jardo/activity?activity_type=force_push"` montre un force-push sur `main` le 17/10/2026 | À décider : voir [ci-dessous](#ce-que-maxime-doit-décider) |
| <a id="c2"></a>C2 | **Moyenne** | Confirmé | Métadonnées Git : `8e073fb`, `fc7c1dc`, `d76cc7a`, `7b82edb`, et les orphelins `527c9c3`, `8bddc01` | `git log --all --format='%an %ae' \| sort -u`. Les orphelins restent lisibles : `git fetch origin 8bddc011cba47960dccdfb29543010c37fb01e67` | À décider : voir [ci-dessous](#ce-que-maxime-doit-décider) |
| C3 | Faible aujourd'hui, élevée le jour où ça arrive | Confirmé | `jardo-app/.gitignore` | `git check-ignore jardo-app/credentials.json` ne répond rien : le fichier serait commité | [#73](https://github.com/PNJ-Max/Jardo/pull/73) |
| C4 | Faible | Confirmé | `src/data/validation.ts:14`, `src/domain/due-date.ts:99` | Importer un fichier où toutes les entrées datent de `9999-12-31` et les tâches partent de `0001-01-01` : Aujourd'hui et les fiches d'espace affichent `« 10000-01-02 » n'est pas un jour` | [#69](https://github.com/PNJ-Max/Jardo/pull/69) |
| C5 | Faible | Confirmé | `src/data/task-queries.ts:107`, `src/data/wood-movements.ts:23` | Importer 33 000 espaces, soit 8,5 Mo : `spaces.getAll` lève `too many SQL variables`, que l'accueil sans carte et Réglages affichent. `woodPiles.getAll` échoue de même avec 33 000 tas | [#70](https://github.com/PNJ-Max/Jardo/pull/70) |
| C6 | Faible | Confirmé pour l'absence de limite et le temps de calcul. Théorique pour le plantage : il manque un téléphone | `src/lib/backup-file.ts:20`, `src/lib/backup-file.web.ts:20`, `src/data/backup-rules.ts:199` | Mesuré sous Jest : 32 000 tas et autant d'entrées, soit 23 Mo, prennent 23,4 s à vérifier | [#70](https://github.com/PNJ-Max/Jardo/pull/70) |
| C7 | Faible | Confirmé, avec des réponses simulées | `src/lib/forecast.ts:61`, `:83`, `:93`, `src/lib/weather.ts:55` | `weather_code` à `"__proto__"` : `todayWeather` lève une `TypeError` pendant le rendu d'Aujourd'hui. Un `name` objet fait tomber Réglages. Une `latitude` en texte s'ajoute à l'URL suivante | [#71](https://github.com/PNJ-Max/Jardo/pull/71) |
| C8 | Faible | Confirmé pour le JavaScript. Théorique pour le natif : lu dans le code, à constater sur l'APK | `src/lib/notifications.ts:74`, `src/components/reminders.tsx:27` | Sous Jest : une réponse de notification dont `data.href` vaut `https://…` fait appeler `router.navigate` avec cette adresse | [#72](https://github.com/PNJ-Max/Jardo/pull/72) |
| C9 | Faible | Confirmé | `src/data/garden-map.ts:195`, `src/app/setup/spaces.tsx:45` | Sur un jardin avec carte, ouvrir `/setup/spaces?layout=terraced-long` et toucher « Afficher la carte » : le modèle change, et les 9 emplacements sont effacés | [#72](https://github.com/PNJ-Max/Jardo/pull/72) |
| C10 | Faible | Confirmé sous Jest avec le vrai routeur. À constater sur l'APK | `jardo-app/app.json:33` | `renderRouter` sur `/_sitemap` : `TypeError` sur `window.location.origin` (`expo-router/build/views/Sitemap.js:120`) | [#72](https://github.com/PNJ-Max/Jardo/pull/72) |
| C11 | Information | Confirmé | `src/data/backup-rules.ts:41`, `src/data/backup.ts:163`, `:173` | Un identifiant `../settings` est accepté, et le vrai routeur ouvre alors Réglages au toucher de l'espace. Une table `__proto__` est acceptée, sans aucun effet | [#69](https://github.com/PNJ-Max/Jardo/pull/69) |
| C12 | Information | Théorique : embarqué, jamais appelé | `decode-uri-component` 0.2.2, via `query-string` et `expo-router` | `npm audit` le classe haut. Sur le chemin d'un lien, un test avec un espion compte 0 appel : seul `react-navigation/core/getStateFromPath.js` appelle `queryString.parse`, et Expo Router passe par son propre `fork/getStateFromPath.js` | Passer au SDK 58 le moment venu. Ne pas forcer |

Chaque PR contient ses tests, qui échouent sans le correctif. Elles sont indépendantes : les fusionner toutes
sur une branche locale ne crée aucun conflit, et tous les tests y passent.

### Pour comprendre les constats

Quelques équivalences pour un développeur .NET :

| React Native et Android | Équivalent |
|---|---|
| Activité exportée (`MainActivity`, `exported="true"`) | Un endpoint public, sans authentification : toute app du téléphone peut l'appeler |
| Lien profond (`jardo:///task/done?id=…`) | Une route GET de ce même endpoint |
| Extras d'un intent | Des paramètres non typés joints à l'appel, choisis par l'appelant |
| Hermes | Le moteur JavaScript du téléphone. Sans compilation à la volée, il est plus lent que V8 sur un PC |
| AsyncStorage | Un dictionnaire persistant, proche de `Preferences` en MAUI |

**C4, C5 et C6 : un fichier importé.** Le correctif ne protège pas d'un vol de données : un fichier piégé ne
peut rien faire hors de l'app. Il protège d'un jardin bloqué. L'import remplace déjà tout le jardin après
confirmation, et un fichier hostile n'a pas besoin de faille pour l'effacer. Le gain porte sur la suite :
l'app reste utilisable sans passer par une réinstallation.

Pour C4 et C5, rien ne plante : l'écran affiche un message et propose « Réessayer ». Le Journal et Réglages
restent joignables, et un nouvel import répare tout. Seul un fichier énorme (C6) pourrait faire tomber l'app, ce
qui reste à constater sur un téléphone, et le jardin n'aurait alors pas été touché.

**C8 : l'intent déguisé en notification.** Quand `MainActivity` reçoit un intent avec l'extra
`google.message_id`, `expo-notifications` le prend pour le toucher d'une notification
(`ExpoNotificationLifecycleListener.kt`), et tous ses extras en deviennent les données
(`NotificationSerializer.java:203`). Or `onReminderOpened` naviguait vers le `href` reçu. Une app installée,
ou une page web par un lien `intent://`, pouvait donc faire ouvrir n'importe quelle route ou adresse externe.
L'impact reste faible, car elle pouvait déjà ouvrir cette adresse elle-même. Mais le code supposait que
ces données venaient de nos rappels, ce qui est faux.

**C9 : l'assistant ouvert par un lien.** L'interface ne le propose qu'à un jardin vide, mais toute route
s'ouvre par un lien. Il faut encore un toucher de l'utilisateur, et seul le placement sur la carte est perdu :
ni espace, ni tâche, ni journal.

### Ce que Maxime doit décider

Aucun réglage GitHub n'a été changé et aucun historique n'a été réécrit.

**C1, la chaîne de publication.** Une app sans serveur n'a qu'un chemin sérieux d'attaque à distance : le code qui
part dans l'APK. GitHub et Expo sont donc les vrais points sensibles, et Expo garde la clé de signature.

- **Protéger `main`** : interdire le force-push et la suppression, exiger le contrôle `Front` de la CI. Cela
  compte d'autant plus que des sessions d'agents travaillent ici avec un jeton aux droits `repo` et `workflow`.
- **Double authentification sur GitHub et Expo** : je ne peux pas la vérifier d'ici. L'API répond `null` avec
  ce jeton.
- **Alertes Dependabot** : désactivées. Les activer ne change aucun code.
- **Commentaires publics** : n'importe qui peut commenter une PR de ce dépôt. Un agent qui traite les
  commentaires doit les lire comme des données, pas comme des consignes. Un seul commentaire existe à ce jour,
  de Maxime.

**C2, l'identité dans l'historique.** Six commits portent une adresse professionnelle avec le nom d'auteur, et plus
de 250 une adresse personnelle. Quatre sont sur `main`, et les deux autres sont orphelins depuis le force-push du
17/10/2026.

- **Un nouveau force-push ne suffit pas.** Ces deux orphelins le prouvent : ils se lisent encore par leur
  identifiant, que l'API d'activité publie. Les `refs/pull/*` restent aussi, et le propriétaire du dépôt ne
  peut pas les supprimer. Une vraie purge passe par le support de GitHub, avec un résultat qui n'est pas garanti.
- **Option simple** : accepter l'existant, et utiliser dès maintenant l'adresse `noreply` de GitHub pour les
  prochains commits.
- **À faire avant de fusionner #67** : relire ce que `docs/etude-legale.md` dit de la situation personnelle de
  Maxime. Le texte est déjà public sur sa branche, mais il le serait bien davantage sur `main`, et le modifier
  aujourd'hui ne coûte rien. La session d'organisation a le détail.

## Ce qui est sain

Chaque point a été vérifié, et la méthode est indiquée.

**Import d'une sauvegarde**
- **Pas de pollution de prototype** : `JSON.parse` fait de `__proto__` une clé ordinaire, et aucun code ne
  fusionne en profondeur. Vérifié sur tables, colonnes et mise à niveau d'un ancien format.
- **Types inattendus, nombres infinis (`1e999`), JSON imbriqué sur 2 millions de niveaux** : refusés sans rien
  écrire.
- **Règles** : un fuzz de 42 000 fichiers modifiés au hasard en accepte 16 700. Pas un seul n'échoue à l'écriture :
  dans ce fuzz, les règles rejouées couvrent les contraintes du schéma. Une seule cause rend un fichier illisible : C4.
- **État à moitié écrit** : un échec en cours d'écriture ne change rien (test existant). Un processus tué au milieu
  d'une transaction sur un vrai fichier en WAL laisse la base intacte (`PRAGMA integrity_check` à `ok`).

**Base SQLite**
- **Pas d'injection** : toutes les valeurs passent par des paramètres. Ce qui est concaténé ne vient que de
  constantes du code ou de listes de `?`.
- **Base plus récente** : `NewerDatabaseError`, sans toucher aux données, et un message clair à l'écran.
- **Base abîmée** : `file is not a database`, et le fichier reste intact. Aucune réinitialisation automatique
  n'efface le jardin.

**Liens profonds**
- **Aucune écriture sans geste** : les 19 écrans, ouverts avec 10 jeux de paramètres (vrais identifiants, tableaux,
  injection SQL, `__proto__`), n'écrivent rien. Le test est dans cette PR : `__tests__/screens/deep-links.test.tsx`.
  Un écran ajouté plus tard y entre tout seul, et un témoin vérifie que le test échoue si un écran écrit.
- **Suppressions** : elles passent toutes par un bouton puis une confirmation, et il faudrait connaître un UUID.
- **Paramètres hostiles** : affichés comme du texte. `isDrawn` utilise déjà `Object.hasOwn`.
- **URL mal formées** : `%`, `%E0%A4%A`, `%00`, `[` ou 400 000 caractères ne lèvent aucune exception dans le vrai routeur.
- **Intents de partage** : `expo-sharing` lit les `ACTION_SEND`, mais ne fait rien sans `share_into_scheme`, absent ici.

**Réseau**
- **Un seul appel réseau**, `src/lib/forecast.ts`, en HTTPS, et seulement si une ville est choisie.
- **Délai** : les 8 s de `getJson` couvrent aussi la lecture du corps. Vérifié dans le code d'`expo/fetch`, qui
  annule la requête native et rejette la lecture en cours.
- **Échappement** : le nom de la ville passe par `encodeURIComponent`.

**Android** (manifeste généré par `expo prebuild`, dans un dossier temporaire)
- **Une seule activité exportée**, `MainActivity`, avec le seul schéma `jardo`. Les services et récepteurs déclarés
  par `expo-notifications`, `expo-sharing` et `expo-file-system` sont `exported="false"`.
- **Texte en clair** : `usesCleartextTraffic` n'apparaît que dans les variantes de debug. Le SDK cible 36 l'interdit
  par défaut, et ne fait pas confiance aux autorités ajoutées par l'utilisateur.
- **Permissions** : `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` et `SYSTEM_ALERT_WINDOW` sont bien bloquées.
- **`allowBackup="true"`** : voulu, c'est la protection contre la perte du téléphone
  ([étude](etude-architecture-donnees.md#risques-de-sécurité-et-de-données)). Le cache n'est pas sauvegardé.

**Build**
- **Production** : `__DEV__=false`, `wantsExampleGarden` compilé en `()=>!1`, aucune variable `EXPO_PUBLIC_` de Jardo
  dans le bundle. `expo export` ne produit pas de carte de sources sans `--source-maps`.
- **Journaux** : aucun `console.*` dans `src/`.
- **`eas.json`** : aucun secret ni variable d'environnement. `expo-updates` n'est pas installé, donc pas de mise à
  jour à distance à piéger.

**Données sur le téléphone**
- **AsyncStorage** : thème, rappels, ville et dernière prévision. L'export ne contient ni la ville ni la prévision.
- **Fichier d'export** : il reste dans le cache privé de l'app après le partage, comme la copie d'un fichier
  importé. C'est la même exposition que la base elle-même. L'écran prévient de ne le confier qu'à quelqu'un qui peut
  tout voir.
- **Pas de chiffrement au repos** : suffisant pour un jardin, grâce au bac à sable d'Android. À revoir avec les photos.
- **Écran verrouillé** : `lockscreenVisibility` n'est pas réglé, donc les rappels y suivent le réglage du téléphone. Ils
  nomment au plus trois tâches.

**Web** (démo exportée, servie en local sur le port 8097)
- **Pas d'injection** : `<img src=x onerror=…>` en paramètre d'URL et en nom de jardin s'affiche comme du texte,
  sans balise créée ni script lancé. `src/` n'utilise pas `dangerouslySetInnerHTML`.
- **Aucune ressource externe** au chargement.

**Dépendances**
- **Lockfile** : `npm ci` passe, et `npm audit signatures` vérifie les 1116 paquets. Tous viennent de
  `registry.npmjs.org`, avec une empreinte.
- **`npm audit`** : 28 alertes (5 hautes, 14 modérées, 9 basses). D'après la carte de sources du bundle Android, seuls
  `decode-uri-component`, `query-string`, `expo-router` et `expo` sont embarqués : voir C12. `expo` n'est signalé qu'à
  cause d'un outil de build. `zod`, `glob` et `minimatch` ne servent qu'au build.
- **Scripts d'installation** : Skia ne fait que copier ses fichiers, `unrs-resolver` et `fsevents` ne servent qu'au
  développement.
- **Paquets inutiles** : aucun. `expo-linking`, `expo-system-ui`, `react-dom` et `react-native-web` ne sont pas
  importés par `src/`, mais Expo Router, le thème natif et le web en ont besoin.

**Dépôt public**
- **Secrets** : aucun, d'après des motifs connus et une recherche d'entropie sur tous les blobs, y compris les
  orphelins, et les messages de commit, de PR et de commentaire. Un témoin vérifie que les motifs fonctionnent.
  Le scan de secrets de GitHub compte 0 alerte.
- **Fichiers sensibles** : les `appsettings*.json` de l'ancienne API n'ont jamais contenu de secret.
- **Images** : aucune des 273 images (PNG, JPEG, GIF) ne porte d'EXIF, de GPS, de texte PNG ou de commentaire GIF, d'après
  la lecture de leurs segments. Passées en revue sur des planches : rien que des captures de l'app et ses icônes. À cette
  taille, les textes ne se lisent pas tous.
- **Autres surfaces** : pas de wiki, de release, de Pages, d'artefact d'Actions ni de clé de déploiement.

**GitHub Actions**
- `permissions: contents: read`, déclencheur `pull_request` et non `pull_request_target`, aucun secret, approbation
  demandée aux nouveaux contributeurs, jeton par défaut en lecture seule.
- `actions/checkout@v7` et `actions/setup-node@v7` ne sont pas épinglées par SHA. Le risque est faible, car ce sont
  des actions officielles et la CI n'a rien à voler. À faire avec Dependabot.

## À vérifier sur un APK

Rien de ce qui suit ne peut se confirmer sans APK : l'audit n'a eu ni téléphone, ni Android SDK, ni Gradle. Le manifeste
final fusionne celui de l'app avec ceux des bibliothèques, dont `firebase-messaging`, que seul le build assemble.

```bash
aapt dump permissions jardo.apk
```
Attendu : `INTERNET`, `VIBRATE`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, plus ce qu'ajoute Firebase
(probablement `WAKE_LOCK`, `ACCESS_NETWORK_STATE`, `c2dm.permission.RECEIVE`). **`AD_ID` ne devrait pas y être** : à son
premier niveau, le POM de `firebase-messaging` 25.0.1 ne liste ni `play-services-measurement` ni `play-services-ads-identifier`. S'il y est,
l'ajouter à `android.blockedPermissions` dans `app.json`.

```bash
aapt dump xmltree jardo.apk AndroidManifest.xml
```
Attendu : pas de `debuggable` ni de `usesCleartextTraffic`, et `allowBackup` à vrai. Composants exportés : `MainActivity`
et `FirebaseInstanceIdReceiver`, protégé par `com.google.android.c2dm.permission.SEND`, que seuls les services Google
détiennent. Sans `google-services.json`, Firebase ne s'initialise pas : aucun jeton, donc aucune notification distante.

```bash
apksigner verify --print-certs jardo.apk
```
Attendu : la clé d'EAS, pas `Android Debug`. Le gabarit natif signe `release` avec la clé de debug : un build fait sur
le PC serait à refuser.

```bash
adb shell am start -a android.intent.action.VIEW -d "jardo:///_sitemap" com.pnjmax.jardo
```
Attendu avec #72 : l'écran « Unmatched Route ». Sans #72, c'est là qu'on constaterait l'erreur de C10.

```bash
adb shell am start -a android.intent.action.VIEW -d "jardo:///task/done?id=a&id=b" com.pnjmax.jardo
```
Attendu : un message d'erreur, pas de plantage. `expo-sqlite` doit refuser un tableau comme paramètre.

```bash
adb shell am start -n com.pnjmax.jardo/.MainActivity --es google.message_id 1 --es href https://example.org
```
Attendu avec #72 : rien ne s'ouvre. Sans #72, le navigateur s'ouvrirait : c'est le constat C8 sur le vrai téléphone.

À essayer ensuite à la main :
- **Réseau** : sans ville, aucun appel, y compris vers `exp.host` ou Firebase. Le code de ces deux services est dans
  l'app, sans être appelé.
- **Interception** : avec un certificat ajouté par l'utilisateur, la météo doit échouer.
- **Import** : un fichier de 19 Mo (temps de lecture sous Hermes) et un de 1 Go (refus propre). `File.size` est simulé
  dans les tests.
- **Hermes** : un fichier avec une clé `__proto__` doit être refusé, comme sous Node.
- **Écran verrouillé** : ce que dit un rappel, selon le réglage du téléphone.
- **Sauvegarde automatique** : la [procédure](etude-architecture-donnees.md#vérifier-la-sauvegarde-automatique-sur-lapk),
  en vérifiant les dernières saisies, puisque la base est en WAL.

## Ordre de correction

| Ordre | Quoi | Qui | Quand |
|---|---|---|---|
| 1 | Relire le passage de #67 signalé en C2, puis décider de sa fusion | Maxime | Avant de fusionner #67 |
| 2 | Fusionner #73, #69, #70, #71 et #72 : ordre libre | Maxime | Avant le premier APK |
| 3 | Protéger `main`, double authentification sur GitHub et Expo | Maxime | Avant le premier APK |
| 4 | Passer la liste de contrôle sur le premier APK | Maxime et Claude | Au premier APK |
| 5 | Décider pour l'historique, utiliser l'adresse `noreply` de GitHub | Maxime | Avant la fiche publique |
| 6 | Activer Dependabot, épingler les actions par SHA | Une session | Avant la fiche publique |
| 7 | Passer au SDK 58, ce qui règle aussi C12 | Une session | Au prochain passage de SDK |

**Pistes restées en recommandation**, sans constat confirmé ou trop lourdes pour un petit correctif :
- `credentials: 'omit'` sur le `fetch` de la météo : `expo/fetch` envoie les cookies par défaut. Aucun cookie d'Open-Meteo
  n'a été observé, l'audit n'appelant pas le service.
- `copyToCacheDirectory: false` à l'import : éviterait de copier un énorme fichier avant de le refuser, mais demande
  d'essayer la lecture d'une URI `content://` sur un téléphone.
- Vider le fichier d'export du cache au lancement suivant. Pas juste après le partage, car l'app destinataire peut le
  lire plus tard.
- Un écran `+not-found` en français, à la place d'« Unmatched Route ».
- **Si la démo web est un jour hébergée** : une origine dédiée, car OPFS appartient à l'origine et `pnj-max.github.io/jardo`
  la partagerait avec tout autre projet du compte. Une CSP aussi, à mettre au point, avec au moins `wasm-unsafe-eval`
  pour SQLite et Skia. Et prévenir que vider les données du site efface le jardin.

## Grille MASVS

| Catégorie | État | Note |
|---|---|---|
| STORAGE | Sain | Bac à sable, pas de journaux, sauvegarde automatique voulue |
| CRYPTO | Sans objet | Aucun chiffrement ni clé propres à l'app |
| AUTH | Sans objet | Ni compte ni session |
| NETWORK-1 | Sain, à confirmer sur l'APK | HTTPS seul |
| NETWORK-2 | Non retenu | Pas d'épinglage de certificat : la prévision est une donnée publique |
| PLATFORM-1 | C8, C9, C10 | Corrigés par #72 |
| PLATFORM-2 | Sans objet | Pas de WebView |
| PLATFORM-3 | Sain | L'écran verrouillé reste à regarder |
| CODE-1, CODE-2 | À suivre | SDK 57 ; l'app n'a pas de mise à jour forcée, normal pour un test par lien |
| CODE-3 | C12 | Rien d'atteignable, alertes Dependabot à activer |
| CODE-4 | C4, C5, C6, C7, C11 | Corrigés par #69, #70 et #71 |
| RESILIENCE | Non retenu | Aucun secret à protéger : l'anti-rétro-ingénierie serait disproportionnée |
| PRIVACY | C2 | Les données de l'app sont minimales ; l'exposition concerne le dépôt, pas les testeurs |

## Hypothèses et limites

Maxime étant absent, ces choix sont les miens, et il peut les corriger :
- **Les testeurs sont des proches**, qui installent un APK par un lien privé. Une app hostile sur leur téléphone et un fichier
  piégé envoyé par quelqu'un de confiance sont envisagés, mais peu probables.
- **Un nom d'auteur et une adresse dans un dépôt public** comptent comme une exposition de données personnelles,
  pas comme une faille de l'app.

Ce qui n'a pas été fait :
- **Aucun service tiers attaqué ni sondé.** Open-Meteo n'a pas été appelé : ses réponses sont simulées. Seuls ont été lus
  le dépôt et ses réglages par l'API de GitHub, le registre npm et un POM du dépôt Maven de Google.
- **Pas de téléphone ni d'Hermes.** Les tests tournent sous Node avec V8 et une vraie SQLite. Les temps cités sont ceux
  d'un PC.
- **`npm audit` ne couvre pas le code natif** : Firebase, OkHttp et les autres dépendances Gradle n'ont pas été
  analysés. Le faire demanderait un build.
- **Les réglages de compte** (double authentification, connexions d'applications) ne se lisent pas avec ce jeton.

## Ce que la deuxième passe a changé

Après le premier passage et les PR, tout a été repris en contradicteur, sans repartir des conclusions.

**Erreurs du premier passage, corrigées**
- **Borne basse des dates, retirée de #69.** Refuser les années sous 1000 n'empêchait aucun plantage, et un
  `<input type="date">` laisse taper `0026` sur le web : l'export d'une telle ligne n'aurait plus été importable.
- **« Rendre le jardin illisible », formule retirée.** Mesuré écran par écran : ni plantage ni blocage, mais des messages
  d'erreur, et Réglages reste joignable.
- **« Les notifications ne viennent que de l'app » était faux** : voir C8.
- **Le plafond de 20 Mo ne suffisait pas** : 33 000 espaces tiennent dans 8,5 Mo. Voir C5.
- **Deux tests passaient pour une mauvaise raison.** Retirer les ancres de l'expression des UUID ne faisait échouer
  aucun test : un identifiant `<uuid>/../../settings` est maintenant testé. Le fichier testé pour `credentials/` était déjà
  ignoré par `*.jks` : le test porte maintenant sur un autre fichier.
- **Le contrôle des métadonnées d'images ne portait que sur 80 d'entre elles**, sa sortie étant tronquée. Refait sur toutes.
  Les octets `GPS` trouvés dans `sombre-3-journal.jpg` sont dans les données compressées : il n'y a pas de segment EXIF.

**Trouvé en plus**
- C5, C8 et C9.
- **Deux commits orphelins** avec l'adresse professionnelle, et la preuve qu'un force-push ne les efface pas.
- **Un force-push sur `main`**, qui donne son poids à C1.
- **Des longueurs sans limite** dans #71 : un nom de ville ou une date de plusieurs mégaoctets.

**Contesté, et maintenu**
- **C10** : `window.location` existe-t-il sur un téléphone ? Le bundle de production contient un polyfill, mais il ne
  s'installe qu'avec une `origin` configurée ou générée pour un export serveur. Jardo n'a ni l'une ni l'autre.
- **C12** : `decode-uri-component` est bien embarqué, mais jamais appelé sur le chemin d'un lien.
- **Toutes les gravités « faible »** : aucune ne permet de lire des données, ni d'écrire sans un geste de l'utilisateur.

**Contrôlé en plus, sans rien trouver**
- **Fuzz de l'import** : 42 000 fichiers modifiés au hasard avant les correctifs, une seule cause trouvée (C4). 60 000 après,
  aucune. Sur 150 fichiers acceptés, 1950 rendus d'écran, aucun plantage ; un écran témoin prouve que le test en attraperait un.
- **Mutations** : 45 lignes des correctifs retirées ou altérées une à une. 42 font échouer un test du premier coup, 2 ont révélé
  les tests cités plus haut, et la dernière ne change rien, car une entrée qui n'est pas du bois ne porte pas de quantité sur un tas.
- **PR ensemble** : les six fusionnées localement sans conflit, 1873 tests verts, lint et typage compris.
- **Historique** : entropie de tous les blobs, commentaires de PR et de commit, wiki, artefacts, formats d'image atypiques.
- **Intents** : les écouteurs d'activité de toutes les bibliothèques, `expo-sharing` compris.
- **Liens** : des URL mal formées sur le vrai routeur.

**Instabilité repérée en passant** : des suites `today*` ont échoué deux fois quand Jest démarrait à froid sur une machine
chargée, et passent dès que le cache est chaud. Une suite a aussi échoué une fois sur `main`, avant toute modification. La
cause probable est le délai d'une seconde de `findBy*`. À traiter à part. `settings-map` a aussi échoué une fois sur la CI de cette PR :
c'est la course que #74 corrige, sans rapport avec l'audit.
