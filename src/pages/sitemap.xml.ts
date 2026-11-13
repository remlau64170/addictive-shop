import type { APIRoute } from "astro";
import { getVisibleArticles, lastModified } from "../lib/articles";
import { getProduits } from "../lib/produits";
import { absolute } from "../lib/seo";

/** Seules les pages utiles aux moteurs de recherche : ni panier, ni recherche, ni pages à rédiger, ni brouillons. */
export const GET: APIRoute = async () => {
  const articles = (await getVisibleArticles()).filter((article) => !article.data.draft);
  const paths = [
    "/",
    "/boutique/",
    "/boutique/produits-numeriques/",
    "/boutique/produits-physiques/",
    ...(await getProduits()).map((produit) => `/boutique/${produit.id}/`),
    "/articles/",
    ...articles.map((article) => `/articles/${article.id}/`),
    "/appli/",
    "/a-propos/",
    "/faq/",
    "/contact/",
    "/aide/",
    "/mentions-legales/",
    "/cgv/",
    "/confidentialite/",
    "/cookies/",
  ];
  const lastmod = new Map(articles.map((article) => [`/articles/${article.id}/`, lastModified(article).toISOString().slice(0, 10)]));
  const urls = paths
    .map((path) => `  <url><loc>${absolute(path)}</loc>${lastmod.has(path) ? `<lastmod>${lastmod.get(path)}</lastmod>` : ""}</url>`)
    .join("\n");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
