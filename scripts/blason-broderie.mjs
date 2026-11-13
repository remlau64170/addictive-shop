/**
 * Blason brodé du t-shirt : logo de l'appli au-dessus, « Addictive » en dessous, centrés, sans slogan.
 * Logo redessiné d'après C:\Users\Rémy\addictive\public\icon-only-512.png : même flèche, ruban simplifié en 3 bandes
 * épaisses séparées d'au moins 2 mm. Sortie : prive/broderie/ (PNG transparents, couleurs exactes des fils Printful,
 * taille réelle à 300 dpi) et aperçus sur t-shirt noir et blanc.
 * Usage : node scripts/blason-broderie.mjs   (utilise Microsoft Edge en mode sans fenêtre et sharp)
 */
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const racine = resolve(import.meta.dirname, "..");
const SORTIE = join(racine, "prive", "broderie");
const DPI = 300;
const MM = DPI / 25.4; // pixels par millimètre
const LARGEUR_MM = 57; // largeur totale visée : entre 5,5 et 6 cm
const LOGO_PART = 0.5; // largeur du logo par rapport à « Addictive »
const ESPACE_BANDES_MM = 2.2; // espace entre les bandes du ruban (au moins 2 mm)
const LETTRE_MIN_MM = 6.35; // hauteur minimale d'une lettre selon Printful (0,25 pouce)
const TRAIT_MIN_MM = 1.27; // épaisseur minimale d'un trait ou d'un espace (0,05 pouce)

const VERSIONS = {
  noir: { logo: "#3399FF", texte: "#FFFFFF", tissu: "#141414", fils: "Aqua/Teal #3399FF et blanc #FFFFFF" },
  blanc: { logo: "#005397", texte: "#000000", tissu: "#F2F2F0", fils: "Royal #005397 et noir #000000" },
};

// Repère du logo : celui de l'icône agrandie à 1024 px. Pente commune des bandes, relevée sur l'icône.
const PENTE = -0.37;
const PAS = 165; // distance verticale entre deux bandes, comme sur l'icône
function formes(espace) {
  const epaisseur = PAS - espace;
  const haut = (y0, x) => y0 + PENTE * (x - 180);
  const bande = (y0, x1, x2) => [[x1, haut(y0, x1)], [x2, haut(y0, x2)], [x2, haut(y0, x2) + epaisseur], [x1, haut(y0, x1) + epaisseur]];
  // Bande 1 prolongée par la flèche (tige jusqu'à la pointe, tête inchangée).
  const b1 = bande(452, 180, 728);
  const tete = [[712, 195], [900, 245], [718, 412]];
  const b2 = bande(618, 250, 660);
  const b3 = bande(783, 330, 600);
  // Pointe du ruban sous la bande 3, comme sur l'icône.
  const bas3 = (x) => haut(783, x) + epaisseur;
  const queue = [[330, bas3(330)], [470, bas3(470)], [470, bas3(470) + 112]];
  return [b1, tete, b2, b3, queue];
}

function logoSvg(couleur, largeurPx) {
  const box = { x: 176, y: 190, w: 728 }; // largeur du dessin dans le repère 1024
  const k = largeurPx / box.w;
  const espace = (ESPACE_BANDES_MM * MM) / k;
  const polys = formes(espace);
  const bas = Math.max(...polys.flat().map(([, y]) => y)) + 4;
  const h = bas - box.y;
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${largeurPx}" height="${Math.round(h * k)}" viewBox="${box.x} ${box.y} ${box.w} ${h}"><g fill="${couleur}" stroke="${couleur}" stroke-width="4" stroke-linejoin="round">${polys
      .map((p) => `<polygon points="${p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}"/>`)
      .join("")}</g></svg>`,
    espaceMm: (espace * k) / MM,
  };
}

const police = pathToFileURL(join(racine, "public", "fonts", "plus-jakarta-sans-latin-wght-normal.woff2")).href;
const page = (v, largeurPx) => {
  const { svg, espaceMm } = logoSvg(v.logo, Math.round(largeurPx * LOGO_PART));
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: J; src: url("${police}") format("woff2"); font-weight: 200 800; }
html, body { margin: 0; background: transparent; }
#b { display: inline-flex; flex-direction: column; align-items: center; padding: 4px; font-family: J; color: ${v.texte}; }
#nom { font-weight: 800; line-height: 1; letter-spacing: -0.005em; margin-top: ${(3 * MM).toFixed(1)}px; }
</style></head><body><div id="b"><div id="logo">${svg}</div><div id="nom">Addictive</div></div>
<script>
document.fonts.load("800 100px J").then(() => {
  const L = ${largeurPx}, MMPX = ${MM};
  const nom = document.getElementById("nom");
  nom.style.fontSize = "100px";
  nom.style.fontSize = (100 * L / nom.getBoundingClientRect().width) + "px";
  const c = document.createElement("canvas").getContext("2d");
  c.font = "800 " + getComputedStyle(nom).fontSize + " J";
  const r = document.getElementById("b").getBoundingClientRect();
  window.__info = { lettreMm: c.measureText("A").actualBoundingBoxAscent / MMPX, largeurMm: (r.width - 8) / MMPX, hauteurMm: (r.height - 8) / MMPX, espaceBandesMm: ${espaceMm} };
});
</script></body></html>`;
};

// Navigateur sans fenêtre (Edge) piloté par le protocole DevTools.
const port = 9850 + Math.floor(Math.random() * 100);
const profil = join(process.env.TEMP ?? racine, `edge-blason-${port}`);
const edge = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", ["--headless=new", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const attente = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && attente.has(d.id)) { attente.get(d.id)(d.result); attente.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; attente.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluer = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true })).result?.value;
await send("Emulation.setDeviceMetricsOverride", { width: 1400, height: 1400, deviceScaleFactor: 1, mobile: false });
await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });

mkdirSync(SORTIE, { recursive: true });
const rapport = {};
const largeurPx = Math.round(LARGEUR_MM * MM);
for (const [nom, v] of Object.entries(VERSIONS)) {
  const html = join(SORTIE, `.rendu-${nom}.html`);
  writeFileSync(html, page(v, largeurPx));
  await send("Page.navigate", { url: pathToFileURL(html).href });
  let info;
  for (let t = 0; t < 40 && !info; t++) { await new Promise((r) => setTimeout(r, 250)); info = await evaluer("window.__info && JSON.stringify(window.__info)"); }
  info = JSON.parse(info);
  const box = JSON.parse(await evaluer("JSON.stringify(document.getElementById('b').getBoundingClientRect())"));
  const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 } });
  rmSync(html);

  // Couleurs exactes des fils et bords nets : chaque pixel prend la couleur de fil la plus proche, ou devient transparent.
  const { data, info: im } = await sharp(Buffer.from(shot.data, "base64")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const palette = [v.logo, v.texte].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) { data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0; continue; }
    const d = palette.map((c) => (c[0] - data[i]) ** 2 + (c[1] - data[i + 1]) ** 2 + (c[2] - data[i + 2]) ** 2);
    const c = palette[d[0] <= d[1] ? 0 : 1];
    data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
  }
  const fichier = join(SORTIE, `blason-tshirt-${nom}.png`);
  await sharp(data, { raw: { width: im.width, height: im.height, channels: 4 } }).trim({ threshold: 0 }).png().withMetadata({ density: DPI }).toFile(fichier);
  const meta = await sharp(fichier).metadata();
  rapport[nom] = {
    fichier,
    fils: v.fils,
    taille: `${(meta.width / MM).toFixed(1)} × ${(meta.height / MM).toFixed(1)} mm (${meta.width} × ${meta.height} px à ${DPI} dpi)`,
    lettreMm: Number(info.lettreMm.toFixed(2)),
    espaceBandesMm: Number(info.espaceBandesMm.toFixed(2)),
  };
}
ws.close();
edge.kill();

// Contrôles : lettres et espaces au-dessus des minimums Printful.
for (const [nom, r] of Object.entries(rapport)) {
  if (r.lettreMm < LETTRE_MIN_MM) throw new Error(`${nom} : lettres trop petites (${r.lettreMm} mm)`);
  if (r.espaceBandesMm < Math.max(2, TRAIT_MIN_MM)) throw new Error(`${nom} : espace entre bandes trop petit (${r.espaceBandesMm} mm)`);
}

// Aperçus : le blason à taille réelle sur un t-shirt (repère : torse de 50 cm de large, blason côté cœur).
const ECHELLE = 6; // pixels par cm dans l'aperçu
const tshirt = (fond, bord) => `<svg xmlns="http://www.w3.org/2000/svg" width="${72 * ECHELLE}" height="${80 * ECHELLE}" viewBox="0 0 72 80">
  <path d="M26 4 Q36 13 46 4 L66 12 L62 26 L56 23 L56 78 L16 78 L16 23 L10 26 L6 12 Z" fill="${fond}" stroke="${bord}" stroke-width="0.4" stroke-linejoin="round"/>
  <path d="M26 4 Q36 13 46 4" fill="none" stroke="${bord}" stroke-width="1.2"/></svg>`;
const vignettes = [];
for (const [nom, v] of Object.entries(VERSIONS)) {
  const fond = await sharp(Buffer.from(tshirt(v.tissu, nom === "noir" ? "#3a3a3a" : "#c8c8c4"))).png().toBuffer();
  const blason = await sharp(join(SORTIE, `blason-tshirt-${nom}.png`)).resize({ width: Math.round((5.7 * ECHELLE)) }).toBuffer();
  // Côté cœur : à gauche pour la personne qui porte le t-shirt, donc à droite sur l'image vue de face.
  vignettes.push(await sharp(fond).composite([{ input: blason, left: Math.round(41 * ECHELLE), top: Math.round(18 * ECHELLE) }]).png().toBuffer());
  // Gros plan à taille réelle sur la couleur du tissu.
  await sharp(join(SORTIE, `blason-tshirt-${nom}.png`)).flatten({ background: v.tissu }).extend({ top: 60, bottom: 60, left: 60, right: 60, background: v.tissu }).toFile(join(SORTIE, `apercu-gros-plan-${nom}.png`));
}
const L = 72 * ECHELLE, H = 80 * ECHELLE;
await sharp({ create: { width: L * 2 + 60, height: H + 40, channels: 3, background: "#d9dde3" } })
  .composite(vignettes.map((input, i) => ({ input, left: 20 + i * (L + 20), top: 20 })))
  .png()
  .toFile(join(SORTIE, "apercu-tshirts.png"));

console.log(JSON.stringify(rapport, null, 2));
console.log(`Aperçus : ${join(SORTIE, "apercu-tshirts.png")}, apercu-gros-plan-noir.png, apercu-gros-plan-blanc.png`);
