# Pages légales

Pages : `/mentions-legales/`, `/cgv/`, `/confidentialite/`, `/cookies/` (liens dans le pied de page, colonne
« Informations légales »). Données communes : `src/data/legal.js`. Une valeur `null` s'affiche comme un repère
visible « [À COMPLÉTER : …] ». Tant qu'un repère reste, les 4 pages sont en `noindex` (gabarit
`src/components/LegalPage.astro`) ; une fois tout complété, ajouter les 4 adresses au sitemap.

## Repères à compléter (`src/data/legal.js`)

| Donnée | Variable | Pages |
| --- | --- | --- |
| Prénom et nom (suivis de « EI ») | `EDITEUR.nom` | mentions, CGV (art. 1 et formulaire), confidentialité |
| Adresse de l'entreprise | `EDITEUR.adresse` | mentions, CGV, confidentialité |
| Téléphone | `EDITEUR.telephone` | mentions, CGV |
| SIRET | `EDITEUR.siret` | mentions, CGV |
| Registre et numéro d'immatriculation (selon l'attestation) | `EDITEUR.immatriculation` | mentions, CGV |
| Directeur de la publication | `DIRECTEUR_PUBLICATION` | mentions |
| Médiateur de la consommation (nom, adresse, site) | `MEDIATEUR` | CGV art. 12 |
| Adresse de retour des articles | `ADRESSE_RETOUR` | CGV art. 9 et formulaire |
| Fournisseur de la messagerie de contact@addictive-app.com | `MESSAGERIE` | confidentialité |

## Acceptation des CGV

- Case du panier « J'ai lu et j'accepte les conditions générales de vente », non cochée, obligatoire pour toute
  commande, vérifiée aussi par `/api/checkout` (retour `?paiement=cgv`).
- Enregistré dans Stripe (métadonnées `cgv_version`, `cgv_acceptees`) ; la facture donne la version et le lien des CGV.
- Modifier les CGV : changer `CGV_VERSION` et `CGV_VERSION_TEXTE`.

## Cookies

Aucun cookie déposé par le site. Seul stockage : le panier (`localStorage`, clé `addictive-panier`), exempté de
consentement (garder le contenu d'un panier). Aucun script ni contenu tiers (polices, images, vidéos servies par le
site). Stripe dépose ses propres cookies sur checkout.stripe.com. À vérifier dans le tableau de bord Cloudflare :
Web Analytics désactivé (ou sans cookie) et pas de « Bot Fight Mode » qui ajouterait un cookie technique.

## Médiateurs de la consommation (référencés CECMC, tarifs relevés le 13 novembre 2026)

- **SMP – Société de la Médiation Professionnelle** (mediateur-consommation-smp.fr) : chiffre d'affaires inférieur à
  60 000 € : 25 € HT pour 3 ans (30 € TTC payés à la signature) ; médiation simple 150 € HT, complexe 350 € HT.
- **CM2C – Centre de Médiation de la Consommation des Conciliateurs de justice** (cm2c.net) : jusqu'à 10 personnes,
  48 € pour 3 ans, payés en une fois ; médiation à distance 36 € (HT ou TTC non précisé).
- **Med Conso Dev – Médiation Consommation Développement** (medconsodev.eu) : 1 à 5 personnes, à partir de 50 € HT
  par an (60 € TTC) ; honoraires après médiation à partir de 72,50 € HT (87 € TTC) pour un litige jusqu'à 250 €.

## À faire relire par un professionnel

Voir le résumé de la mise en place (13 novembre 2026) : TVA des livres numériques vendus dans l'UE, réglages des
factures Stripe (identité, SIRET, numérotation), délai de livraison, rétractation et retours Printful, transferts hors UE
de Printful, durées de conservation choisies, prix unique et dépôt légal des livres numériques.
