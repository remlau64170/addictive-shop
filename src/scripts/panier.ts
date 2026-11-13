// Panier gardé dans ce navigateur (localStorage), sans compte client. Il ne contient que des choix :
// le prix, la livraison et la livraison offerte sont toujours recalculés par le serveur au moment de payer.
export interface LignePanier {
  id: string;
  couleur?: string;
  taille?: string;
  quantite: number;
}

const CLE = "addictive-panier";
const EVENEMENT = "panier:change";

export function lirePanier(): LignePanier[] {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE) ?? "[]");
    return Array.isArray(brut) ? brut.filter((l) => l && typeof l.id === "string" && Number(l.quantite) > 0) : [];
  } catch {
    return [];
  }
}

export function ecrirePanier(lignes: LignePanier[]) {
  try {
    localStorage.setItem(CLE, JSON.stringify(lignes));
  } catch {
    // Stockage indisponible (navigation privée stricte) : le panier reste vide.
  }
  window.dispatchEvent(new CustomEvent(EVENEMENT));
}

const meme = (a: LignePanier, b: Omit<LignePanier, "quantite">) => a.id === b.id && a.couleur === b.couleur && a.taille === b.taille;

export function ajouterAuPanier(ligne: Omit<LignePanier, "quantite">, numerique = false) {
  const panier = lirePanier();
  const existante = panier.find((l) => meme(l, ligne));
  if (existante) {
    // Un livre numérique ne s'achète qu'une fois par commande.
    if (!numerique) existante.quantite = Math.min(10, existante.quantite + 1);
  } else {
    panier.push({ ...ligne, quantite: 1 });
  }
  ecrirePanier(panier);
}

export const nombreArticles = (panier = lirePanier()) => panier.reduce((total, l) => total + l.quantite, 0);

export function surChangementPanier(rappel: () => void) {
  window.addEventListener(EVENEMENT, rappel);
  // Autre onglet : l'événement « storage » signale la modification.
  window.addEventListener("storage", (event) => {
    if (event.key === CLE) rappel();
  });
}
