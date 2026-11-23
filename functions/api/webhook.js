// POST /api/webhook : événements Stripe. La signature est vérifiée avant toute lecture du contenu.
// Commande payée avec un article livré : création de la commande Printful (brouillon tant que Stripe est en test).
// En cas d'échec Printful, on répond 500 : Stripe renvoie l'événement automatiquement (pendant 3 jours, de plus en plus
// espacé) et prévient le titulaire du compte Stripe par e-mail si les échecs durent. L'échec est aussi journalisé.
import { modeReel, stripe, verifyWebhook } from "../_lib/stripe.js";
import { creerCommandePrintful } from "../_lib/printful.js";

const reply = (message, status) => new Response(message, { status, headers: { "Cache-Control": "no-store" } });
const SEPT_JOURS = 7 * 86400;

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
  // Seuls les événements du mode en service sont traités (réel en production, test en local).
  if (Boolean(event.livemode) !== modeReel(env)) return reply("Événement d'un autre mode ignoré.", 200);

  // Stripe peut renvoyer le même événement : chaque identifiant n'est traité qu'une fois (marqué seulement après succès).
  const vu = `evenement:${event.id}`;
  if (env.TELECHARGEMENTS && (await env.TELECHARGEMENTS.get(vu))) return reply("Déjà reçu.", 200);

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const resume = event.data?.object ?? {};
    const livraison = resume.metadata?.delivery;
    console.log(JSON.stringify({ webhook: event.type, evenement: event.id, session: resume.id, livraison }));

    // Lien de la facture (« /merci/?ref=… ») : on relie l'identifiant aléatoire à la session payée.
    if (resume.payment_status === "paid" && /^[a-f0-9]{32}$/.test(resume.metadata?.ref ?? "")) {
      await env.TELECHARGEMENTS?.put(`ref:${resume.metadata.ref}`, resume.id, { expirationTtl: 30 * 86400 });
    }

    if (resume.payment_status === "paid" && (livraison === "physical" || livraison === "mixed")) {
      const cle = `printful:${resume.id}`;
      const deja = env.TELECHARGEMENTS ? await env.TELECHARGEMENTS.get(cle) : null;
      if (!deja) {
        try {
          // Session complète (lignes, adresse) relue chez Stripe : on ne se fie pas au seul contenu de l'événement.
          const session = await stripe(env, `/checkout/sessions/${resume.id}`, { query: { expand: ["line_items.data.price.product"] } });
          const resultat = await creerCommandePrintful(env, session);
          await env.TELECHARGEMENTS?.put(cle, JSON.stringify(resultat), { expirationTtl: 90 * 86400 });
          await env.TELECHARGEMENTS?.delete(`printful-echec:${resume.id}`);
          console.log(JSON.stringify({ printful: resultat.statut, commande: resultat.id, externalId: resultat.externalId, brouillon: resultat.brouillon, session: resume.id }));
          // Trace dans Stripe : le paiement indique la commande Printful correspondante.
          if (resultat.id && session.payment_intent) {
            await stripe(env, `/payment_intents/${session.payment_intent}`, {
              method: "POST",
              body: { metadata: { printful_commande: String(resultat.id), printful_external_id: resultat.externalId } },
            }).catch(() => {});
          }
        } catch (error) {
          const echecCle = `printful-echec:${resume.id}`;
          const precedent = JSON.parse((await env.TELECHARGEMENTS?.get(echecCle)) ?? "{}");
          const echec = { tentatives: (precedent.tentatives ?? 0) + 1, erreur: String(error.message).slice(0, 300), date: new Date().toISOString() };
          await env.TELECHARGEMENTS?.put(echecCle, JSON.stringify(echec), { expirationTtl: 30 * 86400 });
          console.error(JSON.stringify({ alerte: "COMMANDE PRINTFUL NON CRÉÉE", session: resume.id, ...echec }));
          // 500 : Stripe renverra l'événement plus tard (reprise automatique).
          return reply("Commande Printful non créée, nouvel essai à venir.", 500);
        }
      }
    }
  }

  await env.TELECHARGEMENTS?.put(vu, "1", { expirationTtl: SEPT_JOURS });
  return reply("OK", 200);
}
