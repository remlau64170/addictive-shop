// Création des commandes Printful à partir d'une session Stripe payée.
// RÈGLE : brouillons seulement (confirm=false). La confirmation automatique n'existe que derrière
// PRINTFUL_CONFIRM_ORDERS=true, et elle est refusée tant que Stripe n'est pas en mode réel.
import { CATALOGUE_PRINTFUL } from "./printful-catalogue.js";
import { toHex } from "./stripe.js";

const API = "https://api.printful.com";

async function printful(env, method, path, body) {
  if (!env.PRINTFUL_API_TOKEN) throw Object.assign(new Error("PRINTFUL_API_TOKEN absent"), { status: 500 });
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${env.PRINTFUL_API_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.result === "string" ? data.result : data?.error?.message ?? `Printful ${response.status}`;
    throw Object.assign(new Error(message), { status: response.status });
  }
  return data.result;
}

/** Printful limite external_id à 32 caractères : empreinte fixe de l'identifiant de session Stripe (même session, même valeur). */
export async function externalId(sessionId) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sessionId));
  return toHex(hash).slice(0, 32);
}

/** Confirmation automatique : seulement si le réglage est activé ET que Stripe est en mode réel. */
export function confirmationAutorisee(env, session) {
  const demandee = env.PRINTFUL_CONFIRM_ORDERS === "true";
  const modeReel = session.livemode === true && String(env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live_");
  if (demandee && !modeReel) console.warn("PRINTFUL_CONFIRM_ORDERS refusé : Stripe est en mode test, commande laissée en brouillon.");
  return demandee && modeReel;
}

/** Fichier du blason : adresse publique ou « id:… » de la bibliothèque Printful. En brouillon de test seulement, un fichier d'essai. */
function fichier(env, nomVariable, brouillon) {
  const valeur = env[nomVariable];
  if (valeur?.startsWith("id:")) return { id: Number(valeur.slice(3)) };
  if (valeur?.startsWith("https://")) return { url: valeur };
  if (brouillon && env.PRINTFUL_FICHIER_ESSAI_URL?.startsWith("https://")) return { url: env.PRINTFUL_FICHIER_ESSAI_URL };
  throw Object.assign(new Error(`Fichier de broderie non configuré (${nomVariable})`), { status: 500 });
}

/** Articles physiques de la session → lignes de commande Printful (taille, couleur, fichier, fils). */
export function articlesPrintful(env, session, brouillon) {
  const lignes = session.line_items?.data ?? [];
  const articles = [];
  for (const ligne of lignes) {
    const produit = ligne.price?.product;
    const meta = typeof produit === "object" ? produit.metadata ?? {} : {};
    if (meta.delivery !== "physical") continue; // les PDF suivent le flux de téléchargement
    const config = CATALOGUE_PRINTFUL[meta.slug]?.couleurs?.[meta.couleur];
    const variante = config?.variantes?.[meta.taille];
    if (!variante) throw Object.assign(new Error(`Variante Printful inconnue : ${meta.slug} ${meta.couleur} ${meta.taille}`), { status: 500 });
    const catalogue = CATALOGUE_PRINTFUL[meta.slug];
    articles.push({
      variant_id: variante,
      quantity: ligne.quantity,
      name: produit.name,
      files: [{ type: catalogue.emplacement, ...fichier(env, config.fichier, brouillon), position: catalogue.position }],
      options: [{ id: catalogue.optionFils, value: config.fils }],
    });
  }
  return articles;
}

/** Adresse de livraison saisie dans Stripe Checkout. Nom, adresse, et e-mail seulement pour le suivi du colis. */
function destinataire(session) {
  const livraison = session.collected_information?.shipping_details ?? session.shipping_details;
  const adresse = livraison?.address;
  if (!adresse?.line1 || !adresse.country) throw Object.assign(new Error("Adresse de livraison absente"), { status: 500 });
  return {
    name: livraison.name,
    address1: adresse.line1,
    address2: adresse.line2 || undefined,
    city: adresse.city,
    state_code: adresse.state || undefined,
    country_code: adresse.country,
    zip: adresse.postal_code,
    email: session.customer_details?.email || undefined,
  };
}

/**
 * Crée la commande Printful de la session (articles physiques seulement), une seule fois.
 * Renvoie { statut: "creee" | "existante" | "aucun", id, externalId, brouillon }.
 */
export async function creerCommandePrintful(env, session) {
  const ext = await externalId(session.id);
  // Sans doublon : si Printful connaît déjà cet identifiant, on ne recrée rien.
  try {
    const existante = await printful(env, "GET", `/orders/@${ext}`);
    if (existante?.id) return { statut: "existante", id: existante.id, externalId: ext, brouillon: existante.status === "draft" };
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  const confirmer = confirmationAutorisee(env, session);
  const items = articlesPrintful(env, session, !confirmer);
  if (items.length === 0) return { statut: "aucun", externalId: ext };
  let commande;
  try {
    commande = await printful(env, "POST", `/orders?confirm=${confirmer ? "true" : "false"}`, {
      external_id: ext,
      shipping: "STANDARD",
      recipient: destinataire(session),
      items,
    });
  } catch (error) {
    // Printful peut répondre « already exists » alors que la commande vient d'être enregistrée
    // (événement reçu deux fois en même temps, ou réponse tardive) : on relit la commande, sans en créer une autre.
    if (!/already exists/i.test(error.message)) throw error;
    const existante = await printful(env, "GET", `/orders/@${ext}`);
    return { statut: "existante", id: existante.id, externalId: ext, brouillon: existante.status === "draft" };
  }
  return { statut: "creee", id: commande.id, externalId: ext, brouillon: commande.status === "draft" };
}
