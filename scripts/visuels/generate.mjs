/**
 * Fabrique les visuels de démonstration des produits : chaque vue est une page HTML/SVG, capturée par Edge en mode invisible,
 * puis convertie en WebP (moins de 200 Ko). À relancer à la main : `node scripts/visuels/generate.mjs [nom-de-vue]`.
 * Rien de tout cela n'est publié : seuls les fichiers de public/produits/ le sont.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const ROOT = resolve(import.meta.dirname, "../..");
const OUT = join(ROOT, "public/produits");
const WORK = mkdtempSync(join(tmpdir(), "visuels-"));
mkdirSync(OUT, { recursive: true });

copyFileSync(join(ROOT, "public/fonts/plus-jakarta-sans-latin-wght-normal.woff2"), join(WORK, "font.woff2"));
copyFileSync(join(ROOT, "public/fonts/plus-jakarta-sans-latin-ext-wght-normal.woff2"), join(WORK, "font-ext.woff2"));

/** Le logo a un fond sombre : on le rend transparent pour le poser sur les produits. */
async function makeLogo() {
  const { data, info } = await sharp(join(ROOT, "scripts/visuels/logo-512.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const peak = Math.max(data[i], data[i + 1], data[i + 2]);
    data[i + 3] = Math.max(0, Math.min(255, Math.round(((peak - 70) / 110) * 255)));
  }
  await sharp(data, { raw: info }).png().toFile(join(WORK, "logo.png"));
  // Blason brodé du t-shirt (prive/broderie), pour le visuel d'accueil.
  copyFileSync(join(ROOT, "prive/broderie/blason-tshirt-noir.png"), join(WORK, "blason.png"));
  // Couvertures des livres (npm run visuels:livres les crée dans prive/couvertures).
  for (const livre of ["sors-de-ton-addiction", "aiguise-ton-mental", "ose-ton-projet"]) copyFileSync(join(ROOT, `prive/couvertures/${livre}.png`), join(WORK, `couverture-${livre}.png`));
}

const GRADIENT = "linear-gradient(100deg, #2fd6c3, #4d9cf5 55%, #8a6cf0)";

const base = `
@font-face { font-family: "Jakarta"; src: url(font-ext.woff2); font-weight: 200 800; unicode-range: U+0100-02FF; }
@font-face { font-family: "Jakarta"; src: url(font.woff2); font-weight: 200 800; unicode-range: U+0000-00FF, U+2000-206F, U+20AC; }
* { box-sizing: border-box; margin: 0; }
html, body { width: var(--w); height: var(--h); overflow: hidden; background: #070b1a; color: #eef2f8; font-family: "Jakarta", sans-serif; -webkit-font-smoothing: antialiased; }
.stage { position: relative; width: 1000px; height: 1000px; overflow: hidden;
  background:
    radial-gradient(620px 460px at 22% 18%, rgb(77 156 245 / .22), transparent 70%),
    radial-gradient(640px 500px at 82% 30%, rgb(138 108 240 / .22), transparent 70%),
    radial-gradient(760px 340px at 50% 104%, rgb(47 214 195 / .16), transparent 72%),
    linear-gradient(180deg, #0d1330, #090e22 62%, #060a18); }
.floor { position: absolute; left: 0; right: 0; bottom: 0; height: 250px; background: linear-gradient(180deg, rgb(255 255 255 / .035), transparent 60%); border-top: 1px solid rgb(255 255 255 / .05); }
.cast { position: absolute; border-radius: 50%; background: #000; filter: blur(30px); opacity: .75; }
.grad { background: ${GRADIENT}; -webkit-background-clip: text; background-clip: text; color: transparent; }
`;

/* ---------- Logo et nom (image de partage) ---------- */

const lockup = (size = 34) =>
  `<div style="display:flex; align-items:center; gap:10px; font-weight:800; font-size:${size * 0.66}px"><img src="logo.png" width="${size}" height="${size}" alt=""> Addictive</div>`;

/* ---------- T-shirt ---------- */

const TEE = "M385 120 C420 150 580 150 615 120 L735 165 C775 180 800 200 825 245 L905 385 C912 398 908 410 895 416 L805 460 C792 466 782 462 775 450 L735 385 L742 880 C742 895 735 902 720 904 C580 925 420 925 280 904 C265 902 258 895 258 880 L265 385 L225 450 C218 462 208 466 195 460 L105 416 C92 410 88 398 95 385 L175 245 C200 200 225 180 265 165 Z";

function tee({ viewBox = "0 0 1000 1000", back = false, weave = false, brode = false }) {
  const neckTop = back ? "M385 120 C420 150 580 150 615 120" : "M385 120 C420 205 580 205 615 120";
  const collarInside = back ? "" : `<path d="M385 120 C420 150 580 150 615 120 C580 205 420 205 385 120Z" fill="#0b0c10"/><rect x="474" y="148" width="52" height="24" rx="3" fill="#20242c"/>`;
  const print = brode
    ? `<image href="blason.png" x="572" y="252" width="56" height="42"/>`
    : back
    ? `<g filter="url(#ink)"><image href="logo.png" x="468" y="205" width="64" height="64"/><text x="500" y="298" text-anchor="middle" font-family="Jakarta" font-weight="800" font-size="20" fill="#eef2f8">Addictive</text></g>`
    : `<g filter="url(#ink)"><image href="logo.png" x="455" y="285" width="90" height="90"/>
       <text x="500" y="436" text-anchor="middle" font-family="Jakarta" font-weight="800" font-size="56" fill="#f1f4f9">Sois addict à</text>
       <text x="500" y="508" text-anchor="middle" font-family="Jakarta" font-weight="800" font-size="62" fill="url(#ink-grad)">ta sobriété</text></g>`;
  const folds = [
    ["M300 400 C340 560 310 720 340 900", "#2c2f37", 16],
    ["M700 400 C650 560 690 730 660 900", "#000", 22],
    ["M420 560 C440 690 410 800 430 912", "#000", 18],
    ["M580 600 C560 700 590 810 570 915", "#2a2d35", 14],
    ["M270 390 C330 350 360 300 372 200", "#000", 16],
    ["M730 390 C680 350 640 300 628 200", "#292c33", 12],
    ["M170 300 C210 330 240 350 262 392", "#000", 12],
    ["M830 300 C790 330 760 350 738 392", "#000", 12],
  ];
  return `<svg width="1000" height="1000" viewBox="${viewBox}" style="position:absolute; inset:0">
    <defs>
      <linearGradient id="cloth" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#090a0d"/><stop offset=".22" stop-color="#15161a"/><stop offset=".5" stop-color="#1b1c21"/><stop offset=".78" stop-color="#121317"/><stop offset="1" stop-color="#08090b"/></linearGradient>
      <linearGradient id="ink-grad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2fd6c3"/><stop offset=".55" stop-color="#4d9cf5"/><stop offset="1" stop-color="#8a6cf0"/></linearGradient>
      <clipPath id="body"><path d="${TEE}"/></clipPath>
      <filter id="soft" filterUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000"><feGaussianBlur stdDeviation="14"/></filter>
      <filter id="drop" filterUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000"><feGaussianBlur stdDeviation="26"/></filter>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="${weave ? "1.4 1.4" : "2.2"}" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 -.28"/></filter>
      <filter id="ink"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="8" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${weave ? 3 : 5}"/></filter>
      <pattern id="rib" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(90)"><rect width="3" height="6" fill="#2b2f37"/><rect x="3" width="3" height="6" fill="#191b20"/></pattern>
      <pattern id="knit" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 1.5h3M1.5 0v3" stroke="#000" stroke-opacity=".16" stroke-width=".45"/></pattern>
    </defs>
    <path d="${TEE}" fill="#000" opacity=".7" transform="translate(14 26)" filter="url(#drop)"/>
    <path d="${TEE}" fill="url(#cloth)"/>
    <g clip-path="url(#body)">
      ${folds.map(([d, color, width]) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" filter="url(#soft)" opacity=".85"/>`).join("")}
      ${print}
      ${weave ? `<rect width="1000" height="1000" fill="url(#knit)"/>` : ""}
      <rect width="1000" height="1000" filter="url(#grain)" opacity="${weave ? ".22" : ".14"}" style="mix-blend-mode:overlay"/>
      <path d="M258 872 C420 900 580 900 742 872" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="2" stroke-dasharray="7 5"/>
      <path d="M118 372 L214 428M882 372 L786 428" stroke="#000" stroke-opacity=".5" stroke-width="2" stroke-dasharray="7 5"/>
      <path d="M265 165 C250 240 258 320 265 385M735 165 C750 240 742 320 735 385" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="3"/>
    </g>
    ${collarInside}
    <path d="${neckTop}" fill="none" stroke="url(#rib)" stroke-width="20" stroke-linecap="round"/>
    <path d="${neckTop}" transform="translate(0 11)" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="2"/>
  </svg>`;
}

/* ---------- Couvertures d'articles (1600 × 900) ---------- */

const articleFrame = (eyebrow, title, visual) => `<div style="position:relative; width:1600px; height:900px; overflow:hidden; padding:96px 110px;
  background: radial-gradient(760px 600px at 92% 12%, rgb(138 108 240 / .38), transparent 70%), radial-gradient(760px 560px at 0 100%, rgb(47 214 195 / .24), transparent 70%), linear-gradient(160deg, #111a42, #070b1a)">
  ${lockup(48)}
  <p style="margin-top:210px; font-size:26px; font-weight:700; letter-spacing:.18em; color:#2fd6c3">${eyebrow}</p>
  <p style="margin-top:20px; width:600px; font-size:72px; line-height:1.06; font-weight:800; letter-spacing:-.02em">${title}</p>
  ${visual}
</div>`;

const habitCalendar = `<div style="position:absolute; right:110px; top:170px; width:640px; padding:44px; zoom:1.08; border-radius:36px; background:rgb(255 255 255 / .05); box-shadow:inset 0 0 0 2px rgb(255 255 255 / .07), 0 40px 80px rgb(0 0 0 / .45)">
  <div style="display:flex; justify-content:space-between; font-size:24px; font-weight:700"><span>Votre série</span><span class="grad">25 jours</span></div>
  <div style="margin-top:28px; display:grid; grid-template-columns:repeat(7, 1fr); gap:14px">
    ${Array.from({ length: 35 }, (_, i) => {
      const done = i < 26 && i !== 9;
      const missed = i === 9;
      return `<span style="aspect-ratio:1; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:26px; font-weight:800; color:#070b1a;
        background:${done ? "linear-gradient(135deg, #2fd6c3, #4d9cf5)" : missed ? "rgb(255 255 255 / .16)" : "rgb(255 255 255 / .06)"}">${done ? "✓" : ""}</span>`;
    }).join("")}
  </div>
  <p style="margin-top:26px; font-size:22px; color:#b6c3dc">Un jour manqué n'efface rien : on reprend le lendemain.</p>
</div>`;

const sportWeeks = `<div style="position:absolute; right:110px; top:170px; width:640px; padding:44px; zoom:1.08; border-radius:36px; background:rgb(255 255 255 / .05); box-shadow:inset 0 0 0 2px rgb(255 255 255 / .07), 0 40px 80px rgb(0 0 0 / .45)">
  <div style="display:flex; justify-content:space-between; font-size:24px; font-weight:700"><span>Reprise en 4 semaines</span><span class="grad">150 min</span></div>
  <div style="margin-top:34px; height:330px; display:flex; align-items:flex-end; gap:30px">
    ${[[45, "15 min"], [60, "20 min"], [100, "25 min"], [150, "30 min"]].map(([height, label], i) => `<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:12px">
      <span style="font-size:22px; font-weight:700; color:#cfe0ff">${label}</span>
      <span style="width:100%; height:${height * 1.8}px; border-radius:18px 18px 8px 8px; background:linear-gradient(180deg, #8a6cf0, #4d9cf5 50%, #2fd6c3)"></span>
      <span style="font-size:20px; color:#b6c3dc">Semaine ${i + 1}</span></div>`).join("")}
  </div>
  <p style="margin-top:26px; font-size:22px; color:#b6c3dc">Un peu plus chaque semaine, à votre rythme.</p>
</div>`;

const ARTICLE_COVERS = {
  "motivation-habitude": articleFrame("MENTAL ET DISCIPLINE", "Motivation ou habitude : ce qui marche vraiment", habitCalendar),
  "reprendre-le-sport": articleFrame("SPORT ET CORPS", "Reprendre le sport après une pause", sportWeeks),
};

/* ---------- Scènes ---------- */

const VIEWS = {
  // Livres : visuels tirés des vrais PDF (npm run visuels:livres).
  // T-shirt : les photos de la fiche sont les maquettes Printful (npm run printful:maquettes).
};

/** Une couverture de livre posée, avec ombre. */
const couverture = (livre, rotation) => `<img src="couverture-${livre}.png" style="position:absolute; left:290px; top:170px; width:420px; border-radius:6px; box-shadow:0 40px 80px rgba(0,0,0,.6); transform:rotate(${rotation}deg)">`;

/** Haut de page : les livres de la Série 60 et le t-shirt brodé. */
const HERO = `<div class="stage" style="width:1600px; height:600px"><div class="floor" style="height:130px"></div>
  ${[
    [-260, couverture("aiguise-ton-mental", -6), .58, -215],
    [20, couverture("sors-de-ton-addiction", 0), .58, -230],
    [300, couverture("ose-ton-projet", 6), .58, -215],
    [770, tee({ brode: true }), .58, -205],
  ]
    .map(([x, inner, scale, y]) => `<div style="position:absolute; left:${x}px; top:${y}px; width:1000px; height:1000px; transform:scale(${scale}); transform-origin:50% 50%">${String(inner).replace('<div class="floor"></div>', "").replace(/id="/g, `id="v${x}-`).replace(/url\(#/g, `url(#v${x}-`).replace(/href="#/g, `href="#v${x}-`)}</div>`)
    .join("")}</div>`;

function capture(name, html, width, height) {
  const file = join(WORK, `${name}.html`);
  writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>:root{--w:${width}px;--h:${height}px}${base}</style><body>${html}`);
  const png = join(WORK, `${name}.png`);
  execFileSync(EDGE, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", "--no-first-run",
    `--user-data-dir=${join(WORK, `profil-${name}`)}`, `--window-size=${width},${height}`, "--virtual-time-budget=3000",
    `--screenshot=${png}`, pathToFileURL(file).href,
  ], { stdio: "ignore", timeout: 60000 });
  // Le lanceur d'Edge rend la main avant que l'image soit écrite.
  const limit = Date.now() + 30000;
  while (!existsSync(png) || statSync(png).size === 0) {
    if (Date.now() > limit) throw new Error(`Capture impossible : ${name}`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
  return png;
}

async function toWebp(png, target, width, height) {
  for (const quality of [82, 74, 66, 58, 50]) {
    await sharp(readFileSync(png)).resize(width, height, { fit: "cover", position: "top" }).webp({ quality, effort: 6 }).toFile(target);
    if (statSync(target).size < 190 * 1024) return;
  }
}

/** Image de partage (réseaux sociaux) : JPEG, le format le mieux accepté. */
const OG = `<div style="position:relative; width:1200px; height:630px; overflow:hidden; padding:70px 80px;
  background: radial-gradient(620px 460px at 90% 10%, rgb(138 108 240 / .4), transparent 70%), radial-gradient(620px 420px at 0 100%, rgb(47 214 195 / .28), transparent 70%), linear-gradient(160deg, #111a42, #070b1a)">
  ${lockup(64)}
  <p style="margin-top:62px; font-size:78px; line-height:1.08; font-weight:800; letter-spacing:-.02em">Vos habitudes,<br><span class="grad">votre progression</span></p>
  <p style="margin-top:30px; font-size:32px; color:#c6d1e6">Discipline, mental, sport : avancez chaque jour.</p>
  <p style="position:absolute; left:80px; bottom:56px; font-size:24px; font-weight:700; color:#9fb3d9">Sois addict à ta sobriété</p>
</div>`;

await makeLogo();
const only = process.argv[2];
if (!only || only === "og") {
  const png = capture("og", OG, 1200, 630);
  await sharp(readFileSync(png)).resize(1200, 630, { fit: "cover", position: "top" }).jpeg({ quality: 84, mozjpeg: true }).toFile(join(ROOT, "public/og.jpg"));
  console.log("og", Math.round(statSync(join(ROOT, "public/og.jpg")).size / 1024), "Ko");
}
for (const [name, inner] of Object.entries(VIEWS)) {
  if (only && only !== name) continue;
  const png = capture(name, `<div class="stage">${inner}</div>`, 1000, 1000);
  await toWebp(png, join(OUT, `${name}.webp`), 1000, 1000);
  await toWebp(png, join(OUT, `${name}-480.webp`), 480, 480);
  console.log(name, Math.round(statSync(join(OUT, `${name}.webp`)).size / 1024), "Ko");
}
const ARTICLES = join(ROOT, "public/articles");
mkdirSync(ARTICLES, { recursive: true });
for (const [name, html] of Object.entries(ARTICLE_COVERS)) {
  if (only && only !== name) continue;
  const png = capture(`article-${name}`, html, 1600, 900);
  await toWebp(png, join(ARTICLES, `${name}.webp`), 1600, 900);
  await toWebp(png, join(ARTICLES, `${name}-800.webp`), 800, 450);
  console.log(name, Math.round(statSync(join(ARTICLES, `${name}.webp`)).size / 1024), "Ko");
}
if (!only || only === "hero") {
  const png = capture("hero", HERO, 1600, 600);
  await toWebp(png, join(OUT, "hero.webp"), 1600, 600);
  await toWebp(png, join(OUT, "hero-800.webp"), 800, 300);
  console.log("hero", Math.round(statSync(join(OUT, "hero.webp")).size / 1024), "Ko");
}
