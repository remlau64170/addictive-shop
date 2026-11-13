// POST /api/checkout : crée une session Stripe Checkout (page hébergée par Stripe) pour tout le panier.
// Le navigateur n'envoie que des choix (produits, couleur, taille, quantité). Prix, livraison et livraison offerte
// sont calculés ici, à partir de Stripe et des règles de src/data/boutique.js. Aucune donnée de carte ne passe ici.
import { checkoutEnabled, stripe } from "../_lib/stripe.js";
import { CONSENTEMENT_VALEUR, RETRACTATION_PHYSIQUE, texteConsentement } from "../../src/data/consentement.js";
import { LIGNES_MAX, LIVRAISON, PHYSIQUES_EN_VENTE, QUANTITE_MAX, livraisonOfferte } from "../../src/data/boutique.js";
import { fichiersDuProduit, livresEnDouble } from "../../src/data/livres.js";

import { ACCEPTATION_CGV, ACCEPTATION_CGV_VALEUR, CGV_VERSION, CGV_VERSION_TEXTE, MENTION_TVA } from "../../src/data/legal.js";
const SLUG = /^[a-z0-9-]{1,60}$/;

const retour = (origin, raison, page = "/panier/") => Response.redirect(`${origin}${page}?paiement=${raison}`, 303);

/** Lit le panier envoyé par le formulaire. Accepte aussi l'ancien envoi d'un seul produit (« produit »). */
function lirePanier(form) {
  const brut = form?.get("panier");
  if (!brut && form?.get("produit")) return [{ id: String(form.get("produit")).toLowerCase(), quantite: 1 }];
  try {
    const lignes = JSON.parse(String(brut ?? "[]"));
    return Array.isArray(lignes) ? lignes : null;
  } catch {
    return null;
  }
}

export async function onRequestPost({ request, env }) {
  const origin = new URL(request.url).origin;
  const form = await request.formData().catch(() => null);
  const lignes = lirePanier(form);
  if (!lignes || lignes.length === 0 || lignes.length > LIGNES_MAX) return retour(origin, "invalide");
  if (!checkoutEnabled(env)) return retour(origin, "indisponible");

  // Validation stricte de chaque ligne, avant tout appel à Stripe.
  const propres = [];
  for (const ligne of lignes) {
    const id = String(ligne?.id ?? "").toLowerCase();
    const quantite = Number(ligne?.quantite ?? 1);
    if (!SLUG.test(id) || !Number.isInteger(quantite) || quantite < 1 || quantite > QUANTITE_MAX) return retour(origin, "invalide");
    const vente = PHYSIQUES_EN_VENTE[id];
    if (vente) {
      if (!vente.couleurs.some((c) => c.id === ligne.couleur) || !vente.tailles.includes(ligne.taille)) return retour(origin, "invalide");
      propres.push({ id, quantite, couleur: ligne.couleur, taille: ligne.taille });
    } else if (!propres.some((p) => p.id === id)) {
      propres.push({ id, quantite: 1 }); // un livre numérique ne s'achète qu'une fois
    }
  }

  // Un livre déjà contenu dans le pack du panier : on ne le fait pas payer deux fois, le panier propose de le retirer.
  if (livresEnDouble(propres.map((p) => p.id)).length > 0) return retour(origin, "doublon");

  try {
    // Produits Stripe (prix et nature lus chez Stripe, jamais dans le navigateur).
    const produits = new Map();
    for (const id of new Set(propres.map((p) => p.id))) {
      const produit = await stripe(env, `/products/${id}`, { query: { expand: ["default_price"] } });
      const prix = produit.default_price;
      const nature = produit.metadata?.delivery;
      if (!produit.active || !["digital", "physical"].includes(nature)) return retour(origin, "indisponible");
      if (nature === "physical" && !PHYSIQUES_EN_VENTE[id]) return retour(origin, "indisponible");
      if (nature === "digital" && (PHYSIQUES_EN_VENTE[id] || fichiersDuProduit(id).length === 0)) return retour(origin, "indisponible");
      if (!prix?.active || prix.currency !== "eur" || !prix.unit_amount) return retour(origin, "indisponible");
      produits.set(id, produit);
    }

    const numeriques = propres.filter((p) => produits.get(p.id).metadata.delivery === "digital");
    const physiques = propres.filter((p) => produits.get(p.id).metadata.delivery === "physical");
    const offerte = livraisonOfferte({ numerique: numeriques.length, physique: physiques.length });

    // Contenu numérique : la case « Accès dès le paiement » doit être cochée (vérifié ici aussi, pas seulement dans la page).
    if (numeriques.length > 0 && form?.get("consentement") !== CONSENTEMENT_VALEUR) return retour(origin, "consentement");
    // Conditions générales de vente : case du panier obligatoire pour toute commande (vérifiée ici aussi).
    if (form?.get("cgv") !== ACCEPTATION_CGV_VALEUR) return retour(origin, "cgv");

    const line_items = [
      ...numeriques.map((p) => ({ price: produits.get(p.id).default_price.id, quantity: 1 })),
      ...physiques.map((p) => {
        const produit = produits.get(p.id);
        const couleur = PHYSIQUES_EN_VENTE[p.id].couleurs.find((c) => c.id === p.couleur);
        return {
          quantity: p.quantite,
          price_data: {
            currency: "eur",
            unit_amount: produit.default_price.unit_amount,
            product_data: {
              name: `${produit.name} – ${couleur.nom}, taille ${p.taille}`,
              metadata: { slug: p.id, couleur: p.couleur, taille: p.taille, delivery: "physical" },
            },
          },
        };
      }),
    ];

    // Panier compact, relu par le webhook : « slug » pour un PDF, « slug:couleur:taille:quantité » pour un article.
    const panier = [...numeriques.map((p) => p.id), ...physiques.map((p) => `${p.id}:${p.couleur}:${p.taille}:${p.quantite}`)].join(";");
    const nature = physiques.length && numeriques.length ? "mixed" : physiques.length ? "physical" : "digital";
    const metadata = { delivery: nature, panier: panier.slice(0, 500), cgv_version: CGV_VERSION, cgv_acceptees: ACCEPTATION_CGV };
    if (numeriques.length === 1 && physiques.length === 0) metadata.slug = numeriques[0].id;

    // Preuve de l'accord (formulation exacte de la case affichée pour ce panier) et date.
    const pied = [MENTION_TVA];
    if (numeriques.length > 0) {
      const maintenant = new Date();
      const texte = texteConsentement(physiques.length > 0);
      metadata.consentement_retractation = texte;
      metadata.consentement_date = maintenant.toISOString();
      const quand = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).format(maintenant);
      pied.push(`Votre accord lors de l'achat, le ${quand} (heure de Paris) : « ${texte} »`);
    }
    if (numeriques.length > 0) {
      // Lien vers la page de téléchargement, dans la facture envoyée par e-mail : identifiant aléatoire, relié à la
      // session par le webhook. La page donne un lien par fichier (version téléphone et version A4).
      const ref = crypto.randomUUID().replaceAll("-", "");
      metadata.ref = ref;
      pied.push(`Vos téléchargements (version téléphone et version A4) : ${origin}/merci/?ref=${ref}`);
    }
    if (physiques.length > 0) pied.push(RETRACTATION_PHYSIQUE);
    pied.push(`Conditions générales de vente acceptées (version du ${CGV_VERSION_TEXTE}) : ${origin}/cgv/ · Confidentialité : ${origin}/confidentialite/`);

    const body = {
      mode: "payment",
      locale: "fr",
      submit_type: "pay",
      line_items,
      // Facture envoyée par e-mail par Stripe : confirmation écrite (support durable) de l'achat.
      // Coût Stripe : 0,4 % de la vente, plafonné à 2 $. Voir docs/paiement.md.
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: numeriques.length + physiques.length === 1 ? (line_items[0].price_data?.product_data.name ?? produits.get(propres[0].id).name) : "Commande Addictive",
          footer: pied.join("\n\n"),
          metadata,
        },
      },
      custom_text: { submit: { message: MENTION_TVA } },
      payment_intent_data: { description: "Commande Addictive", metadata },
      adaptive_pricing: { enabled: false },
      metadata,
      success_url: `${origin}/merci/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/panier/?paiement=annule`,
    };

    // Article livré : adresse obligatoire (pays desservis) et un seul forfait de livraison par commande.
    if (physiques.length > 0) {
      body.shipping_address_collection = { allowed_countries: LIVRAISON.pays };
      body.shipping_options = [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: offerte ? LIVRAISON.libelleOfferte : LIVRAISON.libelle,
            fixed_amount: { amount: offerte ? 0 : LIVRAISON.montant, currency: "eur" },
            delivery_estimate: {
              minimum: { unit: "business_day", value: LIVRAISON.delaiJours.min },
              maximum: { unit: "business_day", value: LIVRAISON.delaiJours.max },
            },
          },
        },
      ];
    }

    const session = await stripe(env, "/checkout/sessions", { method: "POST", body });
    return Response.redirect(session.url, 303);
  } catch (error) {
    // Produit inconnu de Stripe : simplement indisponible.
    if (error.status === 404) return retour(origin, "indisponible");
    console.error("checkout", error.status ?? "", error.stripeCode ?? "", error.message);
    return retour(origin, "erreur");
  }
}

// Toute autre méthode : on renvoie vers la boutique.
export async function onRequest({ request }) {
  return Response.redirect(`${new URL(request.url).origin}/boutique/`, 303);
}
