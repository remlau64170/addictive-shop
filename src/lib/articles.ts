import { getCollection } from "astro:content";

/** Articles visibles : les brouillons n'apparaissent qu'en développement, jamais dans le site construit. */
export async function getVisibleArticles() {
  const articles = await getCollection("articles", ({ data }) => import.meta.env.DEV || !data.draft);
  return articles.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}
