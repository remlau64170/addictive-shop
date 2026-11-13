# Paiement Stripe (mode test)

Boutique statique Astro + Cloudflare Pages Functions + Stripe Checkout (page de paiement hébergée par Stripe).
Aucun formulaire de carte sur le site. Franchise en base de TVA : pas de Stripe Tax, pas de TVA facturée,
mention « TVA non applicable, art. 293 B du CGI » sur la page de paiement et sur la facture.

## Essayer en local

1. Copier `.dev.vars.example` en `.dev.vars` (jamais dans git) et y mettre la clé secrète de **test** (`sk_test_…`).
2. Relier le webhook : `stripe listen --forward-to http://localhost:8788/api/webhook` (Stripe CLI, gratuit).
   Mettre le secret `whsec_…` qu'il affiche dans `STRIPE_WEBHOOK_SECRET`.
3. `npm run paiement:local` : construit le site avec l'achat activé, charge les PDF d'exemple, lance http://localhost:8788
4. `npm run paiement:tester` : contrôles automatiques (webhook, liens, PDF privés, entrées invalides).

Cartes de test : `4242 4242 4242 4242` (accepté), `4000 0000 0000 0002` (refusé), date future, CVC quelconque.

## Le bouton « Ajouter au panier »

Désactivé sur le site public (« La boutique ouvre bientôt »). Deux réglages, tous deux nécessaires :

- `PUBLIC_BOUTIQUE_OUVERTE=true` au moment de construire le site (sinon le bouton n'existe pas) ;
- `CHECKOUT_ENABLED=true` côté Functions (sinon le serveur refuse tout paiement).

Achetables : les guides PDF (`serie-30`, `sos-envie`) et le t-shirt brodé (`t-shirt-sois-addict`, 29 €).
Le t-shirt brodé est le seul produit physique de la boutique. Le prix vient toujours de Stripe, jamais du navigateur.

## Panier

- Gardé dans le navigateur (localStorage), sans compte client ; nombre d'articles sur l'icône de l'en-tête.
- Un guide PDF ne s'achète qu'une fois par commande ; un article livré jusqu'à 10 fois par ligne (couleur, taille).
- Le navigateur n'envoie que des choix. `/api/checkout` revérifie tout : produits, couleurs, tailles, quantités, prix.
- Le panier est vidé sur la page de remerciement, une fois le paiement confirmé.

## Livraison

- Forfait de **4,90 € par commande** (pas par article), 4 à 7 jours ouvrés, affiché sur la fiche et dans Checkout.
- Pays : France, Belgique, Luxembourg, Allemagne, Espagne, Italie, Pays-Bas, Portugal. Suisse exclue (port double
  et frais de douane pour le client).
- Adresse demandée seulement si le panier contient un article livré.
- **Livraison offerte** si le panier contient au moins un article livré ET au moins un guide PDF (calcul côté serveur).
- Le forfait ne couvre pas le port réel Printful (4,49 € HT + TVA = 5,39 € pour 1 article, 6,89 € pour 2 en France
  et dans l'UE) : la différence est absorbée, et entièrement prise en charge quand la livraison est offerte.

## Rétractation

- Guides PDF : la case « Accès dès le paiement » est obligatoire (accord exprès et renonciation). Dans un panier
  mixte, son texte précise qu'elle concerne uniquement les contenus numériques.
- **Articles livrés : 14 jours de rétractation à compter de la réception.** À reprendre dans les CGV (droit de
  rétractation, modalités et frais de retour). Mention sur la facture, dans le panier et sur la page de remerciement.

## Printful (articles livrés)

- Après paiement, le webhook `checkout.session.completed` crée la commande Printful des **articles livrés seulement**
  (les PDF suivent le téléchargement). **Brouillon** (`confirm=false`) : rien n'est fabriqué ni facturé.
- `PRINTFUL_CONFIRM_ORDERS=true` confirmerait automatiquement (fabrication et facturation). Désactivé par défaut,
  et refusé par le code tant que Stripe est en mode test.
- `external_id` : Printful limite ce champ à 32 caractères ; c'est l'empreinte SHA-256 (32 premiers caractères) de
  l'identifiant de session Stripe. Même session, même identifiant : Printful est interrogé avant toute création,
  donc aucun doublon, même si l'événement arrive deux fois. Le numéro de commande Printful est inscrit sur le paiement
  Stripe (métadonnées `printful_commande`, `printful_external_id`).
- Correspondance produit, couleur, taille → variantes Printful : `functions/_lib/printful-catalogue.js`.
- Fichier du blason : variables `PRINTFUL_FICHIER_BLASON_NOIR` et `PRINTFUL_FICHIER_BLASON_BLANC` (adresse publique
  du PNG, ou `id:…` d'un fichier de la bibliothèque Printful). En attendant, les brouillons de test utilisent
  `PRINTFUL_FICHIER_ESSAI_URL` ; une commande confirmée sans blason est refusée.
- Échec Printful (refus, délai dépassé) : l'échec est enregistré (stockage `TELECHARGEMENTS`, clé `printful-echec:…`
  avec le nombre de tentatives) et écrit dans le journal (« COMMANDE PRINTFUL NON CRÉÉE »). Le webhook répond 500 :
  **Stripe renvoie l'événement automatiquement pendant 3 jours** et prévient le titulaire du compte Stripe par e-mail si
  les échecs durent. Pour une alerte e-mail immédiate, il faudrait un envoi d'e-mail côté Cloudflare (Email Routing,
  gratuit) : non mis en place.
- E-mails de suivi de colis : envoyés par Printful au client (l'e-mail est transmis pour cela). Réglages côté Printful :
  Tableau de bord > Settings > Store settings > Branding (apparence des e-mails d'expédition), et
  Settings > Notifications (préférences par boutique). À vérifier et activer dans le compte.

## Blason brodé

- Fichiers prêts pour la broderie (PNG transparent, couleurs exactes des fils, taille réelle 56,5 × 42 mm à 300 dpi) :
  `prive/broderie/blason-tshirt-noir.png` (fils Aqua/Teal #3399FF et blanc #FFFFFF) et
  `prive/broderie/blason-tshirt-blanc.png` (fils Royal #005397 et noir #000000). Aperçus dans le même dossier.
- Bibliothèque Printful : noir = fichier 1110619563, blanc = fichier 1110620012 (ajoutés par l API avec l adresse
  « Voir en taille réelle », contenu identique aux fichiers locaux). Position à taille réelle : 56,5 × 42 mm, centré en
  haut de la zone poitrine (10,2 cm), dans `functions/_lib/printful-catalogue.js`.
- Logo de l'appli (icon-only-512.png) redessiné : même flèche, ruban simplifié en 3 bandes séparées de 2,2 mm ;
  « Addictive » en dessous, lettres de 9 mm (minimum Printful : 6,35 mm). Pas de slogan.
- Régénérer : `npm run broderie:blason` (script `scripts/blason-broderie.mjs`).
- Après dépôt dans la bibliothèque Printful : `npm run printful:fichier -- <identifiant>` vérifie le fichier et donne
  la ligne pour `.dev.vars`, puis `npm run printful:maquettes` crée les maquettes et remplace les photos de la fiche.

## Données envoyées à Printful

Nom et adresse de livraison, articles commandés (modèle, couleur, taille, quantité), identifiant de commande dérivé de
la session Stripe, e-mail seulement pour le suivi du colis, téléphone seulement si le transporteur l'exige (non transmis
aujourd'hui). Aucune donnée de paiement.

## Parcours

1. `POST /api/checkout` : crée la session Checkout et renvoie vers Stripe.
2. Stripe renvoie vers `/merci/?session_id=…`.
3. `GET /api/commande` vérifie auprès de Stripe que la session est payée, puis donne un lien personnel :
   valable 15 minutes, utilisable une seule fois, 3 liens au maximum par commande, commande valable 7 jours.
4. `GET /api/telecharger` envoie le PDF depuis le stockage privé `FICHIERS` (jamais dans un dossier public).
5. `POST /api/webhook` : signature vérifiée, rejeu et doublons refusés ; brouillon Printful pour les articles livrés.

## Confirmation écrite après l'achat

La facture Stripe, envoyée par e-mail, sert de confirmation écrite sur un support durable. Elle porte en pied de page :
« TVA non applicable, art. 293 B du CGI », puis la date et l'heure de l'accord (heure de Paris) et la phrase exacte
de la case « Accès dès le paiement ». La même phrase et la date sont enregistrées dans les métadonnées Stripe
(session, paiement, facture).

Coût accepté : une facture créée par Checkout (`invoice_creation`) coûte 0,4 % de la vente, plafonné à 2 $,
soit environ 0,05 € pour un produit à 12 €, en plus des frais de paiement Stripe.

## Avant une mise en ligne (rien n'est fait)

- Dans le compte Stripe réel : activer Paramètres > Entreprise > E-mails clients > Paiements réussis, pour que la
  facture et le reçu partent par e-mail.
- Dans le compte Stripe réel : remplir les informations publiques obligatoires (nom légal, adresse et e-mail du
  support, lien vers la politique de confidentialité).
- Créer les deux espaces KV (`wrangler kv namespace create`) et remplacer les `id` de `wrangler.toml`.
- Charger les vrais PDF dans `FICHIERS` (clés `pdf:serie-30`, `pdf:sos-envie`).
- Secrets Cloudflare : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (point de terminaison Stripe), `DOWNLOAD_SIGNING_SECRET`,
  `PRINTFUL_API_TOKEN`, `PRINTFUL_FICHIER_BLASON_NOIR`, `PRINTFUL_FICHIER_BLASON_BLANC`.
- Blason validé, envoyé à Printful, puis maquettes du t-shirt pour remplacer les visuels actuels de la fiche.
- Webhooks Printful (expédition, problème de commande) : non branchés.
- Le code refuse aujourd'hui toute clé qui n'est pas une clé de test : à revoir le jour du passage en mode réel.
- CGV et page de confidentialité, dont la renonciation au droit de rétractation pour le contenu numérique.
