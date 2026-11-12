// Outils communs aux Functions de paiement. Rien n'est conservé ici : tout passe par Stripe.

const API = "https://api.stripe.com/v1";

/** Réponse JSON sans mise en cache. */
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** Phase de test : on refuse toute clé qui n'est pas une clé de test, pour ne jamais toucher au mode réel. */
export function stripeKey(env) {
  const key = env.STRIPE_SECRET_KEY ?? "";
  if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_")) {
    throw new Error("Clé Stripe absente ou qui n'est pas une clé de test : le paiement reste désactivé.");
  }
  return key;
}

/** Le paiement n'est possible que si le réglage CHECKOUT_ENABLED vaut « true » (jamais sur le site public pour l'instant). */
export function checkoutEnabled(env) {
  return env.CHECKOUT_ENABLED === "true";
}

/** Convertit un objet imbriqué en champs de formulaire Stripe : { a: { b: 1 }, c: [x] } → a[b]=1, c[0]=x. */
export function toForm(value, prefix = "", out = new URLSearchParams()) {
  if (value === undefined || value === null) return out;
  if (typeof value === "object") {
    for (const [key, inner] of Object.entries(value)) toForm(inner, prefix ? `${prefix}[${key}]` : key, out);
  } else {
    out.append(prefix, String(value));
  }
  return out;
}

export async function stripe(env, path, { method = "GET", body, query } = {}) {
  const url = new URL(`${API}${path}`);
  if (query) for (const [key, value] of toForm(query)) url.searchParams.append(key, value);
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${stripeKey(env)}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: body ? toForm(body).toString() : undefined,
  });
  const data = await response.json();
  if (!response.ok) {
    // On ne garde que le type et le message de Stripe : jamais la clé, jamais de donnée client.
    const error = new Error(data?.error?.message ?? `Erreur Stripe ${response.status}`);
    error.status = response.status;
    error.stripeCode = data?.error?.code;
    throw error;
  }
  return data;
}

const encoder = new TextEncoder();

export const toHex = (buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

export async function hmacSha256(secret, message) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

/** Comparaison en temps constant, pour ne rien laisser deviner par le temps de réponse. */
export function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Vérifie la signature d'un webhook Stripe : en-tête « Stripe-Signature: t=…,v1=… », HMAC-SHA256 de « t.corps ».
 * Le corps doit être le texte brut, tel que reçu. Les envois de plus de 5 minutes sont refusés (rejeu).
 */
export async function verifyWebhook(rawBody, header, secret, now = Date.now()) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    header.split(",").map((item) => {
      const [k, ...rest] = item.split("=");
      return [k.trim(), rest.join("=")];
    }),
  );
  const timestamp = Number(parts.t);
  if (!timestamp || Math.abs(now / 1000 - timestamp) > 300) return false;
  const expected = await hmacSha256(secret, `${timestamp}.${rawBody}`);
  const signatures = header
    .split(",")
    .filter((item) => item.trim().startsWith("v1="))
    .map((item) => item.trim().slice(3));
  return signatures.some((signature) => safeEqual(signature, expected));
}

/** Jeton de téléchargement : « charge.signature ». La charge contient seulement la session, le produit, l'identifiant du jeton et l'expiration. */
const b64 = (text) => btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (text) => atob(text.replace(/-/g, "+").replace(/_/g, "/"));

export async function signToken(secret, payload) {
  const body = b64(JSON.stringify(payload));
  return `${body}.${await hmacSha256(secret, body)}`;
}

export async function readToken(secret, token, now = Date.now()) {
  const [body, signature] = String(token ?? "").split(".");
  if (!body || !signature) return { error: "invalide" };
  if (!safeEqual(signature, await hmacSha256(secret, body))) return { error: "invalide" };
  let payload;
  try {
    payload = JSON.parse(unb64(body));
  } catch {
    return { error: "invalide" };
  }
  if (!payload.exp || now > payload.exp) return { error: "expire" };
  return { payload };
}
