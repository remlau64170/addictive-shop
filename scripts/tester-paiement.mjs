/**
 * Contrôles automatiques du paiement en local (serveur « npm run paiement:local » démarré sur http://localhost:8788).
 * Webhook (signature, rejeu, doublon), liens de téléchargement (valide, réutilisé, expiré, falsifié), entrées invalides.
 * Les secrets sont lus dans .dev.vars et ne sont jamais affichés. Usage : npm run paiement:tester [-- --session=cs_test_…]
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { hmacSha256, signToken } from "../functions/_lib/stripe.js";
import { CONSENTEMENT_RETRACTATION, CONSENTEMENT_RETRACTATION_MIXTE } from "../src/data/consentement.js";

const BASE = process.env.BASE_URL ?? "http://localhost:8788";
const racine = resolve(import.meta.dirname, "..");
const vars = Object.fromEntries(
  readFileSync(join(racine, ".dev.vars"), "utf8")
    .split(/\r?\n/)
    .filter((ligne) => ligne.includes("=") && !ligne.trim().startsWith("#"))
    .map((ligne) => [ligne.slice(0, ligne.indexOf("=")).trim(), ligne.slice(ligne.indexOf("=") + 1).trim()]),
);
const session = process.argv.find((arg) => arg.startsWith("--session="))?.slice(10);

let echecs = 0;
const verifier = (nom, ok, detail = "") => {
  console.log(`${ok ? "OK " : "NON"}  ${nom}${detail ? ` (${detail})` : ""}`);
  if (!ok) echecs += 1;
};

async function webhook(evenement, { secret = vars.STRIPE_WEBHOOK_SECRET, decalage = 0 } = {}) {
  const corps = JSON.stringify(evenement);
  const t = Math.floor(Date.now() / 1000) - decalage;
  const signature = await hmacSha256(secret, `${t}.${corps}`);
  return fetch(`${BASE}/api/webhook`, { method: "POST", headers: { "Stripe-Signature": `t=${t},v1=${signature}` }, body: corps });
}

const evenement = (id) => ({
  id,
  object: "event",
  type: "checkout.session.completed",
  livemode: false,
  data: { object: { id: "cs_test_essai", object: "checkout.session", payment_status: "paid", metadata: { slug: "serie-30", delivery: "digital" } } },
});

// 1. Webhook
const id = `evt_essai_${Date.now()}`;
let r = await webhook(evenement(id));
verifier("webhook signé accepté", r.status === 200 && (await r.text()) === "OK", r.status);
r = await webhook(evenement(id));
verifier("même événement reçu deux fois : traité une seule fois", r.status === 200 && (await r.text()) === "Déjà reçu.");
r = await webhook(evenement(`${id}_b`), { secret: "whsec_faux" });
verifier("webhook avec une mauvaise signature refusé", r.status === 400, r.status);
r = await webhook(evenement(`${id}_c`), { decalage: 600 });
verifier("webhook trop ancien (rejeu) refusé", r.status === 400, r.status);
r = await fetch(`${BASE}/api/webhook`, { method: "POST", body: "{}" });
verifier("webhook sans signature refusé", r.status === 400, r.status);

// 2. Liens de téléchargement
const jeton = (exp, j = crypto.randomUUID()) => signToken(vars.DOWNLOAD_SIGNING_SECRET, { s: "cs_test_essai", p: "serie-30", j, exp });
const lien = async (token) => fetch(`${BASE}/api/telecharger?token=${encodeURIComponent(token)}`);
const valide = await jeton(Date.now() + 60_000);
r = await lien(valide);
const pdf = Buffer.from(await r.arrayBuffer());
verifier("lien valide : PDF envoyé", r.status === 200 && r.headers.get("content-type") === "application/pdf" && pdf.subarray(0, 5).toString() === "%PDF-", r.status);
verifier("PDF en pièce jointe, sans cache", /attachment/.test(r.headers.get("content-disposition") ?? "") && /no-store/.test(r.headers.get("cache-control") ?? ""));
r = await lien(valide);
verifier("même lien réutilisé : refusé", r.status === 410, r.status);
r = await lien(await jeton(Date.now() - 1000));
verifier("lien expiré : refusé", r.status === 410, r.status);
r = await lien(`${valide.split(".")[0]}.${"0".repeat(64)}`);
verifier("lien falsifié : refusé", r.status === 403, r.status);
r = await lien("");
verifier("lien vide : refusé", r.status === 403, r.status);

// 3. Les PDF ne sont accessibles par aucune adresse publique
for (const chemin of ["/prive/exemples/serie-30.pdf", "/serie-30.pdf", "/pdf/serie-30.pdf", "/exemples/serie-30.pdf"]) {
  r = await fetch(`${BASE}${chemin}`);
  const type = r.headers.get("content-type") ?? "";
  verifier(`aucun PDF à l'adresse ${chemin}`, !type.includes("pdf"), `${r.status} ${type.split(";")[0]}`);
}

// 4. Entrées invalides
r = await fetch(`${BASE}/api/commande?session_id=nimporte-quoi`);
verifier("commande : identifiant de session invalide refusé", r.status === 400, r.status);
r = await fetch(`${BASE}/api/checkout`, { method: "POST", body: new URLSearchParams({ produit: "../etc" }), redirect: "manual" });
verifier("paiement : produit invalide refusé", r.status === 303 && /paiement=invalide/.test(r.headers.get("location") ?? ""), r.status);

// 4 bis. Case « Accès dès le paiement »
r = await fetch(`${BASE}/api/checkout`, { method: "POST", body: new URLSearchParams({ produit: "serie-30" }), redirect: "manual" });
verifier("paiement sans la case cochée : refusé", r.status === 303 && /paiement=consentement/.test(r.headers.get("location") ?? ""), r.headers.get("location"));
r = await fetch(`${BASE}/api/checkout`, { method: "POST", body: new URLSearchParams({ produit: "serie-30", consentement: "oui" }), redirect: "manual" });
const versStripe = r.headers.get("location") ?? "";
verifier("paiement avec la case cochée : page Stripe", r.status === 303 && versStripe.startsWith("https://checkout.stripe.com/"), r.status);
const idSession = versStripe.match(/cs_test_[A-Za-z0-9]+/)?.[0];
if (idSession && vars.STRIPE_SECRET_KEY) {
  const lire = (chemin) => fetch(`https://api.stripe.com/v1${chemin}`, { headers: { Authorization: `Bearer ${vars.STRIPE_SECRET_KEY}` } }).then((x) => x.json());
  const s = await lire(`/checkout/sessions/${idSession}`);
  verifier("preuve dans Stripe : formulation exacte de la case", s.metadata?.consentement_retractation === CONSENTEMENT_RETRACTATION);
  verifier("preuve dans Stripe : date de l'accord", !Number.isNaN(Date.parse(s.metadata?.consentement_date ?? "")));
  verifier("facture créée par Checkout (invoice_creation)", s.invoice_creation?.enabled === true);
  const pied = s.invoice_creation?.invoice_data?.footer ?? "";
  verifier("pied de facture : phrase exacte de la case", pied.includes(`« ${CONSENTEMENT_RETRACTATION} »`));
  verifier("pied de facture : date et heure de l'accord", /le \d{1,2} \S+ \d{4} à \d{2}:\d{2} \(heure de Paris\)/.test(pied), pied.match(/le .*?\(heure de Paris\)/)?.[0]);
  verifier("pied de facture : mention de TVA", pied.includes("TVA non applicable, art. 293 B du CGI"));
  await fetch(`https://api.stripe.com/v1/checkout/sessions/${idSession}/expire`, { method: "POST", headers: { Authorization: `Bearer ${vars.STRIPE_SECRET_KEY}` } });
}

// 4 ter. Panier : t-shirt seul, t-shirt + PDF, PDF seul, gourde (pas en vente)
const sessionDe = async (panier, consentement) => {
  const corps = new URLSearchParams({ panier: JSON.stringify(panier) });
  if (consentement) corps.set("consentement", "oui");
  const rep = await fetch(`${BASE}/api/checkout`, { method: "POST", body: corps, redirect: "manual" });
  const id = (rep.headers.get("location") ?? "").match(/cs_test_[A-Za-z0-9]+/)?.[0];
  if (!id) return { rep };
  const s = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}?expand[]=shipping_options.shipping_rate&expand[]=line_items`, { headers: { Authorization: `Bearer ${vars.STRIPE_SECRET_KEY}` } }).then((x) => x.json());
  await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}/expire`, { method: "POST", headers: { Authorization: `Bearer ${vars.STRIPE_SECRET_KEY}` } });
  return { rep, s };
};
const tshirt = { id: "t-shirt-sois-addict", couleur: "noir", taille: "M", quantite: 1 };
if (vars.STRIPE_SECRET_KEY) {
  let { s } = await sessionDe([tshirt]);
  const port = (x) => x?.shipping_options?.[0]?.shipping_amount;
  verifier("t-shirt seul : livraison 4,90 €", port(s) === 490, port(s));
  verifier("t-shirt seul : adresse obligatoire, Suisse exclue", (s?.shipping_address_collection?.allowed_countries ?? []).length === 8 && !s.shipping_address_collection.allowed_countries.includes("CH"), s?.shipping_address_collection?.allowed_countries?.join(","));
  verifier("t-shirt seul : 29 € et variante dans le nom", s?.line_items?.data?.[0]?.amount_total === 2900 && /Noir, taille M/.test(s?.line_items?.data?.[0]?.description ?? ""), s?.line_items?.data?.[0]?.description);
  verifier("t-shirt seul : pas de case, mention des 14 jours", !s?.metadata?.consentement_retractation && /14 jours/.test(s?.invoice_creation?.invoice_data?.footer ?? ""));

  ({ s } = await sessionDe([tshirt, { id: "serie-30", quantite: 1 }], true));
  verifier("t-shirt + PDF : livraison offerte (0 €)", port(s) === 0, port(s));
  verifier("t-shirt + PDF : accord limité aux contenus numériques", s?.metadata?.consentement_retractation === CONSENTEMENT_RETRACTATION_MIXTE);
  verifier("t-shirt + PDF : facture avec l'accord et les 14 jours", (s?.invoice_creation?.invoice_data?.footer ?? "").includes(CONSENTEMENT_RETRACTATION_MIXTE) && /14 jours/.test(s?.invoice_creation?.invoice_data?.footer ?? ""));
  const mixteSansCase = await fetch(`${BASE}/api/checkout`, { method: "POST", body: new URLSearchParams({ panier: JSON.stringify([tshirt, { id: "serie-30", quantite: 1 }]) }), redirect: "manual" });
  verifier("t-shirt + PDF sans la case : refusé", /paiement=consentement/.test(mixteSansCase.headers.get("location") ?? ""));

  ({ s } = await sessionDe([{ id: "serie-30", quantite: 1 }], true));
  verifier("PDF seul : ni adresse ni livraison", !s?.shipping_address_collection && !(s?.shipping_options ?? []).length);

  const { rep } = await sessionDe([{ id: "gourde-addictive", quantite: 1 }]);
  verifier("gourde (pas en vente) : refusée", /paiement=(invalide|indisponible)/.test(rep.headers.get("location") ?? ""), rep.headers.get("location"));
  const faux = await sessionDe([{ ...tshirt, taille: "XXXXL" }]);
  verifier("taille inconnue : refusée", /paiement=invalide/.test(faux.rep.headers.get("location") ?? ""));
}

// 5. Commande réelle de test (après un paiement avec la carte 4242…)
if (session) {
  r = await fetch(`${BASE}/api/commande?session_id=${session}`);
  const data = await r.json();
  verifier("commande payée : lien remis", r.status === 200 && data.etat === "paye", data.etat);
  if (data.lien) {
    r = await fetch(`${BASE}${data.lien}`);
    verifier("téléchargement depuis la commande payée", r.status === 200 && r.headers.get("content-type") === "application/pdf", r.status);
    r = await fetch(`${BASE}${data.lien}`);
    verifier("lien de la commande réutilisé : refusé", r.status === 410, r.status);
  }
}

console.log(echecs ? `\n${echecs} contrôle(s) en échec.` : "\nTous les contrôles passent.");
process.exitCode = echecs ? 1 : 0;
