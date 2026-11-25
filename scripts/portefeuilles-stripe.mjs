/**
 * Apple Pay et Google Pay activés, Link désactivé, sur la configuration de moyens de paiement PAR DÉFAUT du compte Stripe.
 * Le site n'autorise que la carte : Apple Pay et Google Pay passent par la carte et s'affichent sur les appareils
 * compatibles, à condition d'être activés ici.
 *
 *   Mode réel (la clé live est demandée, jamais affichée ni enregistrée) :
 *     node scripts/portefeuilles-stripe.mjs
 *   Mode test (clé de .dev.vars) :
 *     node scripts/portefeuilles-stripe.mjs --test
 *
 * Droit nécessaire pour une clé limitée : « Payment Method Configurations » en écriture.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const TEST = process.argv.includes("--test");

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

const DROIT = "« Payment Method Configurations » : Écriture (Stripe > Développeurs > Clés API > votre clé > Modifier)";
const etat = (c, nom) => `${c[nom]?.display_preference?.value ?? "?"} (choix : ${c[nom]?.display_preference?.preference ?? "?"}${c[nom]?.available === false ? ", indisponible sur ce compte" : ""})`;

let cle;
if (TEST) {
  const vars = Object.fromEntries(readFileSync(resolve(ROOT, ".dev.vars"), "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
  cle = vars.STRIPE_SECRET_KEY;
  if (!/^(sk|rk)_test_/.test(cle ?? "")) throw new Error("Clé de test absente de .dev.vars.");
  console.log("Mode TEST (clé de .dev.vars).\n");
} else {
  console.log("Mode RÉEL. Collez la clé live (rk_live_… ou sk_live_…) puis Entrée : rien ne s'affiche, c'est normal.");
  cle = await demanderSecret("Clé live : ");
  if (!/^(sk|rk)_live_/.test(cle)) {
    console.log("Ce n'est pas une clé live. Rien n'a été modifié.");
    process.exit(1);
  }
}

const liste = await stripe(cle, "GET", "/payment_method_configurations?limit=20");
if (liste.statut === 401) {
  console.log("Clé refusée par Stripe. Rien n'a été modifié.");
  process.exit(1);
}
if (liste.statut === 403) {
  console.log(`Droit manquant sur la clé limitée : ${DROIT}. Ajoutez-le, puis relancez. Rien n'a été modifié.`);
  process.exit(1);
}
if (liste.statut !== 200) {
  console.log(`Lecture impossible : ${liste.j.error?.message ?? liste.statut}. Rien n'a été modifié.`);
  process.exit(1);
}
const config = liste.j.data.find((c) => c.is_default) ?? liste.j.data.find((c) => !c.parent);
if (!config) {
  console.log("Aucune configuration par défaut trouvée. Rien n'a été modifié.");
  process.exit(1);
}
console.log(`Configuration « ${config.name} » (par défaut)`);
const resume = (c) => `carte ${etat(c, "card")}, Apple Pay ${etat(c, "apple_pay")}, Google Pay ${etat(c, "google_pay")}, Link ${etat(c, "link")}`;
console.log(`  avant : ${resume(config)}`);

// Carte, Apple Pay et Google Pay activés ; Link désactivé (ni moyen de paiement, ni « Enregistrer mes informations »).
const voulu = { card: "on", apple_pay: "on", google_pay: "on", link: "off" };
const aChanger = Object.entries(voulu).filter(([m, v]) => config[m]?.display_preference?.preference !== v);
if (aChanger.length > 0) {
  const corps = Object.fromEntries(aChanger.map(([m, v]) => [`${m}[display_preference][preference]`, v]));
  const r = await stripe(cle, "POST", `/payment_method_configurations/${config.id}`, corps);
  if (r.statut === 403) {
    console.log(`Droit manquant pour modifier : ${DROIT}. Ajoutez-le, puis relancez.`);
    process.exit(1);
  }
  if (r.statut !== 200) {
    console.log(`Modification refusée : ${r.j.error?.message ?? r.statut}`);
    process.exit(1);
  }
  console.log(`  après : ${resume(r.j)}`);
  const ecarts = Object.entries(voulu).filter(([m, v]) => r.j[m]?.display_preference?.value !== v);
  if (ecarts.length > 0) console.log(`  ATTENTION : Stripe n'applique pas encore ${ecarts.map(([m]) => m).join(", ")} (voir le détail ci-dessus).`);
} else console.log("  Carte, Apple Pay et Google Pay activés, Link désactivé : rien à modifier.");
console.log("\nTerminé. Vous pouvez fermer cette fenêtre.");
