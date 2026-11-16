/**
 * Contrôle le site construit (dist/) : `npm run build`, puis `node scripts/verifier-seo.mjs`.
 * Titres et descriptions uniques, un seul H1, ordre des titres, textes alternatifs, liens internes, sitemap et données structurées.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const AVIS = JSON.parse(readFileSync(join(resolve(import.meta.dirname, ".."), "src/data/avis.json"), "utf8"));
const DIST = join(ROOT, "dist");
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.addictive_app.twa";
const WEB_APP_URL = "https://addictive-app.com";
const problems = [];
const warn = (page, message) => problems.push(`${page} : ${message}`);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const file = join(dir, name);
    return statSync(file).isDirectory() ? walk(file) : [file];
  });
}

const unescape = (text) => text.replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
const flat = (text) => unescape(text).replace(/[\u2018\u2019]/g, "'").replace(/[\u00a0\u202f]/g, " ");
const meta = (html, attr, name) => unescape(html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1] ?? "");

const REQUIRED = {
  Organization: ["name", "url", "logo"],
  WebSite: ["name", "url"],
  Product: ["name", "description", "image", "offers"],
  Article: ["headline", "description", "datePublished", "dateModified", "author", "publisher", "image", "inLanguage", "url"],
  FAQPage: ["mainEntity"],
  MobileApplication: ["name", "operatingSystem", "applicationCategory", "offers", "url"],
  BreadcrumbList: ["itemListElement"],
  WebApplication: ["name", "url", "applicationCategory", "operatingSystem", "offers", "description"],
  ItemList: ["itemListElement"],
};

export function checkStructured(page, html) {
  const types = [];
  for (const [, raw] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      warn(page, "JSON-LD illisible");
      continue;
    }
    types.push(data["@type"]);
    if (data["@context"] !== "https://schema.org") warn(page, "JSON-LD sans @context");
    for (const key of REQUIRED[data["@type"]] ?? ["?"]) if (!data[key]) warn(page, `${data["@type"]} sans ${key}`);
    const slug = page.match(/^\/boutique\/([^/]+)\/$/)?.[1];
    const reels = AVIS.filter((avis) => avis.produit === slug).length;
    if (/aggregateRating|"review"/.test(raw) && reels === 0) warn(page, "note ou avis dans le JSON-LD sans avis réel");
    if (data["@type"] === "Product" && reels > 0 && data.aggregateRating?.reviewCount !== reels) warn(page, "nombre d'avis incohérent");
    if (data["@type"] === "Product") {
      const { price, priceCurrency, availability } = data.offers;
      if (!/^\d+\.\d{2}$/.test(price ?? "") || priceCurrency !== "EUR" || !availability) warn(page, `offre incomplète (${price})`);
    }
    if (data["@type"] === "BreadcrumbList") {
      data.itemListElement.forEach((item, index) => {
        if (item.position !== index + 1 || !item.name || !item.item?.startsWith("https://")) warn(page, "fil d'Ariane incorrect");
      });
    }
    if (data["@type"] === "Article") {
      const iso = /^\d{4}-\d{2}-\d{2}$/;
      if (!iso.test(data.datePublished ?? "") || !iso.test(data.dateModified ?? "") || data.dateModified < data.datePublished) warn(page, "dates de l'article incorrectes");
      if (data.inLanguage !== "fr-FR") warn(page, "inLanguage de l'article différent de fr-FR");
      if (data.author?.["@type"] !== "Organization" || data.publisher?.["@type"] !== "Organization" || data.publisher?.name !== data.author?.name) warn(page, "auteur ou éditeur de l'article incorrect");
      if (data.url !== data.mainEntityOfPage || data.url !== html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]) warn(page, "url de l'article différente de l'adresse canonique");
      if (!data.image?.startsWith("https://")) warn(page, "image de l'article non absolue");
      if (!flat(html).includes(flat(data.headline))) warn(page, "titre de l'article absent de la page");
    }
    if (data["@type"] === "MobileApplication") {
      if (data.offers?.price !== "0" || data.offers?.priceCurrency !== "EUR") warn(page, "MobileApplication : l'offre doit être à 0 EUR");
      if (data.url !== PLAY_STORE_URL) warn(page, "MobileApplication : url différente de la fiche Google Play");
      if (data.operatingSystem !== "Android" || data.applicationCategory !== "HealthApplication") warn(page, "MobileApplication : système ou catégorie incorrects");
    }
    if (data["@type"] === "FAQPage") {
      if (!data.mainEntity?.length) warn(page, "FAQPage sans question");
      for (const { name, acceptedAnswer } of data.mainEntity ?? []) {
        if (!flat(html).includes(flat(name))) warn(page, `question absente de la page : ${name}`);
        if (!flat(html).includes(flat(acceptedAnswer?.text ?? "\u0000"))) warn(page, `réponse absente de la page : ${name}`);
      }
    }
  }
  return types;
}

const pages = walk(DIST).filter((file) => file.endsWith(".html"));
const titles = new Map();
const descriptions = new Map();
const report = [];

for (const file of pages) {
  const page = `/${relative(DIST, file).replaceAll("\\", "/").replace(/index\.html$/, "")}`;
  const html = readFileSync(file, "utf8");
  const title = unescape(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
  const description = meta(html, "name", "description");
  const noindex = meta(html, "name", "robots").includes("noindex");

  if (!html.includes('<html lang="fr"')) warn(page, "lang absent");
  if (!title) warn(page, "pas de titre");
  if (title.length > 70) warn(page, `titre long (${title.length})`);
  if (description.length < 50 || description.length > 160) warn(page, `description de ${description.length} caractères`);
  titles.set(title, [...(titles.get(title) ?? []), page]);
  descriptions.set(description, [...(descriptions.get(description) ?? []), page]);

  if (!html.match(/<link rel="canonical" href="https:\/\/[^"]+"/)) warn(page, "canonical absent");
  for (const key of ["og:title", "og:description", "og:image", "og:url"]) if (!meta(html, "property", key)) warn(page, `${key} absent`);
  if (meta(html, "name", "twitter:card") !== "summary_large_image") warn(page, "Twitter Card absente");

  const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
  const levels = [...main.matchAll(/<h([1-6])\b/g)].map((match) => Number(match[1]));
  const h1 = [...html.matchAll(/<h1\b/g)].length;
  if (h1 !== 1) warn(page, `${h1} H1`);
  levels.forEach((level, index) => {
    if (index > 0 && level > levels[index - 1] + 1) warn(page, `saut de titre H${levels[index - 1]} vers H${level}`);
  });

  for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt="[^"]+"/.test(tag)) warn(page, `image sans alt : ${tag.slice(0, 70)}`);
    const src = tag.match(/src="([^"]+)"/)?.[1];
    if (src?.startsWith("/") && !existsSync(join(DIST, src))) warn(page, `image introuvable : ${src}`);
  }

  for (const [, href] of html.matchAll(/<a\b[^>]*href="(\/[^"#]*)/g)) {
    const target = join(DIST, href);
    if (!existsSync(join(target, "index.html")) && !existsSync(target)) warn(page, `lien cassé : ${href}`);
  }
  const types = checkStructured(page, html);
  if (/bientôt disponible|sera bientôt|prochainement/i.test(unescape(html).replace(/<[^>]+>/g, " "))) warn(page, "mention « bientôt disponible » ou « prochainement » restante");
  for (const [tag] of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) if (!/rel="[^"]*noopener/.test(tag)) warn(page, `lien externe sans rel="noopener" : ${tag.slice(0, 80)}`);
  if (page === "/" || page === "/appli/") {
    if (!unescape(html).includes(`href="${PLAY_STORE_URL}"`)) warn(page, "lien Google Play absent");
    if (!html.includes(`href="${WEB_APP_URL}"`)) warn(page, "lien version web absent");
    if (!html.includes('src="/badges/google-play-fr.png"')) warn(page, "badge Google Play absent");
  }
  if (/^\/articles\/[^/]+\/$/.test(page)) {
    if (!types.includes("Article")) warn(page, "Article absent");
    const questions = [...html.matchAll(/<h3[^>]*>[\s\S]*?<\/h3>/g)].length;
    if (/<h2[^>]*>\s*Questions fréquentes\s*<\/h2>/.test(html) && !types.includes("FAQPage")) warn(page, "section « Questions fréquentes » sans FAQPage");
    if (types.includes("FAQPage") && questions === 0) warn(page, "FAQPage sans question visible");
    if (!/<time datetime="\d{4}-\d{2}-\d{2}"/.test(html)) warn(page, "date de publication absente");
    const readAlso = html.indexOf('id="read-title"');
    if (readAlso < 0 || [...html.slice(readAlso, html.indexOf("</aside>", readAlso)).matchAll(/href="\/articles\/[^"]+\/"/g)].length < 3) warn(page, "« À lire aussi » : moins de 3 articles");
    const afterTitle = html.slice(html.indexOf("</h1>"));
    const firstText = afterTitle.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "";
    const isNew = /<strong>En bref/.test(html);
    if (isNew && !firstText.trim().startsWith("<strong>En bref")) warn(page, "le paragraphe « En bref » n'est pas le premier texte sous le titre");
  }
  const expected = page === "/" ? ["Organization", "WebSite"] : page === "/faq/" ? ["FAQPage"] : page === "/appli/" ? ["MobileApplication"] : /^\/boutique\/(?!produits-)[^/]+\/$/.test(page) ? ["Product"] : [];
  for (const type of expected) if (!types.includes(type)) warn(page, `${type} absent`);
  if (page !== "/" && !noindex && !types.includes("BreadcrumbList")) warn(page, "BreadcrumbList absent");
  report.push({ page, types, noindex });
}

for (const [text, list] of [...titles, ...descriptions]) if (list.length > 1) warn(list.join(", "), `doublon : ${text.slice(0, 50)}`);

const sitemap = [...readFileSync(join(DIST, "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
for (const path of sitemap) {
  const entry = report.find(({ page }) => page === path);
  if (!entry) warn(path, "dans le sitemap mais pas de page");
  else if (entry.noindex) warn(path, "noindex mais dans le sitemap");
}
for (const { page, noindex } of report) {
  if (!noindex && page !== "/404.html" && !sitemap.includes(page)) warn(page, "absente du sitemap");
}

const robots = readFileSync(join(DIST, "robots.txt"), "utf8");
if (!robots.includes("Sitemap: https://")) warn("robots.txt", "sitemap non indiqué");
for (const bot of ["Googlebot", "Bingbot", "Google-Extended", "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Applebot"]) {
  if (!robots.includes(`User-agent: ${bot}\nAllow: /\n`)) warn("robots.txt", `${bot} non autorisé explicitement`);
}
if (/^Disallow:\s*\S/m.test(robots)) warn("robots.txt", "une page est interdite aux robots : ils ne verraient plus son noindex");

const sitemapXml = readFileSync(join(DIST, "sitemap.xml"), "utf8");
for (const [, loc, rest] of sitemapXml.matchAll(/<loc>([^<]+)<\/loc>(.*?)<\/url>/g)) {
  const path = new URL(loc).pathname;
  if (path.startsWith("/articles/") && path !== "/articles/" && !/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(rest)) warn(loc, "article sans lastmod dans le sitemap");
}

const llms = readFileSync(join(DIST, "llms.txt"), "utf8");
if (!llms.startsWith("# ") || !/^> /m.test(llms)) warn("llms.txt", "titre ou présentation absents");
const siteHost = new URL(sitemapXml.match(/<loc>([^<]+)/)[1]).host;
const llmsLinks = [...llms.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((match) => new URL(match[1])).filter((url) => url.host === siteHost).map((url) => url.pathname);
if (/bientôt disponible/i.test(llms)) warn("llms.txt", "mention « bientôt disponible » restante");
if (!llms.includes(PLAY_STORE_URL)) warn("llms.txt", "lien Google Play absent");
for (const path of llmsLinks) if (!report.some((entry) => entry.page === path)) warn("llms.txt", `lien cassé : ${path}`);
for (const { page, noindex } of report) {
  if (/^\/articles\/[^/]+\/$/.test(page) && !noindex && !llmsLinks.includes(page)) warn("llms.txt", `article absent : ${page}`);
}

console.table(report.map(({ page, types, noindex }) => ({ page, donnees: types.join(", "), noindex })));
console.log(`${pages.length} pages, ${sitemap.length} dans le sitemap, ${problems.length} problème(s)`);
for (const problem of problems) console.log(`- ${problem}`);
process.exitCode = problems.length ? 1 : 0;
