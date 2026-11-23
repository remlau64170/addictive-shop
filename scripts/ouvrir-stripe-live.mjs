/**
 * Jour J, Stripe en mode RÉEL, en une seule commande (PowerShell, dans le dossier de la boutique) :
 *
 *   node scripts/ouvrir-stripe-live.mjs
 *
 *   0. vérifie la connexion de wrangler à Cloudflare (et ouvre la page de connexion si elle a expiré) ;
 *   1. demande la clé live (rk_live_… ou sk_live_… ; rien ne s'affiche, rien n'est écrit dans un fichier) ;
 *   2. produits : réutilise ceux qui existent déjà en live, crée les manquants à l'identique du mode test ;
 *   3. doublons : archive les produits en double (même nom, autre identifiant) et les prix en trop ;
 *   4. webhook : supprime l'ancien vers la même adresse puis le recrée, pour obtenir un secret neuf ;
 *   5. enregistre la clé et le secret du webhook dans Cloudflare (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET).
 *
 * Peut être relancé sans risque : aucun doublon n'est créé.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PROJET = "addictive-shop";
const URL_WEBHOOK = "https://shop.addictive-app.com/api/webhook";
const EVENEMENTS = ["checkout.session.completed", "checkout.session.async_payment_succeeded"];
const SLUGS = ["sors-de-ton-addiction", "aiguise-ton-mental", "ose-ton-projet", "pack-serie-60", "t-shirt-sois-addict"];
const WINDOWS = process.platform === "win32";
const NPX = WINDOWS ? "npx.cmd" : "npx";
/** Essai sur le compte de TEST (clé de .dev.vars) : produits et doublons seulement, sans webhook ni Cloudflare. */
const ESSAI = process.argv.includes("--essai-test");

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

/** wrangler, sortie capturée (les valeurs secrètes éventuelles sont masquées). */
function wrangler(args, { entree, masquer } = {}) {
  const r = spawnSync(NPX, ["wrangler", ...args], { cwd: ROOT, input: entree ?? "", encoding: "utf8", shell: WINDOWS });
  let sortie = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  for (const m of masquer ?? []) if (m) sortie = sortie.split(m).join("…");
  return { code: r.status, sortie };
}

const connecte = () => /You are logged in/i.test(wrangler(["whoami"]).sortie);

/** Connexion Cloudflare : si wrangler n'est pas connecté (ou si la connexion a expiré), ouvre la page de connexion. */
function verifierCloudflare() {
  if (connecte()) return true;
  console.log("wrangler n'est pas connecté à Cloudflare : une page de connexion va s'ouvrir dans le navigateur.");
  console.log("Connectez-vous au compte qui contient addictive-app.com, cliquez sur « Allow », puis revenez ici.\n");
  spawnSync(NPX, ["wrangler", "login"], { cwd: ROOT, stdio: "inherit", shell: WINDOWS });
  return connecte();
}

function secretCloudflare(nom, valeur) {
  const { sortie } = wrangler(["pages", "secret", "put", nom, "--project-name", PROJET], { entree: valeur, masquer: [valeur] });
  const reussi = /Success|Uploaded/i.test(sortie);
  console.log(`  ${nom} : ${reussi ? "enregistré dans Cloudflare" : "ERREUR, voir ci-dessous"}`);
  if (!reussi) console.log(sortie.slice(-500));
  return reussi;
}

const euros = (centimes) => `${(centimes / 100).toFixed(2).replace(".", ",")} €`;
const arreter = (message) => {
  console.log(`\n${message}`);
  console.log("Rien n'a été enregistré dans Cloudflare. Corrigez, puis relancez la même commande : elle ne crée aucun doublon.");
  process.exit(1);
};

// 0. Cloudflare d'abord : inutile de toucher à Stripe si les secrets ne pourront pas être enregistrés.
if (ESSAI) console.log("ESSAI sur le compte de test : rien n'est envoyé à Cloudflare, le webhook n'est pas touché.\n");
else {
  console.log("0. Connexion à Cloudflare");
  if (!verifierCloudflare()) arreter("La connexion de wrangler à Cloudflare n'a pas abouti.");
  console.log("  connecté\n");
}

// Modèles : les produits du mode test.
const modeles = [];
for (const slug of SLUGS) {
  const { statut, j } = await stripe(cleTest, "GET", `/products/${slug}?expand[]=default_price`);
  if (statut !== 200 || !j.active) throw new Error(`Produit de test introuvable ou inactif : ${slug}`);
  modeles.push({ id: j.id, name: j.name, metadata: j.metadata, montant: j.default_price.unit_amount, devise: j.default_price.currency });
}

if (!ESSAI) console.log("Collez la clé LIVE (rk_live_… ou sk_live_…) puis Entrée : rien ne s'affiche, c'est normal.");
const cle = ESSAI ? cleTest : await demanderSecret("Clé live : ");
if (!ESSAI && !/^(sk|rk)_live_/.test(cle)) arreter("Ce n'est pas une clé live (elle commence par rk_live_ ou sk_live_).");
const essai = await stripe(cle, "GET", "/products?limit=1");
if (essai.statut === 401) arreter("Clé refusée par Stripe (clé inconnue ou révoquée).");
if (essai.statut === 403) arreter("Cette clé limitée n'a pas le droit de lire les produits (droits : docs/ouverture-paiements.md).");
console.log("  clé live acceptée\n");

let erreurs = 0;

// 1. Produits : réutilisés s'ils existent, sinon créés. Rien n'est modifié sans le dire.
console.log("1. Produits");
for (const m of modeles) {
  const existe = await stripe(cle, "GET", `/products/${m.id}?expand[]=default_price`);
  if (existe.statut === 200) {
    const p = existe.j;
    const prix = p.default_price?.unit_amount;
    const conforme = p.active && p.name === m.name && prix === m.montant && p.default_price?.currency === m.devise && p.default_price?.active;
    console.log(`  ${conforme ? "réutilisé" : "À VÉRIFIER"} : ${m.id} – « ${p.name} », ${prix !== undefined ? euros(prix) : "sans prix"}${p.active ? "" : ", archivé"}`);
    if (!conforme) erreurs++;
    continue;
  }
  const corps = { id: m.id, name: m.name, "default_price_data[currency]": m.devise, "default_price_data[unit_amount]": String(m.montant) };
  for (const [k, v] of Object.entries(m.metadata)) corps[`metadata[${k}]`] = v;
  const cree = await stripe(cle, "POST", "/products", corps);
  console.log(cree.statut === 200 ? `  créé : ${m.id} – « ${m.name} », ${euros(m.montant)}` : `  ERREUR ${m.id} : ${cree.j.error?.message}`);
  if (cree.statut !== 200) erreurs++;
}
if (erreurs > 0) arreter("Des produits sont à vérifier ou n'ont pas pu être créés (souvent un droit manquant sur la clé limitée).");

// 2. Doublons : produits actifs portant le même nom qu'un des nôtres sous un autre identifiant, et prix actifs en trop.
console.log("\n2. Doublons");
let nettoyes = 0;
const tous = await stripe(cle, "GET", "/products?limit=100&active=true");
if (tous.statut !== 200) arreter(`Liste des produits illisible (${tous.j.error?.message ?? tous.statut}).`);
const noms = new Map(modeles.map((m) => [m.name, m.id]));
for (const p of tous.j.data) {
  if (noms.has(p.name) && p.id !== noms.get(p.name)) {
    const r = await stripe(cle, "POST", `/products/${p.id}`, { active: "false" });
    console.log(r.statut === 200 ? `  produit en double archivé : « ${p.name} » (${p.id})` : `  ERREUR en archivant ${p.id} : ${r.j.error?.message}`);
    if (r.statut === 200) nettoyes++;
    else erreurs++;
  }
}
for (const m of modeles) {
  const produit = await stripe(cle, "GET", `/products/${m.id}`);
  const prixParDefaut = produit.j.default_price;
  const prix = await stripe(cle, "GET", `/prices?product=${m.id}&active=true&limit=100`);
  if (prix.statut !== 200) {
    console.log(`  ERREUR : prix de ${m.id} illisibles (${prix.j.error?.message ?? prix.statut})`);
    erreurs++;
    continue;
  }
  for (const p of prix.j.data.filter((x) => x.id !== prixParDefaut)) {
    const r = await stripe(cle, "POST", `/prices/${p.id}`, { active: "false" });
    console.log(r.statut === 200 ? `  prix en trop désactivé : ${m.id}, ${euros(p.unit_amount)} (${p.id})` : `  ERREUR en désactivant ${p.id} : ${r.j.error?.message}`);
    if (r.statut === 200) nettoyes++;
    else erreurs++;
  }
}
console.log(nettoyes === 0 && erreurs === 0 ? "  aucun doublon" : `  ${nettoyes} élément(s) nettoyé(s)`);
if (erreurs > 0) arreter("Le contrôle des doublons n'a pas abouti.");

// 3. Webhook : l'ancien vers la même adresse est supprimé, puis recréé (son secret n'est lisible qu'à la création).
if (ESSAI) {
  const l = await stripe(cle, "GET", "/webhook_endpoints?limit=100");
  console.log(`\n3. Webhook (simulé) : ${l.j.data?.filter((x) => x.url === URL_WEBHOOK).length ?? "?"} existant(s) vers ${URL_WEBHOOK} serai(en)t supprimé(s), puis un nouveau créé.`);
  console.log("\nEssai terminé.");
  process.exit(0);
}
console.log("\n3. Webhook");
const liste = await stripe(cle, "GET", "/webhook_endpoints?limit=100");
if (liste.statut !== 200) arreter(`Liste des webhooks illisible (${liste.j.error?.message ?? liste.statut}).`);
for (const w of liste.j.data.filter((x) => x.url === URL_WEBHOOK)) {
  const r = await stripe(cle, "DELETE", `/webhook_endpoints/${w.id}`);
  console.log(r.statut === 200 ? `  ancien webhook supprimé (${w.id})` : `  ERREUR en supprimant ${w.id} : ${r.j.error?.message}`);
  if (r.statut !== 200) arreter("L'ancien webhook n'a pas pu être supprimé.");
}
const corps = { url: URL_WEBHOOK, description: "Boutique Addictive : livres et commandes Printful" };
EVENEMENTS.forEach((e, i) => (corps[`enabled_events[${i}]`] = e));
const cree = await stripe(cle, "POST", "/webhook_endpoints", corps);
if (cree.statut !== 200) arreter(`Le webhook n'a pas pu être créé : ${cree.j.error?.message}`);
const secretWebhook = cree.j.secret;
console.log(`  créé vers ${URL_WEBHOOK} (${EVENEMENTS.join(", ")})`);

// 4. Secrets Cloudflare (connexion vérifiée à l'étape 0).
console.log("\n4. Secrets Cloudflare");
const ok1 = secretCloudflare("STRIPE_SECRET_KEY", cle);
const ok2 = secretCloudflare("STRIPE_WEBHOOK_SECRET", secretWebhook);
if (!ok1 || !ok2) {
  console.log("\nUn secret n'a pas été enregistré. Relancez la même commande : le webhook sera recréé avec un secret neuf.");
  process.exit(1);
}
console.log("\nTerminé : tout est en place. Vous pouvez fermer cette fenêtre.");
