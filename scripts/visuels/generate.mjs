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

/* ---------- Livre en 3D ---------- */

function book({ width = 500, height = 690, depth = 46, cover, rotate = -30, top = 130, left = 270, depthColor = "#101735" }) {
  const pages = "repeating-linear-gradient(90deg, #e9ecf4 0 2px, #b7bdce 2px 3px)";
  return `<div class="floor"></div>
  <div class="cast" style="left:${left - 30}px; top:${top + height - 60}px; width:${width + 190}px; height:120px"></div>
  <div style="position:absolute; left:${left}px; top:${top}px; width:${width}px; height:${height}px; perspective:1700px">
    <div style="position:relative; width:100%; height:100%; transform-style:preserve-3d; transform:rotateX(5deg) rotateY(${rotate}deg) rotateZ(1deg)">
      <div style="position:absolute; inset:0; transform:translateZ(${depth / 2}px); overflow:hidden; border-radius:3px 10px 10px 3px; box-shadow:inset 3px 0 6px rgb(255 255 255 / .1), inset 14px 0 18px rgb(0 0 0 / .4)">${cover}
        <div style="position:absolute; inset:0; background:linear-gradient(115deg, rgb(255 255 255 / .13), transparent 32%, transparent 68%, rgb(255 255 255 / .05))"></div></div>
      <div style="position:absolute; inset:0; transform:translateZ(${-depth / 2}px); background:${depthColor}"></div>
      <div style="position:absolute; top:6px; bottom:6px; right:${-depth / 2}px; width:${depth}px; transform:rotateY(90deg); background:${pages}"></div>
      <div style="position:absolute; left:0; right:8px; top:${-depth / 2}px; height:${depth}px; transform:rotateX(90deg); background:repeating-linear-gradient(0deg, #e9ecf4 0 2px, #b7bdce 2px 3px)"></div>
      <div style="position:absolute; top:0; bottom:0; left:${-depth / 2}px; width:${depth}px; transform:rotateY(-90deg); background:linear-gradient(90deg, #0a1028, #1a2452 50%, #0a1028)"></div>
    </div>
  </div>`;
}

const coverBase = `position:absolute; inset:0; padding:44px 40px; display:flex; flex-direction:column;
  background: radial-gradient(420px 380px at 88% 8%, rgb(138 108 240 / .5), transparent 70%), radial-gradient(420px 360px at 4% 96%, rgb(47 214 195 / .36), transparent 70%), linear-gradient(160deg, #111a42, #0a1029);`;

const lockup = (size = 34) =>
  `<div style="display:flex; align-items:center; gap:10px; font-weight:800; font-size:${size * 0.66}px"><img src="logo.png" width="${size}" height="${size}" alt=""> Addictive</div>`;

const programmeCover = `<div style="${coverBase}">
  ${lockup()}
  <p style="margin-top:52px; font-size:17px; font-weight:600; letter-spacing:.2em; color:#9fb3d9">PROGRAMME</p>
  <p class="grad" style="font-size:196px; line-height:.95; font-weight:800; letter-spacing:-.04em">30</p>
  <p style="font-size:40px; line-height:1.02; font-weight:800; margin-top:4px">jours</p>
  <p style="font-size:35px; line-height:1.16; font-weight:700; margin-top:18px">pour reprendre<br>le contrôle</p>
  <p style="margin-top:auto; font-size:17px; color:#b6c3dc">Une étape par jour, à votre rythme.</p>
</div>`;

const kitCover = `<div style="${coverBase}">
  ${lockup()}
  <p style="margin-top:40px; font-size:17px; font-weight:600; letter-spacing:.2em; color:#9fb3d9">KIT</p>
  <p style="font-size:40px; line-height:1.1; font-weight:800; margin-top:10px">Gérer une envie<br>en <span class="grad">10 minutes</span></p>
  <svg viewBox="0 0 240 240" width="238" height="238" style="margin:28px auto 0">
    <defs><linearGradient id="r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2fd6c3"/><stop offset=".55" stop-color="#4d9cf5"/><stop offset="1" stop-color="#8a6cf0"/></linearGradient></defs>
    <circle cx="120" cy="120" r="100" fill="none" stroke="rgb(255 255 255 / .1)" stroke-width="16"/>
    <path d="M120 20 A100 100 0 1 1 33 170" fill="none" stroke="url(#r)" stroke-width="16" stroke-linecap="round"/>
    <text x="120" y="136" text-anchor="middle" font-family="Jakarta" font-weight="800" font-size="62" fill="#eef2f8">10:00</text>
  </svg>
  <p style="margin-top:auto; font-size:17px; color:#b6c3dc">Des fiches à garder sous la main.</p>
</div>`;

/* ---------- Pages intérieures ---------- */

function sheet(content, { rotate = -3, back = true } = {}) {
  return `<div class="floor"></div>
  ${back ? `<div style="position:absolute; left:215px; top:92px; width:590px; height:820px; border-radius:8px; background:#141b3d; transform:rotate(${rotate + 5}deg); box-shadow:0 22px 50px rgb(0 0 0 / .5)"></div>` : ""}
  <div style="position:absolute; left:205px; top:85px; width:590px; height:830px; padding:56px 52px; border-radius:8px; overflow:hidden; transform:rotate(${rotate}deg);
    background: radial-gradient(360px 300px at 100% 0, rgb(138 108 240 / .24), transparent 70%), radial-gradient(340px 280px at 0 100%, rgb(47 214 195 / .16), transparent 70%), #0e1533;
    box-shadow:0 34px 70px rgb(0 0 0 / .65), inset 0 0 0 1px rgb(255 255 255 / .06)">${content}</div>`;
}

const pageNo = (n) => `<p style="position:absolute; bottom:30px; right:52px; font-size:15px; color:#8c9abb">${n}</p>`;
const eyebrow = (text) => `<p style="font-size:15px; font-weight:700; letter-spacing:.18em; color:#2fd6c3">${text}</p>`;

const sommaire = sheet(`${lockup(28)}
  <p style="margin-top:34px; font-size:44px; font-weight:800">Sommaire</p>
  <div style="margin-top:26px; display:grid; gap:15px">
  ${[
    ["Bienvenue", "Comment utiliser ce programme", "3"],
    ["Semaine 1", "Comprendre vos envies", "6"],
    ["Semaine 2", "Installer de nouvelles habitudes", "20"],
    ["Semaine 3", "Tenir dans les moments difficiles", "34"],
    ["Semaine 4", "Consolider votre progression", "48"],
    ["Et après", "Garder le cap, jour après jour", "62"],
  ]
    .map(
      ([title, text, page]) => `<div style="display:flex; align-items:center; gap:18px; padding:14px 18px; border-radius:14px; background:rgb(255 255 255 / .05)">
      <div style="flex:1"><p style="font-size:21px; font-weight:700">${title}</p><p style="font-size:17px; color:#b6c3dc; margin-top:2px">${text}</p></div>
      <p class="grad" style="font-size:24px; font-weight:800">${page}</p></div>`,
    )
    .join("")}</div>${pageNo("2")}`);

const jour1 = sheet(`${eyebrow("SEMAINE 1")}
  <p style="margin-top:12px; font-size:58px; line-height:1; font-weight:800">Jour <span class="grad">1</span></p>
  <p style="margin-top:12px; font-size:27px; font-weight:700">Votre point de départ</p>
  <p style="margin-top:18px; font-size:19px; line-height:1.5; color:#c6d1e6">Aujourd'hui, rien à prouver. Prenez simplement cinq minutes pour noter où vous en êtes. Être ici est déjà un premier pas.</p>
  <div style="margin-top:22px; padding:20px; border-radius:16px; background:rgb(77 156 245 / .14); border:1px solid rgb(77 156 245 / .35)">
    <p style="font-size:19px; font-weight:700">L'exercice du jour</p>
    <p style="margin-top:6px; font-size:18px; line-height:1.45; color:#c6d1e6">Écrivez trois raisons qui vous donnent envie de reprendre le contrôle.</p></div>
  <div style="margin-top:22px; display:grid; gap:12px; font-size:18px">
    ${["Je note mes trois raisons", "Je choisis un moment de la journée", "Je me félicite d'avoir commencé"]
      .map((text) => `<p style="display:flex; align-items:center; gap:12px"><span style="width:22px; height:22px; border-radius:7px; border:2px solid #2fd6c3"></span>${text}</p>`)
      .join("")}</div>${pageNo("7")}`, { rotate: 2 });

const respiration = sheet(`${eyebrow("FICHE 1")}
  <p style="margin-top:12px; font-size:46px; line-height:1.06; font-weight:800">Respiration<br><span class="grad">4-6</span></p>
  <p style="margin-top:14px; font-size:19px; line-height:1.5; color:#c6d1e6">Installez-vous, relâchez les épaules et laissez l'envie passer, une respiration après l'autre.</p>
  <svg viewBox="0 0 480 250" width="486" height="250" style="margin-top:14px">
    <defs><linearGradient id="w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2fd6c3"/><stop offset=".55" stop-color="#4d9cf5"/><stop offset="1" stop-color="#8a6cf0"/></linearGradient></defs>
    <path d="M10 190 C70 190 80 40 150 40 C230 40 240 190 320 190 C370 190 380 90 470 60" fill="none" stroke="url(#w)" stroke-width="10" stroke-linecap="round"/>
    <text x="10" y="238" font-family="Jakarta" font-weight="700" font-size="24" fill="#eef2f8">Inspirez <tspan font-weight="400" font-size="20" fill="#b6c3dc">4 secondes</tspan></text>
    <text x="470" y="238" text-anchor="end" font-family="Jakarta" font-weight="700" font-size="24" fill="#eef2f8">Expirez <tspan font-weight="400" font-size="20" fill="#b6c3dc">6 secondes</tspan></text>
  </svg>
  <div style="margin-top:16px; padding:18px 20px; border-radius:16px; background:rgb(47 214 195 / .12); border:1px solid rgb(47 214 195 / .35); font-size:19px; font-weight:600">Répétez dix fois, sans forcer.</div>${pageNo("3")}`);

const sport = sheet(`${eyebrow("FICHE 2")}
  <p style="margin-top:12px; font-size:44px; line-height:1.06; font-weight:800">Défi sport<br><span class="grad">express</span></p>
  <p style="margin-top:14px; font-size:19px; line-height:1.5; color:#c6d1e6">Bouger change les idées. Allez à votre rythme et adaptez chaque mouvement.</p>
  <div style="margin-top:20px; display:grid; gap:12px">
  ${[
    ["2 min", "Marche sur place"],
    ["10", "Flexions de jambes"],
    ["30 s", "Étirements des bras"],
    ["10", "Rotations des épaules"],
    ["1 min", "Respiration calme"],
  ]
    .map(
      ([value, text]) => `<div style="display:flex; align-items:center; gap:16px; padding:12px 16px; border-radius:14px; background:rgb(255 255 255 / .05)">
      <p class="grad" style="width:92px; font-size:26px; font-weight:800">${value}</p><p style="font-size:20px; font-weight:600">${text}</p></div>`,
    )
    .join("")}</div>${pageNo("5")}`, { rotate: 2 });

/* ---------- T-shirt ---------- */

const TEE = "M385 120 C420 150 580 150 615 120 L735 165 C775 180 800 200 825 245 L905 385 C912 398 908 410 895 416 L805 460 C792 466 782 462 775 450 L735 385 L742 880 C742 895 735 902 720 904 C580 925 420 925 280 904 C265 902 258 895 258 880 L265 385 L225 450 C218 462 208 466 195 460 L105 416 C92 410 88 398 95 385 L175 245 C200 200 225 180 265 165 Z";

function tee({ viewBox = "0 0 1000 1000", back = false, weave = false }) {
  const neckTop = back ? "M385 120 C420 150 580 150 615 120" : "M385 120 C420 205 580 205 615 120";
  const collarInside = back ? "" : `<path d="M385 120 C420 150 580 150 615 120 C580 205 420 205 385 120Z" fill="#0b0c10"/><rect x="474" y="148" width="52" height="24" rx="3" fill="#20242c"/>`;
  const print = back
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

const teeStage = (inner) => `<div style="position:absolute; inset:0; background: radial-gradient(520px 520px at 50% 45%, #3c4a7c, transparent 76%), linear-gradient(180deg, #1c2448, #111733)"></div>${inner}`;

/* ---------- Gourde ---------- */

function bottle({ viewBox = "0 0 1000 1000", shadow = true }) {
  const body = "M432 262 C432 296 372 312 372 372 L372 846 C372 884 396 900 430 900 L570 900 C604 900 628 884 628 846 L628 372 C628 312 568 296 568 262 Z";
  return `<svg width="1000" height="1000" viewBox="${viewBox}" style="position:absolute; inset:0">
    <defs>
      <linearGradient id="coat" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#05081a"/><stop offset=".1" stop-color="#121a3c"/><stop offset=".24" stop-color="#3b4d8c"/><stop offset=".31" stop-color="#22305f"/><stop offset=".62" stop-color="#121a3c"/><stop offset=".86" stop-color="#0a1029"/><stop offset=".95" stop-color="#27365f"/><stop offset="1" stop-color="#060a1c"/></linearGradient>
      <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b4254"/><stop offset=".18" stop-color="#c9d2e2"/><stop offset=".3" stop-color="#eef2f8"/><stop offset=".5" stop-color="#7c8598"/><stop offset=".8" stop-color="#3b4254"/><stop offset="1" stop-color="#a9b3c6"/></linearGradient>
      <linearGradient id="cap" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#07090f"/><stop offset=".22" stop-color="#3a3e4a"/><stop offset=".34" stop-color="#20232b"/><stop offset=".8" stop-color="#101217"/><stop offset="1" stop-color="#2a2d36"/></linearGradient>
      <linearGradient id="ring" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2fd6c3"/><stop offset=".55" stop-color="#4d9cf5"/><stop offset="1" stop-color="#8a6cf0"/></linearGradient>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <mask id="reflect"><rect x="300" y="900" width="400" height="170" fill="url(#fade)"/></mask>
      <filter id="powder"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .8 -.3"/></filter>
      <filter id="blur" filterUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000"><feGaussianBlur stdDeviation="3"/></filter>
      <filter id="glow" filterUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000"><feGaussianBlur stdDeviation="20"/></filter>
      <clipPath id="b"><path d="${body}"/></clipPath>
      <g id="bottle-shape">
        <path d="M512 118 C512 66 588 66 588 118" fill="none" stroke="url(#cap)" stroke-width="20" stroke-linecap="round"/>
        <rect x="424" y="116" width="178" height="118" rx="20" fill="url(#cap)"/>
        ${Array.from({ length: 22 }, (_, i) => `<rect x="${430 + i * 7.7}" y="124" width="2.4" height="102" fill="#000" opacity=".35"/>`).join("")}
        <rect x="438" y="234" width="124" height="16" fill="url(#steel)"/>
        <rect x="432" y="250" width="136" height="12" rx="2" fill="url(#ring)"/>
        <path d="${body}" fill="url(#coat)"/>
        <g clip-path="url(#b)">
          <rect width="1000" height="1000" filter="url(#powder)" opacity=".2" style="mix-blend-mode:overlay"/>
          <rect x="452" y="300" width="20" height="600" fill="#9fb6ea" opacity=".22" filter="url(#blur)"/>
          <rect x="372" y="862" width="256" height="38" fill="url(#steel)"/>
        </g>
      </g>
    </defs>
    ${shadow ? `<ellipse cx="510" cy="912" rx="230" ry="28" fill="#000" filter="url(#glow)" opacity=".85"/>
    <use href="#bottle-shape" transform="translate(0 1800) scale(1 -1)" mask="url(#reflect)" opacity=".5"/>` : ""}
    <use href="#bottle-shape"/>
    <image href="logo.png" x="424" y="470" width="152" height="152"/>
    <text x="500" y="662" text-anchor="middle" font-family="Jakarta" font-weight="800" font-size="34" fill="#eef2f8">Addictive</text>
    <text x="500" y="694" text-anchor="middle" font-family="Jakarta" font-weight="500" font-size="15.5" fill="#b6c3dc">Sois addict à ta sobriété</text>
  </svg>`;
}

/* ---------- Scènes ---------- */

const programmeBook = book({ cover: programmeCover });
const kitBook = `<div style="position:absolute; left:206px; top:192px; width:430px; height:600px; border-radius:8px; background:#17214d; transform:rotate(-9deg); box-shadow:0 20px 40px rgb(0 0 0 / .5)"></div>
  <div style="position:absolute; left:226px; top:176px; width:430px; height:600px; border-radius:8px; background:#1e2a5e; transform:rotate(-4deg); box-shadow:0 20px 40px rgb(0 0 0 / .5)"></div>
  ${book({ cover: kitCover, depth: 20, rotate: -26, left: 290, top: 150, width: 480, height: 680 })}`;

const VIEWS = {
  "programme-1": programmeBook,
  "programme-2": sommaire,
  "programme-3": jour1,
  "kit-1": kitBook,
  "kit-2": respiration,
  "kit-3": sport,
  "tshirt-1": teeStage(tee({})),
  "tshirt-2": teeStage(tee({ back: true })),
  "tshirt-3": teeStage(tee({ viewBox: "310 265 380 380", weave: true })),
  "gourde-1": `<div class="floor"></div>${bottle({})}`,
  "gourde-2": `<div style="position:absolute; inset:0; background:#0a1029"></div>${bottle({ viewBox: "352 400 300 300", shadow: false })}`,
  "gourde-3": `<div style="position:absolute; inset:0; background:radial-gradient(600px 500px at 40% 30%, #2a3768, transparent 75%), #0a1029"></div>${bottle({ viewBox: "300 50 400 400", shadow: false })}`,
};

/** Haut de page : les 4 produits réunis. */
const HERO = `<div class="stage" style="width:1600px; height:600px"><div class="floor" style="height:130px"></div>
  ${[
    [-310, programmeBook, .58, -215],
    [50, kitBook, .58, -215],
    [460, tee({}), .58, -205],
    [850, bottle({ shadow: false }), .56, -205],
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

await makeLogo();
const only = process.argv[2];
for (const [name, inner] of Object.entries(VIEWS)) {
  if (only && only !== name) continue;
  const png = capture(name, `<div class="stage">${inner}</div>`, 1000, 1000);
  await toWebp(png, join(OUT, `${name}.webp`), 1000, 1000);
  await toWebp(png, join(OUT, `${name}-480.webp`), 480, 480);
  console.log(name, Math.round(statSync(join(OUT, `${name}.webp`)).size / 1024), "Ko");
}
if (!only || only === "hero") {
  const png = capture("hero", HERO, 1600, 600);
  await toWebp(png, join(OUT, "hero.webp"), 1600, 600);
  await toWebp(png, join(OUT, "hero-800.webp"), 800, 300);
  console.log("hero", Math.round(statSync(join(OUT, "hero.webp")).size / 1024), "Ko");
}
