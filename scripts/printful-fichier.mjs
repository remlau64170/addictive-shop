/**
 * Vérifie un fichier de la bibliothèque Printful à partir de son identifiant (lecture seule, rien n'est créé).
 * Usage : npm run printful:fichier -- 123456
 * Affiche le nom, la taille et la résolution du fichier, et la ligne à copier dans .dev.vars.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const racine = resolve(import.meta.dirname, "..");
const jeton = (readFileSync(join(racine, ".dev.vars"), "utf8").match(/^PRINTFUL_API_TOKEN=(.*)$/m) || [])[1]?.trim();
const id = process.argv[2]?.replace(/^id:/, "");
if (!jeton) throw new Error("PRINTFUL_API_TOKEN absent de .dev.vars");
if (!/^\d+$/.test(id ?? "")) throw new Error("Usage : npm run printful:fichier -- 123456");

const r = await fetch(`https://api.printful.com/files/${id}`, { headers: { Authorization: `Bearer ${jeton}` } });
const data = await r.json();
if (!r.ok) throw new Error(`Fichier ${id} introuvable chez Printful (${r.status}).`);
const f = data.result;
const mm = (px) => (f.dpi ? ((px / f.dpi) * 25.4).toFixed(1) : "?");
console.log(`Fichier ${f.id} : « ${f.filename} »`);
console.log(`Taille : ${f.width} × ${f.height} px, ${f.dpi ?? "?"} dpi, soit ${mm(f.width)} × ${mm(f.height)} mm. État : ${f.status}`);
const couleur = /blanc/i.test(f.filename) ? "BLANC" : /noir/i.test(f.filename) ? "NOIR" : "NOIR ou BLANC";
console.log(`Ligne pour .dev.vars : PRINTFUL_FICHIER_BLASON_${couleur}=id:${f.id}`);
