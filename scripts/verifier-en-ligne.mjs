/**
 * Vérification du site en ligne (aucune clé nécessaire, rien n'est modifié).
 *   Boutique fermée : node scripts/verifier-en-ligne.mjs
 *   Boutique ouverte : node scripts/verifier-en-ligne.mjs --ouverte
 * Adresse vérifiée : https://shop.addictive-app.com (ou --base=https://…).
 * Avec --ouverte, deux sessions de paiement sont créées puis abandonnées : elles expirent seules après 24 h, sans frais.
 */
const arg = (nom) => process.argv.find((a) => a.startsWith(`--${nom}=`))?.split("=")[1];
const BASE = arg("base") ?? "https://shop.addictive-app.com";
const OUVERTE = process.argv.includes("--ouverte");
let problemes = 0;
const ok = (cond, msg, detail = "") => {
  console.log(`${cond ? "OK  " : "NON "} ${msg}${detail !== "" ? ` (${detail})` : ""}`);
  if (!cond) problemes++;
};
const lire = async (p, options = {}) => {
  const r = await fetch(BASE + p, { redirect: "manual", signal: AbortSignal.timeout(20000), ...options });
  return { r, texte: await r.text() };
};
const html = (t) => t.replaceAll("&#39;", "'").replaceAll("&amp;", "&");

// Pages et référencement
const { texte: sitemap } = await lire("/sitemap.xml");
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
ok(pages.length >= 30, "sitemap lu", `${pages.length} adresses`);
ok(sitemap.includes("https://shop.addictive-app.com/"), "sitemap en https://shop.addictive-app.com");
const erreurs = [];
for (const p of [...pages, "/panier/", "/merci/", "/recherche/", "/robots.txt", "/llms.txt"]) {
  const { r } = await lire(p);
  if (r.status !== 200) erreurs.push(`${p} ${r.status}`);
}
ok(erreurs.length === 0, "toutes les pages répondent 200", erreurs.join(", "));
ok((await lire("/page-qui-n-existe-pas/")).r.status === 404, "page inconnue : 404");
ok((await lire("/robots.txt")).texte.includes("Sitemap: https://shop.addictive-app.com/sitemap.xml"), "robots.txt donne le sitemap");
const accueil = await fetch(BASE + "/");
ok(!accueil.headers.get("set-cookie"), "aucun cookie déposé");

// Pages légales
const mentions = html((await lire("/mentions-legales/")).texte);
const cgv = html((await lire("/cgv/")).texte);
for (const [nom, t] of [["mentions légales", mentions], ["CGV", cgv]]) {
  ok(t.includes("Rémy ALLIOD EI") && t.includes("941 433 369 00027") && t.includes("Registre national des entreprises (RNE)") && t.includes("Immatriculation au RCS en cours"),
    `${nom} : identité, SIRET, RNE, RCS en cours`);
  ok(!t.includes("À COMPLÉTER") && !t.includes("noindex"), `${nom} : complète et indexable`);
}
ok(mentions.includes("101 Townsend"), "mentions légales : hébergeur");
ok(cgv.includes("remboursé sans renvoyer"), "CGV : remboursement sans retour");

// Paiement
const fiche = (await lire("/boutique/ose-ton-projet/")).texte;
const panier = (await lire("/panier/")).texte;
const essais = [
  { nom: "livre", corps: { produit: "sors-de-ton-addiction", consentement: "oui", cgv: "oui" } },
  { nom: "t-shirt", corps: { panier: JSON.stringify([{ id: "t-shirt-sois-addict", couleur: "noir", taille: "M", quantite: 1 }]), cgv: "oui" } },
];
if (OUVERTE) {
  ok(!fiche.includes("La boutique ouvre bientôt"), "fiche : achat possible");
  ok(panier.includes('action="/api/checkout"'), "panier : formulaire de paiement présent");
  const sansCgv = await fetch(`${BASE}/api/checkout`, { method: "POST", body: new URLSearchParams({ produit: "sors-de-ton-addiction", consentement: "oui" }), redirect: "manual" });
  ok(/paiement=cgv/.test(sansCgv.headers.get("location") ?? ""), "paiement sans les CGV : refusé");
  for (const { nom, corps } of essais) {
    const r = await fetch(`${BASE}/api/checkout`, { method: "POST", body: new URLSearchParams(corps), redirect: "manual" });
    ok(r.status === 303 && (r.headers.get("location") ?? "").startsWith("https://checkout.stripe.com/"), `paiement ${nom} : page Stripe`, r.status);
  }
} else {
  ok(fiche.includes("La boutique ouvre bientôt"), "fiche : « La boutique ouvre bientôt »");
  ok(!panier.includes('action="/api/checkout"'), "panier : aucun formulaire de paiement");
  for (const { nom, corps } of essais) {
    const r = await fetch(`${BASE}/api/checkout`, { method: "POST", body: new URLSearchParams(corps), redirect: "manual" });
    const loc = r.headers.get("location") ?? "";
    ok(r.status === 303 && !loc.includes("stripe.com") && /paiement=indisponible/.test(loc), `paiement ${nom} refusé par le serveur`, `${r.status} ${loc.replace(BASE, "")}`);
  }
}

// Aucun fichier privé
for (const p of ["/prive/pdf/ose-ton-projet-A4-v5.pdf", "/pdf/ose-ton-projet-a4.pdf", "/ose-ton-projet-a4.pdf", "/produits/ose-ton-projet-a4.pdf",
  "/prive/broderie/blason-tshirt-noir.png", "/.dev.vars", "/.dev.vars.example", "/wrangler.toml", "/functions/api/checkout.js", "/.git/config"]) {
  const { r, texte } = await lire(p);
  const type = r.headers.get("content-type") ?? "";
  ok(!(r.status === 200 && !type.includes("text/html")) && !texte.startsWith("%PDF") && !texte.includes("STRIPE_SECRET_KEY") && !texte.includes("[core]"), `rien à ${p}`, r.status);
}
for (const p of ["/api/telecharger?token=faux", "/api/commande?session_id=cs_live_faux"]) {
  const { r, texte } = await lire(p);
  ok(r.status >= 400 && !texte.startsWith("%PDF"), `téléchargement refusé sans lien valide : ${p.split("?")[0]}`, r.status);
}

console.log(problemes === 0 ? "\nTout est conforme." : `\n${problemes} point(s) à voir.`);
process.exit(problemes === 0 ? 0 : 1);
