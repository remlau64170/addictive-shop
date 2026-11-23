# Ouverture des paiements : liste de bascule du jour J

Boutique en ligne : https://shop.addictive-app.com (projet Cloudflare Pages `addictive-shop`, branche de production
`main`). Aujourd'hui : paiement bloqué (`CHECKOUT_ENABLED = "false"`, `PUBLIC_BOUTIQUE_OUVERTE = "false"` dans
`wrangler.toml`), aucun secret dans Cloudflare, stockage `FICHIERS` vide.

Règles : les clés ne s'écrivent jamais dans un fichier du dépôt ni dans une commande qui reste dans l'historique ; elles
se collent uniquement quand wrangler ou un script les demande. Toutes les commandes se lancent depuis
`C:\Users\Rémy\addictive-shop`, avec wrangler connecté au compte Cloudflare (`npx wrangler whoami`).

Suivre les étapes dans l'ordre. Compter environ 1 h 30.

---

## 0. La veille

- [ ] Stripe : compte **activé en mode réel** (identité, IBAN pour les virements). Tableau de bord > en haut à droite,
      le mode test est désactivé sans message « Activez votre compte ».
- [ ] Printful : un **moyen de paiement** enregistré (Printful > Billing > Payment methods : carte, ou Printful Wallet
      rechargé). Sans lui, les commandes confirmées restent bloquées.
- [ ] Les 6 PDF finaux sont dans `prive/pdf/` (noms dans `src/data/livres.js`) et s'ouvrent dans Acrobat Reader.
- [ ] Les tests locaux passent : `npm run paiement:local` dans un terminal, puis `node scripts/tester-paiement.mjs`.

## 1. Profil de facturation Stripe (mode réel)

Tableau de bord Stripe, **mode test désactivé** :

1. Paramètres > **Informations sur l'entreprise** > Détails publics : nom affiché « Addictive », adresse e-mail
   d'assistance contact@addictive-app.com, site https://shop.addictive-app.com.
2. Paramètres > **Facturation** > Factures (modèle de facture) :
   - nom légal : **Rémy ALLIOD EI** ; SIRET **941 433 369 00027** ; nom commercial ADDICTIVE ;
   - préfixe de numérotation fixe (par exemple `ADD-`) : numérotation continue, sans trou ;
   - adresse de l'entreprise : celle déclarée à l'immatriculation (elle figure sur la facture, obligatoire).
   - La mention « TVA non applicable, art. 293 B du CGI » est déjà ajoutée par le site dans le pied de chaque facture.
3. Paramètres > **E-mails clients** : activer l'envoi des **paiements réussis** et des **factures**.
4. Paramètres > **Moyens de paiement** : vérifier la liste (carte au minimum). Les moyens à débit différé (prélèvement
   SEPA…) sont à laisser désactivés : le site donne l'accès aux livres au moment du paiement.

## 2. Produits, webhook et clé : en une commande

Commande unique (elle remplace les étapes 2, 3 et le début de 4) :

```bash
node scripts/ouvrir-stripe-live.mjs
```

Elle demande la clé live (`rk_live_…` ou `sk_live_…`, rien ne s'affiche), crée les 5 produits puis le webhook live,
et enregistre `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` dans Cloudflare. En cas de droit manquant, elle s'arrête
sans rien enregistrer et peut être relancée.

**Clé limitée (`rk_live_…`) : droits nécessaires** (Stripe > Développeurs > Clés API > la clé > Modifier) :

| Ressource | Droit | Pour |
| --- | --- | --- |
| Products | Écriture | créer les produits, les relire au paiement |
| Prices | Écriture | créer les prix |
| Checkout Sessions | Écriture | créer la page de paiement, relire la commande |
| PaymentIntents | Écriture | inscrire le numéro Printful sur le paiement |
| Invoices | Écriture | facture créée par Checkout |
| Customers | Écriture | client de la facture |
| Webhook Endpoints | Écriture | créer le webhook (peut être retiré ensuite) |
| Refunds | Écriture | rembourser le premier achat de contrôle |

Ancienne méthode, produits seulement :

```bash
node scripts/produits-stripe-live.mjs --essai
```

Vérifier la liste (5 produits, prix 14,90 / 14,90 / 14,90 / 34,90 / 29 €), puis :

```bash
node scripts/produits-stripe-live.mjs
```

Coller la clé secrète **live** quand elle est demandée (rien ne s'affiche). Résultat attendu : 5 lignes « créé en live ».

## 3. Webhook Stripe en mode réel

Tableau de bord Stripe, mode réel > Développeurs > **Webhooks** > Ajouter une destination :

- URL : `https://shop.addictive-app.com/api/webhook`
- Événements : `checkout.session.completed` et `checkout.session.async_payment_succeeded`
- Enregistrer, puis copier le **secret de signature** (`whsec_…`) pour l'étape 4.

## 4. Secrets Cloudflare (production)

Chaque commande demande la valeur : la coller, puis Entrée (elle n'est ni affichée ni enregistrée dans le dépôt).

```bash
npx wrangler pages secret put STRIPE_SECRET_KEY --project-name addictive-shop
```
(clé secrète **live**, `sk_live_…` ou clé restreinte `rk_live_…`)

```bash
npx wrangler pages secret put STRIPE_WEBHOOK_SECRET --project-name addictive-shop
```
(le `whsec_…` du webhook live de l'étape 3)

```bash
npx wrangler pages secret put PRINTFUL_API_TOKEN --project-name addictive-shop
```
(jeton de la boutique API Printful)

Secret de signature des liens de téléchargement, généré et envoyé directement, sans être affiché :

```bash
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64url'))" | npx wrangler pages secret put DOWNLOAD_SIGNING_SECRET --project-name addictive-shop
```

Vérifier (seuls les noms s'affichent) :

```bash
npx wrangler pages secret list --project-name addictive-shop
```

Attendu : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRINTFUL_API_TOKEN`, `DOWNLOAD_SIGNING_SECRET`.

## 5. Les 6 PDF dans le stockage privé FICHIERS

Clés lues par le site : `pdf:<livre>-telephone` et `pdf:<livre>-a4` (voir `src/data/livres.js`). Stockage de production :
`95519c1efb50445bace07f930e1dc2c0`. Le drapeau `--remote` est indispensable (sinon wrangler écrit en local).

```bash
npx wrangler kv key put "pdf:sors-de-ton-addiction-telephone" --path "prive/pdf/sors-de-ton-addiction-telephone-v5.pdf" --namespace-id 95519c1efb50445bace07f930e1dc2c0 --remote
```
```bash
npx wrangler kv key put "pdf:sors-de-ton-addiction-a4" --path "prive/pdf/sors-de-ton-addiction-A4-v3.pdf" --namespace-id 95519c1efb50445bace07f930e1dc2c0 --remote
```
```bash
npx wrangler kv key put "pdf:aiguise-ton-mental-telephone" --path "prive/pdf/aiguise-ton-mental-telephone-v3.pdf" --namespace-id 95519c1efb50445bace07f930e1dc2c0 --remote
```
```bash
npx wrangler kv key put "pdf:aiguise-ton-mental-a4" --path "prive/pdf/aiguise-ton-mental-A4-v3.pdf" --namespace-id 95519c1efb50445bace07f930e1dc2c0 --remote
```
```bash
npx wrangler kv key put "pdf:ose-ton-projet-telephone" --path "prive/pdf/ose-ton-projet-telephone-v5.pdf" --namespace-id 95519c1efb50445bace07f930e1dc2c0 --remote
```
```bash
npx wrangler kv key put "pdf:ose-ton-projet-a4" --path "prive/pdf/ose-ton-projet-A4-v5.pdf" --namespace-id 95519c1efb50445bace07f930e1dc2c0 --remote
```

Vérifier : 6 clés.

```bash
npx wrangler kv key list --namespace-id 95519c1efb50445bace07f930e1dc2c0 --remote
```

Si un livre change plus tard (nouvelle version), mettre à jour `src/data/livres.js` et relancer la commande du fichier
concerné : la clé est simplement remplacée.

## 6. Ouvrir la boutique, Printful encore en brouillon

Dans `wrangler.toml`, section `[vars]`, remplacer par :

```toml
[vars]
PUBLIC_BOUTIQUE_OUVERTE = "true"
CHECKOUT_ENABLED = "true"
PRINTFUL_CONFIRM_ORDERS = "false"
PRINTFUL_FICHIER_BLASON_NOIR = "id:1110619563"
PRINTFUL_FICHIER_BLASON_BLANC = "id:1110620012"
```

Puis commit sur `dev`, fusion dans `main` et envoi (Cloudflare reconstruit le site en 1 à 2 minutes) :

```bash
git add wrangler.toml
```
```bash
git commit -m "Ouverture des paiements (Printful en brouillon)"
```
```bash
git checkout main
```
```bash
git merge --ff-only dev
```
```bash
git push origin main dev
```
```bash
git checkout dev
```

Contrôles, une fois le déploiement terminé (Cloudflare > Workers & Pages > addictive-shop > Déploiements : « Succès ») :

- [ ] Fiche d'un livre : bouton « Ajouter au panier » (plus de « La boutique ouvre bientôt »).
      Si le message est toujours là : Cloudflare > addictive-shop > Paramètres > Variables et secrets, ajouter la
      variable de construction `PUBLIC_BOUTIQUE_OUVERTE` = `true`, puis Déploiements > « Réessayer le déploiement ».
- [ ] Panier : les cases « Accès dès le paiement » et CGV, bouton « Payer ».

## 7. Premier vrai achat (livre seul), puis remboursement

1. Sur https://shop.addictive-app.com, acheter **un livre** avec votre propre carte (14,90 €).
2. Vérifier :
   - [ ] la page de remerciement donne 2 liens, et les 2 PDF se téléchargent et s'ouvrent ;
   - [ ] l'e-mail de facture arrive : nom « Rémy ALLIOD EI », numéro de facture, pied de page avec la TVA, l'accord
         (date et texte) et le lien de téléchargement ;
   - [ ] Stripe > Développeurs > Webhooks > l'événement `checkout.session.completed` est en **200**.
3. Rembourser : Stripe > Paiements > ce paiement > **Rembourser** > montant total. Les frais Stripe du paiement ne sont
   pas rendus (quelques dizaines de centimes).

## 8. Premier achat avec t-shirt, puis confirmation automatique Printful

1. Acheter un livre + un t-shirt (livraison offerte). Vérifier dans Printful > Commandes : une commande **brouillon**,
   t-shirt seul, bon blason, bonne couleur et taille, bonne adresse.
2. Selon le choix : la **confirmer** dans Printful (elle sera fabriquée, facturée et livrée), ou l'**annuler** et
   rembourser le paiement dans Stripe.
3. Si tout est juste, passer `PRINTFUL_CONFIRM_ORDERS = "true"` dans `wrangler.toml`, puis commit, fusion et envoi
   comme à l'étape 6. Dès lors, chaque commande payée en mode réel est envoyée en fabrication automatiquement
   (le code refuse toujours la confirmation si Stripe est en mode test).

## 9. Retour arrière en cas de souci

Du plus rapide au plus complet :

1. **Revenir au site précédent (1 minute)** : Cloudflare > Workers & Pages > addictive-shop > Déploiements > le
   dernier déploiement avec le paiement bloqué > « … » > **Restaurer** (Rollback). Le site et les réglages de ce
   déploiement reviennent ; les secrets restent mais ne servent plus, car `CHECKOUT_ENABLED` vaut `false`.
2. **Bloquer durablement** : remettre `CHECKOUT_ENABLED = "false"` et `PUBLIC_BOUTIQUE_OUVERTE = "false"` (et
   `PRINTFUL_CONFIRM_ORDERS = "false"`) dans `wrangler.toml`, commit, fusion dans `main`, envoi.
3. **Commandes déjà passées** : chaque client garde ses liens de téléchargement (30 jours). Rembourser dans Stripe si
   besoin ; annuler les commandes Printful encore en brouillon ou en attente (Printful > Commandes).
4. **Clé compromise** : la révoquer immédiatement dans Stripe (Développeurs > Clés API > « Renouveler ») ou dans
   Printful, puis remettre la nouvelle avec `npx wrangler pages secret put …`.

## Après l'ouverture

- Surveiller les premiers jours : Stripe > Webhooks (aucun échec), Printful > Commandes, boîte contact@addictive-app.com.
- Informations légales dans `src/data/legal.js` (SIRET reçu le 23 novembre 2026) ; changer `CGV_VERSION` si les CGV
  changent.
- Médiateur de la consommation : à désigner dès les premières ventes (`MEDIATEUR` dans `src/data/legal.js`).
