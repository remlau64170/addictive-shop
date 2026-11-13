// Règles de vente partagées par le site (affichage) et les Functions (calcul qui fait foi).
// Le navigateur n'affiche que des informations : prix, livraison et livraison offerte sont toujours recalculés côté serveur.

/** Livraison des produits physiques : forfait par commande (pas par article). Montant en centimes. */
export const LIVRAISON = {
  montant: 490,
  delaiJours: { min: 4, max: 7 },
  libelle: "Livraison",
  libelleOfferte: "Livraison offerte",
  // France, Belgique, Luxembourg, Allemagne, Espagne, Italie, Pays-Bas, Portugal (Suisse exclue : port double et douane).
  // Le forfait ne couvre pas tout le port réel (5,39 € TTC pour 1 article, 6,89 € pour 2) : la différence est absorbée.
  pays: ["FR", "BE", "LU", "DE", "ES", "IT", "NL", "PT"],
};

/** Produits physiques réellement en vente (les autres restent « La boutique ouvre bientôt »). */
export const PHYSIQUES_EN_VENTE = {
  "t-shirt-sois-addict": {
    couleurs: [
      { id: "noir", nom: "Noir" },
      { id: "blanc", nom: "Blanc" },
    ],
    tailles: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
    // Bella+Canvas 3001, mesures du vêtement à plat (Printful), arrondies au centimètre.
    guideTailles: {
      XS: { largeur: 42, longueur: 69 },
      S: { largeur: 46, longueur: 71 },
      M: { largeur: 51, longueur: 74 },
      L: { largeur: 56, longueur: 76 },
      XL: { largeur: 61, longueur: 79 },
      "2XL": { largeur: 66, longueur: 81 },
      "3XL": { largeur: 71, longueur: 84 },
      "4XL": { largeur: 76, longueur: 86 },
    },
  },
};

/** Quantités autorisées par ligne du panier. */
export const QUANTITE_MAX = 10;
export const LIGNES_MAX = 20;

/**
 * Livraison offerte si le panier contient au moins un produit physique ET au moins un produit numérique.
 * Le serveur applique cette règle ; le navigateur s'en sert seulement pour afficher le bon message.
 */
export function livraisonOfferte({ numerique, physique }) {
  return physique > 0 && numerique > 0;
}

export const formatEuros = (centimes) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: centimes % 100 ? 2 : 0 }).format(centimes / 100);
