/**
 * Essai du paiement en local, en MODE TEST Stripe : npm run paiement:local
 *  1. contrôle .dev.vars (clés de test seulement, jamais affichées) ;
 *  2. construit le site avec l'achat ACTIVÉ (réglage PUBLIC_BOUTIQUE_OUVERTE=true, valable pour ce seul essai) ;
 *  3. charge les livres (prive/pdf, hors git) dans le stockage privé local ;
 *  4. lance Cloudflare Pages en local (http://localhost:8788) avec les Functions.
 * Le site public, lui, est construit sans ce réglage : le bouton « Acheter » y reste désactivé.
 */
import { spawnSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { LIVRES } from "../src/data/livres.js";

const racine = resolve(import.meta.dirname, "..");
const windows = process.platform === "win32";
const npx = windows ? "npx.cmd" : "npx";
const executer = (commande, args, env = {}) =>
  spawnSync(commande, args, { cwd: racine, stdio: "inherit", shell: windows, env: { ...process.env, ...env } });

const fichier = join(racine, ".dev.vars");
if (!existsSync(fichier)) {
  console.error("Fichier .dev.vars absent. Copiez .dev.vars.example en .dev.vars et renseignez vos clés de TEST.");
  process.exit(1);
}
const vars = Object.fromEntries(
  readFileSync(fichier, "utf8")
    .split(/\r?\n/)
    .filter((ligne) => ligne.includes("=") && !ligne.trim().startsWith("#"))
    .map((ligne) => [ligne.slice(0, ligne.indexOf("=")).trim(), ligne.slice(ligne.indexOf("=") + 1).trim()]),
);
const manquantes = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "DOWNLOAD_SIGNING_SECRET"].filter((nom) => !vars[nom]);
if (manquantes.length) {
  console.error(`Réglages manquants dans .dev.vars : ${manquantes.join(", ")}`);
  process.exit(1);
}
if (!/^(sk|rk)_test_/.test(vars.STRIPE_SECRET_KEY)) {
  console.error("STRIPE_SECRET_KEY n'est pas une clé de TEST (sk_test_…). Arrêt : on ne touche jamais au mode réel.");
  process.exit(1);
}

console.log("1/3 Construction du site (achat activé pour cet essai)…");
if (executer(npx, ["astro", "build"], { PUBLIC_BOUTIQUE_OUVERTE: "true" }).status !== 0) process.exit(1);

console.log("2/3 Chargement des livres (prive/pdf) dans le stockage privé local…");
const dossier = join(racine, "prive", "pdf");
for (const fichier of Object.values(LIVRES).flatMap((l) => l.fichiers)) {
  const chemin = join(dossier, fichier.source);
  if (!existsSync(chemin)) {
    console.error(`PDF manquant : prive/pdf/${fichier.source}`);
    process.exit(1);
  }
  const resultat = executer(npx, ["wrangler", "kv", "key", "put", `pdf:${fichier.cle}`, "--binding=FICHIERS", "--local", `--path=${chemin}`]);
  if (resultat.status !== 0) process.exit(1);
}

console.log("3/3 Démarrage de Cloudflare Pages en local : http://localhost:8788");
const serveur = spawn(npx, ["wrangler", "pages", "dev", "dist", "--port=8788"], { cwd: racine, stdio: "inherit", shell: windows });
serveur.on("exit", (code) => process.exit(code ?? 0));
