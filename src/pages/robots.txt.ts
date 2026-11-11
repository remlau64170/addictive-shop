import type { APIRoute } from "astro";
import { absolute } from "../lib/seo";

/** Moteurs de recherche et assistants IA admis explicitement. Les pages « à rédiger » restent hors index par leur balise noindex, qu'un robot doit pouvoir lire. */
const ROBOTS = [
  "Googlebot",
  "Bingbot",
  "Applebot",
  "Google-Extended",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
];

export const GET: APIRoute = () => {
  const groups = ROBOTS.map((name) => `User-agent: ${name}\nAllow: /\n`).join("\n");
  return new Response(`${groups}\nUser-agent: *\nAllow: /\n\nSitemap: ${absolute("/sitemap.xml")}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
