/**
 * Visuels des livres numériques, tirés des vrais PDF (prive/pdf/, jamais publics) : couverture (1re page) et aperçus
 * de pages intérieures représentatives (pages vierges, sans contenu personnel), plus le visuel du pack.
 * Rendu avec le lecteur PDF d'Edge (moteur PDFium), composé avec sharp en carrés de 1600 px (+ vignettes 480 px).
 * Usage : npm run visuels:livres
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { LIVRES } from "../src/data/livres.js";

const racine = resolve(import.meta.dirname, "..");
const PDF = join(racine, "prive", "pdf");
const SORTIE = join(racine, "public", "produits");
const TRAVAIL = join(process.env.TEMP ?? racine, "visuels-livres");
mkdirSync(TRAVAIL, { recursive: true });

// Pages à montrer : [fichier, page]. Couverture d'abord.
const PAGES = {
  "sors-de-ton-addiction": [["a4", 1], ["telephone", 11], ["telephone", 84], ["a4", 89]],
  "aiguise-ton-mental": [["a4", 1], ["telephone", 12], ["telephone", 81], ["telephone", 84]],
  "ose-ton-projet": [["a4", 1], ["telephone", 8], ["telephone", 81], ["telephone", 84]],
};

// Navigateur sans fenêtre et lecteur PDF d'Edge.
const port = 9700 + Math.floor(Math.random() * 100);
const edge = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", ["--headless=new", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${join(TRAVAIL, `profil-${port}`)}`, "about:blank"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const attente = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && attente.has(d.id)) { attente.get(d.id)(d.result); attente.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; attente.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

/** Une page du PDF, à 200 %, recadrée sur la page (format A4 ou téléphone). */
async function rendre(fichier, page, a4) {
  await send("Emulation.setDeviceMetricsOverride", { width: a4 ? 1750 : 950, height: a4 ? 2400 : 1600, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: "about:blank" });
  await new Promise((r) => setTimeout(r, 300));
  await send("Page.navigate", { url: `${pathToFileURL(fichier).href}#page=${page}&toolbar=0&navpanes=0&zoom=200` });
  await new Promise((r) => setTimeout(r, 9000));
  const shot = Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64");
  const { data, info } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const fond = [data[0], data[1], data[2]];
  const diff = (i) => Math.abs(data[i] - fond[0]) + Math.abs(data[i + 1] - fond[1]) + Math.abs(data[i + 2] - fond[2]) > 24;
  const ligne = (y) => { let c = 0; for (let x = 0; x < info.width; x += 4) if (diff((y * info.width + x) * 3)) c++; return c > info.width / 40; };
  let haut = 0; while (haut < info.height && !ligne(haut)) haut++;
  const col = (x) => { let c = 0; for (let y = haut; y < info.height; y += 4) if (diff((y * info.width + x) * 3)) c++; return c > (info.height - haut) / 40; };
  let gauche = 0; while (gauche < info.width && !col(gauche)) gauche++;
  let droite = info.width - 1; while (droite > gauche && !col(droite)) droite--;
  const largeur = droite - gauche + 1;
  const hauteur = Math.min(info.height - haut, Math.round(largeur * (a4 ? 842 / 595 : 544 / 306)));
  return sharp(shot).extract({ left: gauche, top: haut, width: largeur, height: hauteur }).png().toBuffer();
}

const FOND = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600"><defs><radialGradient id="g" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="#26315f"/><stop offset=".6" stop-color="#121a38"/><stop offset="1" stop-color="#0a0f22"/></radialGradient></defs><rect width="1600" height="1600" fill="url(#g)"/></svg>`);

/** Une page posée sur le fond, coins arrondis et ombre douce. */
async function poser(pageBuf, hauteurPx, rayon, x = null, y = null, rotation = 0) {
  const page = await sharp(pageBuf).resize({ height: hauteurPx }).toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = page.info;
  const masque = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${rayon}" ry="${rayon}"/></svg>`);
  let arrondie = await sharp(page.data).composite([{ input: masque, blend: "dest-in" }]).png().toBuffer();
  const ombre = await sharp({ create: { width: w + 160, height: h + 160, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await sharp(Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${rayon}" fill="#000" fill-opacity=".55"/></svg>`)).png().toBuffer(), left: 80, top: 100 }])
    .blur(34).png().toBuffer();
  let bloc = await sharp(ombre).composite([{ input: arrondie, left: 80, top: 80 }]).png().toBuffer();
  if (rotation) bloc = await sharp(bloc).rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const meta = await sharp(bloc).metadata();
  return { input: bloc, left: Math.round(x ?? (1600 - meta.width) / 2), top: Math.round(y ?? (1600 - meta.height) / 2) };
}

async function enregistrer(nom, couches) {
  const image = await sharp(FOND).composite(couches).png().toBuffer();
  await sharp(image).webp({ quality: 84 }).toFile(join(SORTIE, `${nom}.webp`));
  await sharp(image).resize(480).webp({ quality: 80 }).toFile(join(SORTIE, `${nom}-480.webp`));
  console.log(`public/produits/${nom}.webp`);
}

const couvertures = {};
for (const [slug, pages] of Object.entries(PAGES)) {
  const livre = LIVRES[slug];
  let n = 1;
  for (const [version, page] of pages) {
    const fichier = join(PDF, livre.fichiers.find((f) => f.version === version).source);
    const buf = await rendre(fichier, page, version === "a4");
    if (n === 1) {
      couvertures[slug] = buf;
      mkdirSync(join(racine, "prive", "couvertures"), { recursive: true });
      await sharp(buf).resize({ height: 1000 }).png().toFile(join(racine, "prive", "couvertures", `${slug}.png`));
    }
    await enregistrer(`${slug}-${n}`, [await poser(buf, version === "a4" ? 1300 : 1360, version === "a4" ? 10 : 34)]);
    n++;
  }
}

// Pack : les 3 couvertures en éventail.
const ordre = ["aiguise-ton-mental", "sors-de-ton-addiction", "ose-ton-projet"];
const eventail = [];
for (const [i, slug] of ordre.entries()) {
  const angle = [-5, 0, 5][i];
  eventail.push(await poser(couvertures[slug], 860, 10, [110, 470, 830][i] - 80, [400, 370, 400][i] - 80, angle));
}
// Empilées de gauche à droite : les titres, à gauche de chaque couverture, restent lisibles.
await enregistrer("pack-serie-60-1", eventail);
for (const [i, slug] of ordre.entries()) await enregistrer(`pack-serie-60-${i + 2}`, [await poser(couvertures[slug], 1300, 10)]);

ws.close();
edge.kill();
