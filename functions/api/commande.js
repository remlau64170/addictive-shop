// GET /api/commande?session_id=cs_… (retour de Stripe) ou ?ref=… (lien de la facture envoyée par e-mail) :
// vérifie auprès de Stripe que la session est payée, puis remet un lien de téléchargement personnel par fichier
// (version téléphone et version A4 de chaque livre, 6 fichiers pour le pack) et le récapitulatif des articles livrés.
// Conservé chez nous : un compteur par commande, l'identifiant de chaque lien, la correspondance ref → session.
import { json, modeReel, signToken, stripe } from "../_lib/stripe.js";
import { fichiersDuProduit } from "../../src/data/livres.js";

const TOKEN_MINUTES = 15;
const LIENS_PAR_FICHIER = 3;
const ORDER_DAYS = 30;

async function sessionDemandee(url, env) {
  const sessionId = url.searchParams.get("session_id");
  if (sessionId) return /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId) ? sessionId : null;
  const ref = url.searchParams.get("ref") ?? "";
  if (!/^[a-f0-9]{32}$/.test(ref)) return null;
  return (await env.TELECHARGEMENTS.get(`ref:${ref}`)) ?? "attente";
}

export async function onRequestGet({ request, env }) {
  if (!env.DOWNLOAD_SIGNING_SECRET || !env.TELECHARGEMENTS) return json({ etat: "erreur" }, 500);
  const sessionId = await sessionDemandee(new URL(request.url), env);
  if (!sessionId) return json({ etat: "invalide" }, 400);
  // Lien de facture pas encore relié (webhook pas encore reçu) : la page invite à réessayer dans un instant.
  if (sessionId === "attente") return json({ etat: "non_paye" }, 402);

  let session;
  try {
    session = await stripe(env, `/checkout/sessions/${sessionId}`, { query: { expand: ["line_items.data.price.product"] } });
  } catch (error) {
    console.error("commande", error.status ?? "", error.message);
    return json({ etat: error.status === 404 ? "invalide" : "erreur" }, error.status === 404 ? 404 : 502);
  }

  // Une session doit appartenir au mode en service (réel en production, test en local).
  if (session.livemode !== modeReel(env)) return json({ etat: "invalide" }, 400);
  if (session.mode !== "payment") return json({ etat: "invalide" }, 400);
  if (session.status === "expired") return json({ etat: "expiree" }, 410);
  if (session.payment_status !== "paid" || session.status !== "complete") return json({ etat: "non_paye" }, 402);
  if (Date.now() / 1000 - session.created > ORDER_DAYS * 86400) return json({ etat: "ancienne" }, 410);

  // Ce qui est livré est ce qui a été payé : on le lit dans les lignes de la session, pas dans l'adresse.
  const lignes = (session.line_items?.data ?? []).map((l) => ({ produit: l.price?.product, quantite: l.quantity }));
  const numeriques = lignes.filter((l) => typeof l.produit === "object" && l.produit?.metadata?.delivery === "digital");
  const articles = lignes.filter((l) => typeof l.produit === "object" && l.produit?.metadata?.delivery === "physical");
  if (numeriques.length === 0 && articles.length === 0) return json({ etat: "invalide" }, 400);

  // Fichiers à livrer, sans doublon (un livre peut être dans le pack et acheté seul).
  const fichiers = [];
  for (const { produit } of numeriques) {
    for (const f of fichiersDuProduit(produit.id)) if (!fichiers.some((x) => x.cle === f.cle)) fichiers.push(f);
  }

  let liens = [];
  let visitesRestantes = 0;
  if (fichiers.length > 0) {
    // 3 liens par fichier au total : chaque visite de la page en crée un par fichier.
    const counterKey = `commande:${session.id}`;
    const deja = Number(await env.TELECHARGEMENTS.get(counterKey)) || 0;
    const limite = LIENS_PAR_FICHIER * fichiers.length;
    if (deja + fichiers.length > limite) return json({ etat: "limite" }, 429);
    await env.TELECHARGEMENTS.put(counterKey, String(deja + fichiers.length), { expirationTtl: ORDER_DAYS * 86400 });
    visitesRestantes = Math.floor((limite - deja - fichiers.length) / fichiers.length);
    liens = await Promise.all(
      fichiers.map(async (f) => {
        const token = await signToken(env.DOWNLOAD_SIGNING_SECRET, { s: session.id, p: f.cle, j: crypto.randomUUID(), exp: Date.now() + TOKEN_MINUTES * 60_000 });
        return { livre: f.livre, libelle: f.libelle, pages: f.pages, lien: `/api/telecharger?token=${encodeURIComponent(token)}` };
      }),
    );
  }

  return json({
    etat: "paye",
    liens,
    articles: articles.map(({ produit, quantite }) => ({ produit: produit.name, quantite })),
    minutes: TOKEN_MINUTES,
    liensRestants: visitesRestantes,
    // Confirmation écrite de l'accord donné lors de l'achat, tel qu'enregistré dans Stripe.
    accord: session.metadata?.consentement_retractation ?? null,
    accordDate: session.metadata?.consentement_date ?? null,
  });
}
