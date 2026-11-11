import type { APIRoute } from "astro";
import { ARTICLE_CATEGORIES, SLOGAN } from "../data/site";
import { getVisibleArticles } from "../lib/articles";
import { getProduits, productName } from "../lib/produits";
import { absolute } from "../lib/seo";

/** Format llmstxt.org : présentation courte, puis liens commentés vers les pages principales et chaque article. Généré au build. */
export const GET: APIRoute = async () => {
  const articles = (await getVisibleArticles()).filter((article) => !article.data.draft);
  const produits = await getProduits();
  const line = (label: string, path: string, note: string) => `- [${label}](${absolute(path)}) : ${note}`;

  const sections = [
    `# Addictive

> ${SLOGAN}. Addictive aide à construire de meilleures habitudes : discipline, motivation, remise au sport et sobriété, avec bienveillance et sans jugement. Le site réunit une boutique (programmes et objets), des articles fondés sur des sources vérifiées et la présentation de l'appli Addictive. Les contenus donnent des informations générales et ne remplacent pas l'avis d'un professionnel de santé.`,
    `## Pages principales

${[
  line("L'appli Addictive", "/appli/", "suivre ses habitudes, ses séries et sa progression (bientôt disponible)"),
  line("Boutique", "/boutique/", "programmes, cartes à imprimer et objets"),
  line("À propos", "/a-propos/", "la mission et les valeurs d'Addictive"),
  line("Questions fréquentes", "/faq/", "commandes, téléchargement, délais, paiement, données personnelles"),
  line("Besoin d'aide ?", "/aide/", "numéros d'urgence et services d'écoute gratuits"),
  line("Contact", "/contact/", "écrire à l'équipe"),
].join("\n")}`,
    `## Boutique

${produits.map((produit) => line(productName(produit), `/boutique/${produit.id}/`, produit.data.summary)).join("\n")}`,
    `## Articles

${articles
  .map((article) => {
    const category = ARTICLE_CATEGORIES.find((item) => item.id === article.data.category);
    return line(article.data.title, `/articles/${article.id}/`, `${article.data.description} (${category?.label})`);
  })
  .join("\n")}`,
  ];
  return new Response(`${sections.join("\n\n")}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
