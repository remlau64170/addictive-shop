/**
 * Jour J, Stripe en mode RÉEL, en une seule commande :
 *   1. demande la clé secrète live (rien ne s'affiche à l'écran, rien n'est écrit dans un fichier) ;
 *   2. crée les 5 produits à l'identique du mode test (même identifiant, nom, prix, métadonnées) ;
 *   3. crée le webhook live vers https://shop.addictive-app.com/api/webhook ;
 *   4. enregistre la clé et le secret du webhook dans Cloudflare (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET).
 *
 *   npm run stripe:ouvrir
 *
 * Sans danger si on le relance : les produits déjà présents sont laissés tels quels ; si le webhook existe déjà,
 * son secret ne peut pas être relu, le script le signale et n'en crée pas un second.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PROJET = "addictive-shop";
const URL_WEBHOOK = "https://shop.addictive-app.com/api/webhook";
const EVENEMENTS = ["checkout.session.completed", "checkout.session.async_payment_succeeded"];
const SLUGS = ["sors-de-ton-addiction", "aiguise-ton-mental", "ose-ton-projet", "pack-serie-60", "t-shirt-sois-addict"];

const vars = Object.fromEntries(
  readFileSync(resolve(ROOT, ".dev.vars"), "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]),
);
const cleTest = vars.STRIPE_SECRET_KEY;
if (!/^(sk|rk)_test_/.test(cleTest ?? "")) throw new Error("Clé de test absente de .dev.vars : elle sert de modèle pour les produits.");

async function stripe(cle, methode, chemin, corps) {
  const r = await fetch(`https://api.stripe.com/v1${chemin}`, {
    method: methode,
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: corps ? new URLSearchParams(corps) : undefined,
  });
  return { statut: r.status, j: await r.json() };
}

/** Saisie masquée : aucun caractère n'est affiché. */
function demanderSecret(question) {
  return new Promise((ok) => {
    process.stdout.write(question);
    const entree = process.stdin;
    let valeur = "";
    entree.setRawMode?.(true);
    entree.resume();
    entree.setEncoding("utf8");
    const lire = (morceau) => {
      for (const c of morceau) {
        if (c === "\r" || c === "\n") {
          entree.setRawMode?.(false);
          entree.pause();
          entree.off("data", lire);
          process.stdout.write("\n");
          return ok(valeur.trim());
        }
        if (c === "\u0003") process.exit(1);
        if (c === "\u007f" || c === "\b") valeur = valeur.slice(0, -1);
        else valeur += c;
      }
    };
    entree.on("data", lire);
  });
}

function secretCloudflare(nom, valeur) {
  const r = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["wrangler", "pages", "secret", "put", nom, "--project-name", PROJET], {
    cwd: ROOT, input: valeur, encoding: "utf8", shell: process.platform === "win32",
  });
  const sortie = `${r.stdout}${r.stderr}`.split(valeur).join("…");
  const reussi = /Success|Uploaded/i.test(sortie);
  console.log(`  ${nom} : ${reussi ? "enregistré dans Cloudflare" : "ERREUR, voir ci-dessous"}`);
  if (!reussi) console.log(sortie.slice(-400));
  return reussi;
}

// Modèles : les produits du mode test.
const modeles = [];
for (const slug of SLUGS) {
  const { statut, j } = await stripe(cleTest, "GET", `/products/${slug}?expand[]=default_price`);
  if (statut !== 200 || !j.active) throw new Error(`Produit de test introuvable ou inactif : ${slug}`);
  modeles.push({ id: j.id, name: j.name, metadata: j.metadata, montant: j.default_price.unit_amount, devise: j.default_price.currency });
}

console.log("Ouverture Stripe en mode réel. Collez la clé secrète LIVE (sk_live_…) puis Entrée : rien ne s'affiche, c'est normal.\n");
const cle = await demanderSecret("Clé secrète live : ");
if (!/^sk_live_/.test(cle)) {
  console.log("Ce n'est pas une clé secrète live (elle commence par sk_live_). Rien n'a été fait.");
  process.exit(1);
}
const compte = await stripe(cle, "GET", "/account");
if (compte.statut !== 200) {
  console.log(`Clé refusée par Stripe : ${compte.j.error?.message ?? compte.statut}. Rien n'a été fait.`);
  process.exit(1);
}
console.log(`Compte Stripe : ${compte.j.settings?.dashboard?.display_name ?? compte.j.business_profile?.name ?? "(sans nom)"}, paiements ${compte.j.charges_enabled ? "activés" : "PAS ENCORE ACTIVÉS"}.\n`);

console.log("1. Produits");
for (const m of modeles) {
  const existe = await stripe(cle, "GET", `/products/${m.id}`);
  if (existe.statut === 200) {
    console.log(`  déjà présent : ${m.id}`);
    continue;
  }
  const corps = { id: m.id, name: m.name, "default_price_data[currency]": m.devise, "default_price_data[unit_amount]": String(m.montant) };
  for (const [k, v] of Object.entries(m.metadata)) corps[`metadata[${k}]`] = v;
  const cree = await stripe(cle, "POST", "/products", corps);
  console.log(cree.statut === 200 ? `  créé : ${m.id} (${(m.montant / 100).toFixed(2).replace(".", ",")} €)` : `  ERREUR ${m.id} : ${cree.j.error?.message}`);
}

console.log("\n2. Webhook");
const liste = await stripe(cle, "GET", "/webhook_endpoints?limit=100");
const existant = (liste.j.data ?? []).find((w) => w.url === URL_WEBHOOK);
let secretWebhook = null;
if (existant) {
  console.log(`  un webhook existe déjà vers ${URL_WEBHOOK} : son secret ne peut pas être relu, aucun nouveau n'est créé.`);
} else {
  const corps = { url: URL_WEBHOOK, description: "Boutique Addictive : livres et commandes Printful" };
  EVENEMENTS.forEach((e, i) => (corps[`enabled_events[${i}]`] = e));
  const cree = await stripe(cle, "POST", "/webhook_endpoints", corps);
  if (cree.statut === 200) {
    secretWebhook = cree.j.secret;
    console.log(`  créé vers ${URL_WEBHOOK} (${EVENEMENTS.join(", ")})`);
  } else console.log(`  ERREUR : ${cree.j.error?.message}`);
}

console.log("\n3. Secrets Cloudflare");
secretCloudflare("STRIPE_SECRET_KEY", cle);
if (secretWebhook) secretCloudflare("STRIPE_WEBHOOK_SECRET", secretWebhook);
console.log("\nTerminé. Vous pouvez fermer ce terminal ou le laisser ouvert.");
