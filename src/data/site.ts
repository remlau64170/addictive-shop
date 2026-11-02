export const SLOGAN = "Sois addict à ta sobriété";

export const ARTICLE_CATEGORIES = [
  {
    id: "sortir-addiction",
    label: "Sortir d'une addiction",
    intro: "Des repères concrets pour avancer, un jour après l'autre.",
  },
  {
    id: "mental-discipline",
    label: "Mental et discipline",
    intro: "Des habitudes simples pour renforcer votre motivation.",
  },
  {
    id: "sport-corps",
    label: "Sport et corps",
    intro: "Bouger à votre rythme et prendre soin de vous.",
  },
  {
    id: "temoignages",
    label: "Témoignages",
    intro: "Des parcours pour vous rappeler que vous n'êtes pas seul·e.",
  },
] as const;

export const SHOP_SHELVES = [
  { id: "numeriques", label: "Produits numériques" },
  { id: "physiques", label: "Produits physiques" },
] as const;

/** Besoins de la boutique : les catégories d'articles, sans les témoignages. */
export const SHOP_NEEDS = ARTICLE_CATEGORIES.filter((category) => category.id !== "temoignages");

export const LEGAL_PAGES = [
  { slug: "mentions-legales", label: "Mentions légales" },
  { slug: "cgv", label: "CGV" },
  { slug: "confidentialite", label: "Confidentialité" },
  { slug: "cookies", label: "Cookies" },
  { slug: "contact", label: "Contact" },
] as const;
