import { getCollection } from "astro:content";

/** Articles visibles : les brouillons n'apparaissent qu'en développement, jamais dans le site construit. */
export async function getVisibleArticles() {
  const articles = await getCollection("articles", ({ data }) => import.meta.env.DEV || !data.draft);
  return articles.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

type Article = Awaited<ReturnType<typeof getVisibleArticles>>[number];

/** Date de dernière modification : la mise à jour si elle existe, sinon la publication. */
export const lastModified = (article: Article) => article.data.updated ?? article.data.date;

/** « 11 novembre 2026 » : les dates sont enregistrées à minuit UTC, on les lit donc en UTC. */
export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);

/** « À lire aussi » : trois autres articles, ceux de la même catégorie d'abord, puis les plus récents. */
export function relatedArticles(article: Article, all: Article[], count = 3) {
  const others = all.filter((other) => other.id !== article.id);
  const sameCategory = others.filter((other) => other.data.category === article.data.category);
  return [...sameCategory, ...others.filter((other) => !sameCategory.includes(other))].slice(0, count);
}

/** Texte brut d'un morceau de Markdown : liens, gras et italique sans leurs signes. */
const plain = (markdown: string) =>
  markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

/** Questions et réponses de la section « Questions fréquentes » (### = question, texte qui suit = réponse). */
export function faqFromBody(body: string | undefined) {
  const start = body?.search(/^## Questions fréquentes\s*$/m) ?? -1;
  if (!body || start < 0) return [];
  const afterTitle = body.slice(body.indexOf("\n", start) + 1);
  const next = afterTitle.search(/^## /m);
  const section = next < 0 ? afterTitle : afterTitle.slice(0, next);
  return section
    .split(/^### /m)
    .slice(1)
    .map((block) => {
      const [question, ...answer] = block.split("\n");
      // Les notes en italique après la FAQ (avertissement santé, mention de partenariat) ne font pas partie de la réponse.
      const text = answer.filter((line) => !/^\*[^*].*\*\s*$/.test(line.trim())).join("\n");
      return { question: plain(question), answer: plain(text) };
    })
    .filter((item) => item.question && item.answer);
}
