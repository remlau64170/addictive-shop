/**
 * Contrôle le site construit (dist/) : `npm run build`, puis `node scripts/verifier-seo.mjs`.
 * Titres et descriptions uniques, un seul H1, ordre des titres, textes alternatifs, liens internes, sitemap et données structurées.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const problems = [];
const warn = (page, message) => problems.push(`${page} : ${message}`);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const file = join(dir, name);
    return statSync(file).isDirectory() ? walk(file) : [file];
  });
}

const unescape = (text) => text.replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
const meta = (html, attr, name) => unescape(html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1] ?? "");

const REQUIRED = {
  Organization: ["name", "url", "logo"],
  WebSite: ["name", "url"],
  Product: ["name", "description", "image", "offers"],
  Article: ["headline", "datePublished", "author", "image"],
  FAQPage: ["mainEntity"],
  BreadcrumbList: ["itemListElement"],
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
    if (/aggregateRating|"review"/.test(raw)) warn(page, "note ou avis dans le JSON-LD");
    if (data["@type"] === "Product") {
      const { price, priceCurrency, availability } = data.offers;
      if (!/^\d+\.\d{2}$/.test(price ?? "") || priceCurrency !== "EUR" || !availability) warn(page, `offre incomplète (${price})`);
    }
    if (data["@type"] === "BreadcrumbList") {
      data.itemListElement.forEach((item, index) => {
        if (item.position !== index + 1 || !item.name || !item.item?.startsWith("https://")) warn(page, "fil d'Ariane incorrect");
      });
    }
    if (data["@type"] === "FAQPage") {
      for (const { name, acceptedAnswer } of data.mainEntity) {
        if (!html.includes(name) && !unescape(html).includes(name)) warn(page, `question absente de la page : ${name}`);
        if (!unescape(html).includes(acceptedAnswer.text)) warn(page, `réponse absente de la page : ${name}`);
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
  if (description.length < 50 || description.length > 170) warn(page, `description de ${description.length} caractères`);
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
  const expected = page === "/" ? ["Organization", "WebSite"] : page === "/faq/" ? ["FAQPage"] : /^\/boutique\/(?!produits-)[^/]+\/$/.test(page) ? ["Product"] : [];
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

console.table(report.map(({ page, types, noindex }) => ({ page, donnees: types.join(", "), noindex })));
console.log(`${pages.length} pages, ${sitemap.length} dans le sitemap, ${problems.length} problème(s)`);
for (const problem of problems) console.log(`- ${problem}`);
process.exitCode = problems.length ? 1 : 0;
