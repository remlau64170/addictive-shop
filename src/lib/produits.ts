import { getCollection, type CollectionEntry } from "astro:content";

export type Produit = CollectionEntry<"produits">;

/** Produits du plus récent au plus ancien : `order` croissant, seul classement des nouveautés pour l'instant. */
export async function getProduits() {
  return (await getCollection("produits")).sort((a, b) => a.data.order - b.data.order);
}

export function productName(produit: Produit) {
  return `${produit.data.kind} « ${produit.data.title} »`;
}

/** Aucun prix n'est inventé : tant que `price` est vide, la page affiche « Prix à définir ». */
export function formatPrice(price: number | null) {
  if (price === null) return "Prix à définir";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(price);
}
