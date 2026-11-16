/**
 * Images de partage (Open Graph / Twitter) : 1200 × 630, JPEG, une par produit et une par article.
 * Chaque image est une page HTML (police du site embarquée), capturée par Edge en mode invisible, puis compressée.
 * À relancer après l'ajout d'un produit ou d'un article : `npm run visuels:partage`.
 * Sortie : public/partage/produits/<id>.jpg et public/partage/articles/<id>.jpg (lues par les pages produit et article).
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const ROOT = resolve(import.meta.dirname, "..");
const PUBLIC = join(ROOT, "public");
const WORK = mkdtempSync(join(tmpdir(), "partage-"));
const W = 1200;
const H = 630;

copyFileSync(join(PUBLIC, "fonts/plus-jakarta-sans-latin-wght-normal.woff2"), join(WORK, "font.woff2"));
copyFileSync(join(PUBLIC, "fonts/plus-jakarta-sans-latin-ext-wght-normal.woff2"), join(WORK, "font-ext.woff2"));
copyFileSync(join(PUBLIC, "icon-only-192.png"), join(WORK, "logo.png"));

const echapper = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Lecture simple de l'en-tête d'un fichier Markdown (valeurs sur une ligne). */
function entete(fichier) {
  const brut = readFileSync(fichier, "utf8").split(/^---$/m)[1] ?? "";
  const valeur = (cle) => {
    const ligne = brut.match(new RegExp(`^${cle}:\\s*(.+)$`, "m"))?.[1]?.trim();
    return ligne?.replace(/^"(.*)"$/, "$1");
  };
  const premiereImage = brut.match(/images:\s*\n\s*-\s*\{\s*src:\s*([^,]+),/)?.[1]?.trim();
  const couverture = brut.match(/^cover:\s*\{\s*src:\s*([^,]+),/m)?.[1]?.trim();
  return { titre: valeur("title"), nom: valeur("name"), type: valeur("kind"), categorie: valeur("category"), draft: valeur("draft") === "true", image: premiereImage, couverture };
}

const CATEGORIES = {
  "envies-et-addictions": "Envies et addictions",
  "mental-discipline": "Mental et discipline",
  "sport-corps": "Sport et corps",
  "sortir-addiction": "Sortir d'une addiction",
  temoignages: "Témoignages",
};

const STYLE = `
@font-face { font-family: "Jakarta"; src: url(font-ext.woff2); font-weight: 200 800; unicode-range: U+0100-02FF; }
@font-face { font-family: "Jakarta"; src: url(font.woff2); font-weight: 200 800; unicode-range: U+0000-00FF, U+2000-206F, U+20AC; }
* { box-sizing: border-box; margin: 0; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; color: #eef2f8; font-family: "Jakarta", sans-serif; -webkit-font-smoothing: antialiased;
  background:
    radial-gradient(560px 420px at 12% 10%, rgb(77 156 245 / .26), transparent 70%),
    radial-gradient(620px 460px at 92% 30%, rgb(138 108 240 / .24), transparent 70%),
    radial-gradient(700px 300px at 50% 110%, rgb(47 214 195 / .16), transparent 72%),
    linear-gradient(180deg, #0d1330, #090e22 62%, #060a18); }
.page { display: flex; align-items: center; gap: 56px; width: 100%; height: 100%; padding: 64px 72px; }
.texte { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 22px; }
.marque { display: flex; align-items: center; gap: 14px; font-weight: 800; font-size: 28px; }
.marque img { width: 52px; height: 52px; border-radius: 14px; }
.etiquette { align-self: flex-start; padding: 8px 18px; border-radius: 999px; background: rgb(77 156 245 / .18); color: #9cc6ff; font-weight: 700; font-size: 24px; }
h1 { font-size: 60px; line-height: 1.08; font-weight: 800; letter-spacing: -0.01em; }
h1.long { font-size: 50px; }
h1.tres-long { font-size: 44px; }
.ligne { height: 6px; width: 120px; border-radius: 3px; background: linear-gradient(100deg, #2fd6c3, #4d9cf5 55%, #8a6cf0); }
.adresse { color: #aab4c8; font-size: 24px; font-weight: 600; }
.visuel { flex: none; width: 470px; height: 470px; border-radius: 28px; overflow: hidden; box-shadow: 0 24px 60px rgb(0 0 0 / .5); border: 1px solid rgb(255 255 255 / .08); }
.visuel img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

function capture(nom, corps) {
  const file = join(WORK, `${nom}.html`);
  writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>${STYLE}</style><body>${corps}`);
  const png = join(WORK, `${nom}.png`);
  execFileSync(EDGE, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", "--no-first-run",
    `--user-data-dir=${join(WORK, `profil-${nom}`)}`, `--window-size=${W},${H}`, "--virtual-time-budget=3000",
    `--screenshot=${png}`, pathToFileURL(file).href,
  ], { stdio: "ignore", timeout: 60000 });
  const limite = Date.now() + 30000;
  while (!existsSync(png) || statSync(png).size === 0) {
    if (Date.now() > limite) throw new Error(`Capture impossible : ${nom}`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
  return png;
}

const taille = (titre) => (titre.length > 70 ? "tres-long" : titre.length > 45 ? "long" : "");

async function produire(nom, corps, sortie) {
  const png = capture(nom, corps);
  mkdirSync(resolve(sortie, ".."), { recursive: true });
  await sharp(png).resize(W, H).jpeg({ quality: 82, mozjpeg: true }).toFile(sortie);
  console.log(sortie.replace(ROOT, "").replaceAll("\\", "/"), `${Math.round(statSync(sortie).size / 1024)} Ko`);
}

function copierImage(src) {
  const local = join(WORK, src.split("/").pop());
  copyFileSync(join(PUBLIC, src), local);
  return local.split(/[\\/]/).pop();
}

// Produits : visuel principal à droite, nom et type à gauche.
const dossierProduits = join(ROOT, "src/content/produits");
for (const f of readdirSync(dossierProduits).filter((x) => x.endsWith(".md"))) {
  const id = f.replace(/\.md$/, "");
  const p = entete(join(dossierProduits, f));
  const titre = p.nom ?? p.titre;
  const image = copierImage(p.image);
  await produire(`produit-${id}`, `<div class="page"><div class="texte">
      <div class="marque"><img src="logo.png" alt=""> Addictive</div>
      <span class="etiquette">${echapper(p.type ?? "Boutique")}</span>
      <h1 class="${taille(titre)}">${echapper(titre)}</h1>
      <div class="ligne"></div>
      <p class="adresse">shop.addictive-app.com</p>
    </div><div class="visuel"><img src="${image}" alt=""></div></div>`, join(PUBLIC, "partage/produits", `${id}.jpg`));
}

// Calculateurs : titres lus dans src/data/calculateurs.ts, plus la page qui les liste.
const sourceCalculateurs = readFileSync(join(ROOT, "src/data/calculateurs.ts"), "utf8");
const calculateurs = [...sourceCalculateurs.matchAll(/slug: "([^"]+)",\s*titre: "([^"]+)"/g)].map((m) => ({ slug: m[1], titre: m[2] }));
const pageCalculateur = (titre, etiquette) => `<div class="page"><div class="texte">
      <div class="marque"><img src="logo.png" alt=""> Addictive</div>
      <span class="etiquette">${echapper(etiquette)}</span>
      <h1 class="${taille(titre)}">${echapper(titre)}</h1>
      <div class="ligne"></div>
      <p class="adresse">Gratuit, sans inscription · shop.addictive-app.com</p>
    </div></div>`;
await produire("calculateurs", pageCalculateur("Calculateurs gratuits : l'argent et le temps que vous récupérez", "Outils gratuits"), join(PUBLIC, "partage/calculateurs", "index.jpg"));
for (const c of calculateurs) await produire(`calculateur-${c.slug}`, pageCalculateur(c.titre, "Calculateur gratuit"), join(PUBLIC, "partage/calculateurs", `${c.slug}.jpg`));

// Articles : catégorie et titre ; l'illustration de l'article à droite quand elle existe.
const dossierArticles = join(ROOT, "src/content/articles");
for (const f of readdirSync(dossierArticles).filter((x) => x.endsWith(".md"))) {
  const id = f.replace(/\.md$/, "");
  const a = entete(join(dossierArticles, f));
  if (a.draft) continue;
  if (a.couverture) {
    // L'illustration de l'article contient déjà son titre : elle sert telle quelle, recadrée en 1200 × 630.
    const sortie = join(PUBLIC, "partage/articles", `${id}.jpg`);
    mkdirSync(resolve(sortie, ".."), { recursive: true });
    await sharp(join(PUBLIC, a.couverture)).resize(W, H, { fit: "cover" }).jpeg({ quality: 82, mozjpeg: true }).toFile(sortie);
    console.log(sortie.replace(ROOT, "").replaceAll("\\", "/"), `${Math.round(statSync(sortie).size / 1024)} Ko`);
    continue;
  }
  const visuel = "";
  await produire(`article-${id}`, `<div class="page"><div class="texte">
      <div class="marque"><img src="logo.png" alt=""> Addictive</div>
      <span class="etiquette">${echapper(CATEGORIES[a.categorie] ?? "Article")}</span>
      <h1 class="${taille(a.titre)}">${echapper(a.titre)}</h1>
      <div class="ligne"></div>
      <p class="adresse">shop.addictive-app.com/articles</p>
    </div>${visuel}</div>`, join(PUBLIC, "partage/articles", `${id}.jpg`));
}
