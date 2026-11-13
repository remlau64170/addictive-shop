/**
 * Maquettes Printful du t-shirt brodé, puis remplacement des photos de la fiche.
 * À lancer seulement quand les deux fichiers du blason sont dans la bibliothèque Printful et renseignés dans .dev.vars :
 *   PRINTFUL_FICHIER_BLASON_NOIR=id:123456   (ou une adresse https publique du PNG)
 *   PRINTFUL_FICHIER_BLASON_BLANC=id:123457
 * Usage : npm run printful:maquettes
 * Crée seulement des maquettes (aucun produit, aucune commande). Écrit public/produits/tshirt-brode-*.webp
 * (et les vignettes -480) puis met à jour les images et les textes alternatifs de la fiche t-shirt.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { CATALOGUE_PRINTFUL } from "../functions/_lib/printful-catalogue.js";

const racine = resolve(import.meta.dirname, "..");
const vars = Object.fromEntries(
  readFileSync(join(racine, ".dev.vars"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const jeton = vars.PRINTFUL_API_TOKEN;
if (!jeton) throw new Error("PRINTFUL_API_TOKEN absent de .dev.vars");

const api = async (method, chemin, corps, essai = 0) => {
  const r = await fetch(`https://api.printful.com${chemin}`, {
    method,
    headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  // Trop de requêtes : Printful indique combien de secondes attendre ; on attend puis on réessaie (5 fois au plus).
  if (r.status === 429 && essai < 5) {
    const secondes = Number(String(data.result ?? data.error?.message ?? "").match(/(d+) seconds?/)?.[1] ?? 60);
    console.log(`Printful demande d'attendre ${secondes} s…`);
    await new Promise((ok) => setTimeout(ok, (secondes + 2) * 1000));
    return api(method, chemin, corps, essai + 1);
  }
  if (!r.ok) throw new Error(`Printful ${r.status} : ${typeof data.result === "string" ? data.result : data.error?.message ?? ""}`);
  return data.result;
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Adresse du fichier du blason : « id:… » de la bibliothèque Printful, ou adresse https publique.
async function adresseFichier(nomVariable) {
  const valeur = vars[nomVariable];
  if (!valeur) throw new Error(`${nomVariable} n'est pas renseigné dans .dev.vars : déposez d'abord le blason chez Printful.`);
  if (valeur.startsWith("https://")) return valeur;
  if (valeur.startsWith("id:")) {
    const fichier = await api("GET", `/files/${valeur.slice(3)}`);
    console.log(`${nomVariable} : « ${fichier.filename} », ${fichier.width} × ${fichier.height} px, ${fichier.dpi ?? "?"} dpi`);
    return fichier.url ?? fichier.preview_url;
  }
  throw new Error(`${nomVariable} : valeur attendue « id:123456 » ou « https://… »`);
}

const t = CATALOGUE_PRINTFUL["t-shirt-sois-addict"];
// Vues demandées : à plat (face), porté (homme, face), gros plan sur la broderie.
const VUES = [
  { groupe: "Flat", option: "Front", nom: "face" },
  { groupe: "Men's", option: "Front", nom: "porte" },
  { groupe: "Zoomed in", option: "Zoomed-in", nom: "gros-plan" },
];

async function maquettes(couleur) {
  const config = t.couleurs[couleur];
  const image_url = await adresseFichier(config.fichier);
  const tache = await api("POST", `/mockup-generator/create-task/${t.produit}`, {
    variant_ids: [config.variantes.M],
    format: "jpg",
    width: 1600,
    option_groups: [...new Set(VUES.map((v) => v.groupe))],
    options: [...new Set(VUES.map((v) => v.option))],
    files: [{ placement: t.emplacement, image_url, position: t.position }],
    product_options: { [t.optionFils]: config.fils },
  });
  // Printful génère les maquettes en différé : on attend la fin de la tâche.
  for (let essai = 0; essai < 40; essai++) {
    await pause(5000);
    const etat = await api("GET", `/mockup-generator/task?task_key=${encodeURIComponent(tache.task_key)}`);
    if (etat.status === "completed") {
      const toutes = etat.mockups.flatMap((m) => [{ option: m.placement, option_group: "", url: m.mockup_url }, ...(m.extra ?? [])]);
      return VUES.map((vue) => ({ ...vue, couleur, url: toutes.find((x) => x.option_group === vue.groupe && x.option === vue.option)?.url })).filter((v) => v.url);
    }
    if (etat.status === "failed") throw new Error(`Maquettes ${couleur} : ${etat.error ?? "échec de la tâche"}`);
  }
  throw new Error(`Maquettes ${couleur} : délai dépassé`);
}

const resultats = [];
for (const couleur of ["noir", "blanc"]) {
  resultats.push(...(await maquettes(couleur)));
  await pause(15000); // limite de fréquence du générateur de maquettes
}

// Images de la fiche (4 au maximum) : noir à plat, blanc à plat, noir porté (ou blanc porté), gros plan noir.
const choisir = (couleur, nom) => resultats.find((r) => r.couleur === couleur && r.nom === nom);
const selection = [choisir("noir", "face"), choisir("blanc", "face"), choisir("noir", "porte") ?? choisir("blanc", "porte"), choisir("noir", "gros-plan")].filter(Boolean);
if (selection.length < 3) throw new Error(`Seulement ${selection.length} maquettes obtenues : la fiche n'est pas modifiée.`);

const ALT = {
  face: (c) => `T-shirt ${c} brodé côté cœur du logo et du nom Addictive, vu de face`,
  porte: (c) => `T-shirt ${c} brodé Addictive porté, vu de face`,
  "gros-plan": (c) => `Gros plan sur la broderie Addictive du t-shirt ${c} : la flèche, le ruban et le nom`,
};
const images = [];
for (const m of selection) {
  const base = `tshirt-brode-${m.couleur}-${m.nom}`;
  const tampon = Buffer.from(await (await fetch(m.url)).arrayBuffer());
  await sharp(tampon).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(join(racine, "public", "produits", `${base}.webp`));
  await sharp(tampon).resize({ width: 480 }).webp({ quality: 78 }).toFile(join(racine, "public", "produits", `${base}-480.webp`));
  images.push(`  - { src: /produits/${base}.webp, alt: "${ALT[m.nom](m.couleur)}" }`);
}

const fiche = join(racine, "src", "content", "produits", "t-shirt-sois-addict.md");
const texte = readFileSync(fiche, "utf8");
const nouveau = texte.replace(/^images:\n(?:  - .*\n)+/m, `images:\n${images.join("\n")}\n`);
if (nouveau === texte) throw new Error("Bloc « images » introuvable dans la fiche : rien n'est modifié.");
writeFileSync(fiche, nouveau);
console.log(`Fiche mise à jour avec ${images.length} maquettes :\n${images.join("\n")}`);
