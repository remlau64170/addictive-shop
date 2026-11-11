import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const articles = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(["envies-et-addictions", "sortir-addiction", "mental-discipline", "sport-corps", "temoignages"]),
    date: z.coerce.date(),
    /** Date de dernière mise à jour, si elle diffère de la date de publication. */
    updated: z.coerce.date().optional(),
    /** Brouillon : visible avec `npm run dev`, absent du site construit. */
    draft: z.boolean().default(false),
    /** Titre court pour les moteurs de recherche ; sinon, le titre de l'article. */
    seoTitle: z.string().optional(),
    /** Image de couverture, dans public/articles/ (une version -800 existe pour les listes). */
    cover: z.object({ src: z.string(), alt: z.string() }).optional(),
    /** Produit proposé dans « Pour aller plus loin » (nom du fichier, sans .md). */
    related: z.string().optional(),
  }),
});

const produits = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/produits" }),
  schema: z.object({
    title: z.string(),
    /** Nom complet affiché ; sinon « Type « titre » ». */
    name: z.string().optional(),
    kind: z.string(),
    shelf: z.enum(["numeriques", "physiques"]),
    summary: z.string(),
    /** Visuels de démonstration, dans public/produits/ : la première image sert aussi aux cartes. */
    images: z.array(z.object({ src: z.string(), alt: z.string() })).min(3).max(4),
    /** En euros ; vide tant que le prix n'est pas décidé. */
    price: z.number().positive().nullable().default(null),
    contains: z.array(z.string()).min(1),
    specs: z.array(z.object({ label: z.string(), value: z.string() })).min(1),
    sizes: z.array(z.string()).optional(),
    order: z.number().int(),
  }),
});

export const collections = { articles, produits };
