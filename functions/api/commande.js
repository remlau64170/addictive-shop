// GET /api/commande?session_id=cs_… : vérifie auprès de Stripe que la session est bien payée, puis remet un lien de
// téléchargement personnel. Conservé chez nous : un compteur par session et l'identifiant du lien (aucune donnée client).
import { json, signToken, stripe } from "../_lib/stripe.js";

const TOKEN_MINUTES = 15;
const MAX_LINKS_PER_ORDER = 3;
const ORDER_DAYS = 7;

export async function onRequestGet({ request, env }) {
  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) return json({ etat: "invalide" }, 400);
  if (!env.DOWNLOAD_SIGNING_SECRET || !env.TELECHARGEMENTS) return json({ etat: "erreur" }, 500);

  let session;
  try {
    session = await stripe(env, `/checkout/sessions/${sessionId}`, { query: { expand: ["line_items.data.price.product"] } });
  } catch (error) {
    console.error("commande", error.status ?? "", error.message);
    return json({ etat: error.status === 404 ? "invalide" : "erreur" }, error.status === 404 ? 404 : 502);
  }

  // Jamais de livraison sur une session du mode réel pendant la phase de test.
  if (session.livemode) return json({ etat: "invalide" }, 400);
  if (session.mode !== "payment") return json({ etat: "invalide" }, 400);
  if (session.status === "expired") return json({ etat: "expiree" }, 410);
  if (session.payment_status !== "paid" || session.status !== "complete") return json({ etat: "non_paye" }, 402);
  if (Date.now() / 1000 - session.created > ORDER_DAYS * 86400) return json({ etat: "ancienne" }, 410);

  // Le produit livré est celui qui a été payé : on le lit dans les lignes de la session, pas dans l'adresse.
  const product = session.line_items?.data?.[0]?.price?.product;
  const slug = typeof product === "object" ? product.id : product;
  if (!slug || session.metadata?.slug !== slug || product?.metadata?.delivery !== "digital") return json({ etat: "invalide" }, 400);

  const counterKey = `commande:${sessionId}`;
  const count = Number(await env.TELECHARGEMENTS.get(counterKey)) || 0;
  if (count >= MAX_LINKS_PER_ORDER) return json({ etat: "limite" }, 429);
  await env.TELECHARGEMENTS.put(counterKey, String(count + 1), { expirationTtl: ORDER_DAYS * 86400 });

  const jti = crypto.randomUUID();
  const token = await signToken(env.DOWNLOAD_SIGNING_SECRET, { s: sessionId, p: slug, j: jti, exp: Date.now() + TOKEN_MINUTES * 60_000 });
  return json({
    etat: "paye",
    produit: product.name,
    lien: `/api/telecharger?token=${encodeURIComponent(token)}`,
    minutes: TOKEN_MINUTES,
    liensRestants: MAX_LINKS_PER_ORDER - count - 1,
    // Confirmation écrite de l'accord donné lors de l'achat, tel qu'enregistré dans Stripe.
    accord: session.metadata?.consentement_retractation ?? null,
    accordDate: session.metadata?.consentement_date ?? null,
  });
}
