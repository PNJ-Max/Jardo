# Étude légale : RGPD, sécurité et Play Store

Maxime a demandé si une app sans serveur est légale, alors qu'elle sera téléchargée depuis le Play
Store. Cette étude répond à la question et liste ce qu'il reste à faire avant de publier. Le brouillon
de la politique de confidentialité est dans [`politique-de-confidentialite.md`](politique-de-confidentialite.md).

**Ce n'est pas un avis juridique.** Elle a été rédigée par Claude, sans juriste. Le code a été vérifié
le 05/11/2026 sur `main` (`6ef859f`), et les conditions de Google et d'Open-Meteo lues le même jour.
Les points marqués « à confirmer » sont à faire relire avant la fiche publique.

**Hypothèses :** l'éditeur est un particulier établi en Belgique (à confirmer par Maxime) ; l'app reste
gratuite, sans publicité ni achat, pendant la phase de test ; elle vise des jardiniers francophones
d'Europe. **Maxime veut en tirer un revenu si elle marche**, par exemple gratuite jusqu'à un certain
nombre de plantes, puis premium. Le modèle n'est pas choisi : voir [une offre payante](#une-offre-payante).

## 1. La réponse courte

- **Une app sans serveur est légale.** Aucun texte n'impose de serveur. Le RGPD encadre le traitement
  des données, pas l'architecture, et il demande d'en traiter le moins possible (articles 5 et 25).
- **Le choix reste bon pour une V1.** Un serveur ajouterait des comptes, un hébergeur, leur
  suppression et la gestion des fuites : plus d'obligations, pas moins.
- **Sans serveur ne veut pas dire sans obligation.** Il faut informer les utilisateurs, déclarer la
  météo à Google et publier une politique de confidentialité.
- **« Aucune donnée collectée » n'est plus exact.** Depuis la météo (#49), le nom de la ville, ses
  coordonnées et l'adresse IP partent vers Open-Meteo quand l'utilisateur choisit une ville.

## 2. Ce qui quitte réellement le téléphone

Ce tableau tient lieu de registre des traitements.

| Donnée | Vers | Quand | Durée chez le destinataire |
|---|---|---|---|
| Texte de la recherche de ville, adresse IP | Open-Meteo (géocodage) | Quand l'utilisateur lance la recherche | Journaux supprimés après 90 jours |
| Coordonnées de la ville choisie, adresse IP | Open-Meteo (prévisions) | Si une ville est choisie : à l'ouverture de l'app, au plus une fois par période de 3 heures | Journaux supprimés après 90 jours |
| Copie de la base | Compte Google de l'utilisateur | Sauvegarde automatique d'Android, si elle est active sur le téléphone | Selon Google ; l'éditeur n'y accède pas |
| Fichier d'export (tout le jardin) | Où l'utilisateur l'envoie | Sur son geste, dans Réglages | Selon le destinataire |

Les coordonnées envoyées sont celles de la ville, jamais celles du téléphone.

**En dehors de l'app :**

| Donnée | Qui la traite | Remarque |
|---|---|---|
| Compte Google, adresse IP et appareil au téléchargement | Google, selon ses propres règles | L'éditeur n'a aucun serveur pour les recevoir. La console Play lui donne des statistiques, dont le détail est à vérifier à la création du compte |
| Adresses e-mail des testeurs | L'éditeur, s'il les saisit dans la console Play | À limiter aux personnes d'accord et à retirer après le test. Le lien d'un APK n'en demande pas |
| Messages reçus à l'adresse de contact | L'éditeur | À garder le temps de répondre |

**Vérifié dans le code :**

- Le seul appel réseau de l'app est dans `src/lib/forecast.ts`, en HTTPS. Sans ville choisie, rien ne
  part. Retirer la ville efface aussi la prévision gardée.
- Il n'y a ni compte, ni publicité, ni statistiques, ni rapport de plantage, ni notification distante.
  Les rappels sont des notifications locales.
- Aucune permission de localisation n'est déclarée, ni par `app.json` ni par les bibliothèques.

**À vérifier sur le premier APK :** les manifestes lus dans `node_modules` déclarent `INTERNET`,
`VIBRATE`, `POST_NOTIFICATIONS` et `RECEIVE_BOOT_COMPLETED`. Les permissions de stockage y figurent
aussi, mais `app.json` les bloque. `expo-notifications` tire en plus `firebase-messaging`, alors que
l'app n'utilise pas de notification distante et n'a pas de `google-services.json`. Seul l'APK final dit
ce que cette dépendance ajoute, notamment l'identifiant publicitaire (`AD_ID`), à bloquer s'il apparaît.

## 3. Ce que le RGPD demande

**L'absence de serveur ne suffit pas à écarter le RGPD.** La Cour de justice a jugé qu'on peut être
responsable d'un traitement sans accéder aux données (C-25/17, reprise par les lignes directrices 07/2020
du Comité européen d'après les résumés consultés). Le cas d'une app purement locale reste discutable.
**Position retenue : l'éditeur se comporte en responsable de traitement.** Cela coûte peu et évite d'avoir à
trancher. L'adresse IP est traitée comme une donnée personnelle (C-582/14).

| Sujet | Pour Jardo | État |
|---|---|---|
| Information (art. 13) | Politique de confidentialité, et une phrase à côté du champ de la ville : la CNIL veut une information présentée au bon moment | **À faire** |
| Base légale (art. 6) | Météo : fourniture du service demandé (art. 6.1.b), à défaut intérêt légitime (art. 6.1.f). Pas de consentement à recueillir, puisque l'utilisateur choisit lui-même d'indiquer une ville | À confirmer |
| Minimisation (art. 5 et 25) | Une ville plutôt que le GPS, aucun SDK de suivi, rien sur un serveur | Fait |
| Droits (art. 15 à 22) | L'éditeur ne détient pas le jardin. Tout s'exerce sur le téléphone : export pour la portabilité, modification dans l'app, suppression en désinstallant. Retirer la ville arrête l'envoi. Pour ses journaux, Open-Meteo répond lui-même | Fait, à décrire dans la politique |
| Destinataire | Open-Meteo se déclare responsable indépendant : pas de contrat de sous-traitance à signer, mais il faut le nommer | À décrire |
| Transfert hors UE (art. 44 et 45) | OpenMeteo GmbH est en Suisse, couverte par une décision d'adéquation. L'hébergement n'est pas précisé dans ses conditions | À confirmer auprès d'Open-Meteo |
| Stockage sur le téléphone (ePrivacy, art. 5.3) | Nécessaire au service demandé : pas de consentement | Fait |
| Sécurité (art. 32) | Voir la section 5 | Fait en partie |
| Registre (art. 30) | La section 2 en tient lieu | Fait |
| Délégué à la protection des données, analyse d'impact (art. 35 et 37) | Pas de suivi à grande échelle ni de données sensibles : a priori pas requis | À confirmer |
| Violation de données (art. 33) | Ne concerne que ce que l'éditeur détient : e-mails de testeurs et de contact | Rien à faire |

## 4. Ce que Google demande

| Exigence | Pour Jardo |
|---|---|
| Compte | 25 USD une seule fois, pièce d'identité et carte de crédit au nom du titulaire. Un compte personnel doit aussi prouver l'accès à un appareil Android |
| Statut professionnel ou non | À déclarer à la création du compte. Sans activité commerciale ni revenus prévus, on n'est en principe pas professionnel. **Or Google cite l'intention d'en tirer des revenus parmi ses critères, et Maxime en prévoit : « non-professionnel » n'est donc pas acquis.** Google renvoie à un juriste en cas de doute, et une fausse déclaration peut entraîner un retrait de l'app. Un APK envoyé par lien n'exige ni compte Play ni déclaration |
| Coordonnées publiques | Un compte personnel déclaré professionnel affiche son adresse et son téléphone à partir du 01/03/2027 |
| Politique de confidentialité | Obligatoire même sans données sensibles, **dans la console et dans l'app**. En ligne, pas en PDF, à une adresse publique, active et sans blocage géographique. Elle donne un contact, les tiers destinataires, la sécurité, la conservation et la suppression, et nomme l'entité de la fiche |
| Formulaire « Sécurité des données » | Obligatoire. Réponses proposées ci-dessous |
| Autres déclarations | Publicité, classification du contenu, public visé |
| Test fermé | Compte personnel : 12 testeurs inscrits pendant 14 jours d'affilée avant la production |
| Information bien visible | Requise quand un usage ne correspond pas aux attentes raisonnables. Choisir une ville pour avoir sa météo y correspond : a priori pas d'écran dédié, mais la phrase de la section 3 |

**Réponses proposées au formulaire**, à confirmer en le remplissant :

| Question | Réponse | Pourquoi |
|---|---|---|
| Des données sont-elles collectées ? | Oui | Google appelle collecte toute transmission hors de l'appareil |
| Quel type ? | Position approximative | La ville et son IP situent l'utilisateur à l'échelle d'une zone |
| Traitement éphémère ? | Non | Les journaux d'Open-Meteo gardent IP et coordonnées 90 jours |
| Facultative ? | Oui | Rien ne part sans ville choisie |
| Partagée ? | Non, à confirmer | L'envoi est déclenché par l'utilisateur, qui s'y attend |
| Finalité | Fonctionnalité de l'app | Afficher la prévision |
| Chiffrée en transit ? | Oui | HTTPS |
| Suppression sur demande ? | À confirmer | L'éditeur ne détient rien ; le jardin se supprime en désinstallant l'app |
| Sauvegarde automatique d'Android | À confirmer | L'aide de Google n'en parle pas |
| Identifiant publicitaire ? | Non, à vérifier sur l'APK | Voir la section 2 |

## 5. Sécurité

L'absence de serveur retire le risque principal : ni base centrale à pirater, ni mots de passe, ni API
exposée. Le détail des risques est dans
[`etude-architecture-donnees.md`](etude-architecture-donnees.md#risques-de-sécurité-et-de-données).

| Point | État |
|---|---|
| Données sur le téléphone | Bac à sable Android, sans chiffrement au repos : suffisant pour un jardin, à revoir avec les photos |
| Réseau | HTTPS uniquement, un seul destinataire |
| Fichier importé | Version, schéma et règles vérifiés, tout dans une transaction |
| Secrets | Aucun dans l'APK |
| Clé de signature | Gardée par Expo. **À télécharger en sauvegarde** : sans elle, plus de mise à jour de l'app |
| Comptes Expo et Google | Double authentification à activer : ils permettent de publier une version piégée |
| Dépendances | Pas de surveillance automatique des failles (Dependabot) à ce jour. À ajouter avant la fiche publique |
| Dépôt public | Les premiers commits portent une adresse e-mail professionnelle : décision encore ouverte dans `suivi-progression.md` |

## 6. Ce qui changerait tout

| Si l'app… | Alors |
|---|---|
| devient payante, avec achat, abonnement ou publicité | Voir [une offre payante](#une-offre-payante) |
| envoie des statistiques ou des rapports de plantage | Formulaire de Google à refaire, et consentement à étudier |
| reçoit un serveur ou une synchronisation | Comptes et leur suppression, contrat avec l'hébergeur, notification des violations, sécurité d'une API |
| stocke des photos | Coordonnées GPS possibles dans les fichiers, et sauvegarde automatique à revoir |

### Une offre payante

**Recommandation : ne rien construire pour le paiement avant les retours des testeurs.** Le test reste
gratuit, en leur disant que des options payantes pourront arriver. Rien de ce qui existe n'empêche d'en
ajouter : le catalogue est fait de nos propres fiches, sans clause non commerciale ni de partage à
l'identique.

| Sujet | Ce que ça change |
|---|---|
| Serveur | L'achat d'une version premium passe par Google Play Billing et ne demande pas de serveur. Sans serveur, il se contourne plus facilement : acceptable au début. Point tiré de la documentation connue, à vérifier au moment de le construire |
| Statut | Professionnel : un compte personnel affiche son adresse et son téléphone à partir du 01/03/2027. Un compte d'organisation affiche ses propres coordonnées et son numéro D-U-N-S, et n'est pas soumis au test fermé |
| Entreprise et impôts | Revenus à déclarer. En Belgique : activité d'indépendant complémentaire, numéro d'entreprise, TVA, et clauses du contrat de travail de Maxime. Non étudié ici : à voir avec un comptable |
| Commission de Google | Dans l'EEE, depuis le 30/06/2026 : 10 % plus 5 % de frais de facturation sur un abonnement, d'après une page peu lisible. À confirmer, comme le taux d'un achat unique |
| Météo | L'offre gratuite d'Open-Meteo exclut les apps avec abonnement ou publicité. Un abonnement, annoncé vers 29 $ par mois, a une clé à protéger, donc sans doute un petit relais : **le seul serveur que le payant pourrait imposer**, sans aucune donnée de jardin. MET Norway n'est pas une issue simple : ses conditions demandent que les apps mobiles ne l'appellent pas directement. Autres pistes : une autre source, ou la météo réservée au premium |
| Publicité | La plus lourde : un SDK publicitaire change le formulaire de Google, demande sans doute un consentement et casse l'argument « pas de publicité ». Une version premium est préférable |
| Consommateurs | Conditions de vente et droit de rétractation à faire rédiger |
| Cyber-résilience | Règlement européen à étudier : d'après des sources secondaires, le logiciel gratuit hors activité commerciale en est exclu, et les obligations complètes s'appliquent au 11/12/2027 |

## 7. À faire, dans l'ordre

| # | Action | Qui | Quand |
|---|---|---|---|
| 1 | Faire trancher le statut professionnel ou non et ce qu'il implique en Belgique, par un comptable ou un guichet d'entreprises | Maxime | Avant le compte Play |
| 2 | Compléter les champs entre crochets de la politique : nom, pays, contact | Maxime | Avant les testeurs |
| 3 | Publier la politique sur une page publique (GitHub Pages ou Google Sites, gratuits) | Claude, puis Maxime | Avant les testeurs |
| 4 | Dans l'app : lien « Confidentialité » et phrase sous la météo, écran « À propos » avec les licences des bibliothèques | Une session | Avant les testeurs |
| 5 | Sur le premier APK : lister les permissions, chercher `AD_ID`, observer le réseau | Maxime et Claude | Au premier APK |
| 6 | Sauvegarder la clé de signature, activer la double authentification | Maxime | Au premier APK |
| 7 | Remplir le formulaire de Google | Maxime | À la création de la fiche |
| 8 | Chercher si le nom « Jardo » est libre (EUIPO, Benelux, Play Store) : pas encore vérifié | Maxime | Avant la fiche publique |
| 9 | Faire relire cette étude et la politique par un juriste | Maxime | Avant la fiche publique |

## Sources

Lues le 05/11/2026, sauf les textes de loi, cités de mémoire et non relus :

- Google Play : [Sécurité des données](https://support.google.com/googleplay/android-developer/answer/10787469?hl=fr), [Données utilisateur](https://support.google.com/googleplay/android-developer/answer/10144311?hl=fr), [Déclaration de statut](https://support.google.com/googleplay/android-developer/answer/17594752?hl=fr), [Créer un compte](https://support.google.com/googleplay/android-developer/answer/6112435?hl=fr), [Test fermé](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Conditions et confidentialité d'Open-Meteo](https://open-meteo.com/en/terms)
- [Recommandations de la CNIL sur les applications mobiles](https://www.cnil.fr/fr/applications-mobiles-la-cnil-publie-ses-recommandations-pour-mieux-proteger-la-vie-privee)
- [Lignes directrices 07/2020 du Comité européen de la protection des données](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-072020-concepts-controller-and-processor-gdpr_en), version finale du 07/07/2021 : le PDF lui-même n'a pas été lu
- [Décisions d'adéquation de la Commission européenne](https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en)
- [Introduire une plainte auprès de l'Autorité de protection des données belge](https://www.autoriteprotectiondonnees.be/citoyen/agir/introduire-une-plainte)
- [RGPD](https://eur-lex.europa.eu/eli/reg/2016/679/oj/fra), [directive ePrivacy](https://eur-lex.europa.eu/eli/dir/2002/58/oj/fra), arrêts de la Cour de justice [C-25/17](https://curia.europa.eu/juris/liste.jsf?num=C-25/17) et [C-582/14](https://curia.europa.eu/juris/liste.jsf?num=C-582/14)
- Règlement sur la cyber-résilience, résumé par [Goodwin](https://www.goodwinlaw.com/en/insights/publications/2026/09/alerts-lifesciences-technology-preparing-for-eu-cyber-resilience-act) et [noze](https://www.noze.it/en/insights/cra-commission-guidance/) : le texte lui-même n'a pas été lu
