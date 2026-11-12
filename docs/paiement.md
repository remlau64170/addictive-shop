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

## Le bouton « Acheter »

Désactivé sur le site public (« La boutique ouvre bientôt »). Deux réglages, tous deux nécessaires :

- `PUBLIC_BOUTIQUE_OUVERTE=true` au moment de construire le site (sinon le bouton n'existe pas) ;
- `CHECKOUT_ENABLED=true` côté Functions (sinon le serveur refuse tout paiement).

Seuls les produits numériques sont achetables. Le prix vient toujours de Stripe (produit `serie-30` ou `sos-envie`).

## Parcours

1. `POST /api/checkout` : crée la session Checkout et renvoie vers Stripe.
2. Stripe renvoie vers `/merci/?session_id=…`.
3. `GET /api/commande` vérifie auprès de Stripe que la session est payée, puis donne un lien personnel :
   valable 15 minutes, utilisable une seule fois, 3 liens au maximum par commande, commande valable 7 jours.
4. `GET /api/telecharger` envoie le PDF depuis le stockage privé `FICHIERS` (jamais dans un dossier public).
5. `POST /api/webhook` : signature vérifiée, rejeu et doublons refusés. Point d'entrée de Printful plus tard.

## Avant une mise en ligne (rien n'est fait)

- Créer les deux espaces KV (`wrangler kv namespace create`) et remplacer les `id` de `wrangler.toml`.
- Charger les vrais PDF dans `FICHIERS` (clés `pdf:serie-30`, `pdf:sos-envie`).
- Secrets Cloudflare : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (point de terminaison Stripe), `DOWNLOAD_SIGNING_SECRET`.
- Le code refuse aujourd'hui toute clé qui n'est pas une clé de test : à revoir le jour du passage en mode réel.
- Activer dans Stripe : reçus par e-mail (Paramètres > E-mails clients), informations légales de l'entreprise.
- CGV et page de confidentialité, dont la renonciation au droit de rétractation pour le contenu numérique.
