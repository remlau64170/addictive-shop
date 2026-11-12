// POST /api/checkout : crée une session Stripe Checkout (page hébergée par Stripe) et y renvoie le visiteur.
// Aucune carte, aucune donnée client ne passe par ici : on envoie seulement un produit et des adresses de retour.
import { checkoutEnabled, stripe } from "../_lib/stripe.js";
import { CONSENTEMENT_RETRACTATION, CONSENTEMENT_VALEUR } from "../../src/data/consentement.js";

const MENTION_TVA = "TVA non applicable, art. 293 B du CGI";

const back = (origin, slug, reason) =>
  Response.redirect(`${origin}/boutique/${slug ? `${slug}/` : ""}?paiement=${reason}`, 303);

export async function onRequestPost({ request, env }) {
  const origin = new URL(request.url).origin;
  const form = await request.formData().catch(() => null);
  const slug = String(form?.get("produit") ?? "").toLowerCase();

  // Le slug ne sert qu'à retrouver un produit de la boutique : lettres, chiffres et tirets seulement.
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return back(origin, "", "invalide");
  if (!checkoutEnabled(env)) return back(origin, slug, "indisponible");
  // Contenu numérique livré tout de suite : la case « Accès dès le paiement » doit être cochée (vérifié aussi ici).
  if (form?.get("consentement") !== CONSENTEMENT_VALEUR) return back(origin, slug, "consentement");

  try {
    // Le prix vient de Stripe, jamais du navigateur : il est impossible de modifier le montant depuis la page.
    const product = await stripe(env, `/products/${slug}`, { query: { expand: ["default_price"] } });
    const price = product.default_price;
    if (!product.active || product.metadata?.delivery !== "digital") return back(origin, slug, "indisponible");
    if (!price?.active || price.currency !== "eur" || !price.unit_amount) return back(origin, slug, "indisponible");

    // Preuve de l'accord, avec la formulation exacte de la case, enregistrée sur la session, le paiement et la facture.
    const accord = {
      consentement_retractation: CONSENTEMENT_RETRACTATION,
      consentement_date: new Date().toISOString(),
    };
    const session = await stripe(env, "/checkout/sessions", {
      method: "POST",
      body: {
        mode: "payment",
        locale: "fr",
        submit_type: "pay",
        line_items: [{ price: price.id, quantity: 1 }],
        // Reçu et facture avec la mention légale de la franchise en base de TVA.
        invoice_creation: {
          enabled: true,
          invoice_data: {
            description: product.name,
            footer: `${MENTION_TVA}

Votre accord lors de l'achat : « ${CONSENTEMENT_RETRACTATION} »`,
            metadata: { slug, ...accord },
          },
        },
        custom_text: { submit: { message: MENTION_TVA } },
        payment_intent_data: { description: product.name, metadata: { slug, ...accord } },
        adaptive_pricing: { enabled: false },
        metadata: { slug, delivery: "digital", ...accord },
        success_url: `${origin}/merci/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/boutique/${slug}/?paiement=annule`,
      },
    });
    return Response.redirect(session.url, 303);
  } catch (error) {
    // Produit inconnu de Stripe (par exemple un produit physique, pas encore en vente) : simplement indisponible.
    if (error.status === 404) return back(origin, slug, "indisponible");
    console.error("checkout", error.status ?? "", error.stripeCode ?? "", error.message);
    return back(origin, slug, "erreur");
  }
}

// Toute autre méthode : on renvoie vers la boutique.
export async function onRequest({ request }) {
  return Response.redirect(`${new URL(request.url).origin}/boutique/`, 303);
}
