import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const articles = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(["sortir-addiction", "mental-discipline", "sport-corps", "temoignages"]),
    date: z.coerce.date(),
    /** Brouillon : visible avec `npm run dev`, absent du site construit. */
    draft: z.boolean().default(false),
  }),
});

const produits = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/produits" }),
  schema: z.object({
    title: z.string(),
    kind: z.string(),
    shelf: z.enum(["numerique", "objets"]),
    summary: z.string(),
    /** Visuel provisoire, dans public/visuels/. */
    image: z.string(),
    order: z.number().int(),
  }),
});

export const collections = { articles, produits };
