// POST /api/webhook : événements Stripe. La signature est vérifiée avant toute lecture du contenu.
// Aujourd'hui : on enregistre seulement qu'une commande a été payée (identifiants, aucune donnée client).
// Plus tard : c'est ici que partira la commande d'impression à la demande chez Printful.
import { verifyWebhook } from "../_lib/stripe.js";

const reply = (message, status) => new Response(message, { status, headers: { "Cache-Control": "no-store" } });

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_WEBHOOK_SECRET) return reply("Webhook non configuré.", 500);

  // Texte brut, tel que reçu : la signature porte sur ces octets exacts.
  const raw = await request.text();
  if (!(await verifyWebhook(raw, request.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET))) {
    return reply("Signature invalide.", 400);
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return reply("Corps illisible.", 400);
  }
  // Mode test uniquement pendant cette phase.
  if (event.livemode) return reply("Événement du mode réel ignoré.", 200);

  // Stripe peut renvoyer le même événement : on ne traite chaque identifiant qu'une fois.
  if (env.TELECHARGEMENTS) {
    const seen = `evenement:${event.id}`;
    if (await env.TELECHARGEMENTS.get(seen)) return reply("Déjà reçu.", 200);
    await env.TELECHARGEMENTS.put(seen, "1", { expirationTtl: 7 * 86400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data?.object ?? {};
    if (session.payment_status === "paid") {
      const delivery = session.metadata?.delivery;
      console.log(JSON.stringify({ webhook: event.type, evenement: event.id, session: session.id, produit: session.metadata?.slug, livraison: delivery }));
      if (delivery === "physical") {
        // À venir (Printful) : créer la commande d'impression à partir de la session, adresse de livraison incluse.
      }
    }
  }
  return reply("OK", 200);
}
