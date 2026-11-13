/**
 * Jour J : recrée en mode RÉEL (live) les produits Stripe de la boutique, à l'identique du mode test :
 * même identifiant (le slug, lu par /api/checkout), même nom, même prix, mêmes métadonnées (delivery, slug, printful_produit).
 *
 *   Essai à blanc (ne crée rien, lit seulement le mode test) :  node scripts/produits-stripe-live.mjs --essai
 *   Création réelle : la clé live est demandée dans le terminal (jamais écrite dans un fichier ni affichée) :
 *     node scripts/produits-stripe-live.mjs
 *
 * Les produits déjà présents en live (même identifiant) sont laissés tels quels. Aucun prix n'est modifié.
 */
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SLUGS = ["sors-de-ton-addiction", "aiguise-ton-mental", "ose-ton-projet", "pack-serie-60", "t-shirt-sois-addict"];
const essai = process.argv.includes("--essai");

const vars = Object.fromEntries(
  readFileSync(resolve(ROOT, ".dev.vars"), "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]),
);
const cleTest = vars.STRIPE_SECRET_KEY;
if (!/^(sk|rk)_test_/.test(cleTest ?? "")) throw new Error("Clé de test absente de .dev.vars (STRIPE_SECRET_KEY).");

async function stripe(cle, methode, chemin, corps) {
  const r = await fetch(`https://api.stripe.com/v1${chemin}`, {
    method: methode,
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: corps ? new URLSearchParams(corps) : undefined,
  });
  const j = await r.json();
  return { statut: r.status, j };
}

function demanderCle() {
  return new Promise((ok) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes("Clé")) process.stdout.write(s); };
    rl.question("Clé secrète Stripe LIVE (sk_live_… ou rk_live_…, rien ne s'affiche) : ", (r) => { rl.close(); process.stdout.write("\n"); ok(r.trim()); });
  });
}

const modeles = [];
for (const slug of SLUGS) {
  const { statut, j } = await stripe(cleTest, "GET", `/products/${slug}?expand[]=default_price`);
  if (statut !== 200 || !j.active) throw new Error(`Produit de test introuvable ou inactif : ${slug}`);
  modeles.push({ id: j.id, name: j.name, metadata: j.metadata, montant: j.default_price.unit_amount, devise: j.default_price.currency });
}
for (const m of modeles) console.log(`${m.id.padEnd(24)} ${String(m.montant / 100).padStart(6)} ${m.devise}  ${m.name}  ${JSON.stringify(m.metadata)}`);
if (essai) {
  console.log("\nEssai à blanc : rien n'a été créé.");
  process.exit(0);
}

const cleLive = await demanderCle();
if (!/^(sk|rk)_live_/.test(cleLive)) throw new Error("Ce n'est pas une clé live : rien n'a été créé.");
for (const m of modeles) {
  const existe = await stripe(cleLive, "GET", `/products/${m.id}`);
  if (existe.statut === 200) {
    console.log(`déjà présent en live : ${m.id}`);
    continue;
  }
  const corps = { id: m.id, name: m.name, "default_price_data[currency]": m.devise, "default_price_data[unit_amount]": String(m.montant) };
  for (const [k, v] of Object.entries(m.metadata)) corps[`metadata[${k}]`] = v;
  const cree = await stripe(cleLive, "POST", "/products", corps);
  console.log(cree.statut === 200 ? `créé en live : ${m.id} (${m.montant / 100} ${m.devise})` : `ERREUR ${m.id} : ${cree.j.error?.message}`);
}
