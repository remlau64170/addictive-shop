/**
 * Avis clients : uniquement des avis réels, ajoutés à la main dans src/data/avis.json avec l'accord de leurs auteurs.
 * Format : { produit (nom du fichier produit), prenom (prénom ou initiale), note (1 à 5), texte, date (AAAA-MM), verifie }.
 */
import data from "../data/avis.json";

export type Avis = {
  produit: string;
  prenom: string;
  note: number;
  texte: string;
  date: string;
  verifie: boolean;
};

const AVIS = data as Avis[];

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** Avis d'un produit, les plus récents d'abord ; les notes hors de 1 à 5 sont écartées. */
export function avisDuProduit(produit: string) {
  return AVIS.filter((avis) => avis.produit === produit && avis.note >= 1 && avis.note <= 5).sort((a, b) => b.date.localeCompare(a.date));
}

export function noteMoyenne(avis: Avis[]) {
  return Math.round((avis.reduce((somme, item) => somme + item.note, 0) / avis.length) * 10) / 10;
}

/** Arrondi à la demi-étoile la plus proche : 4,2 -> 4 ; 4,3 et 4,5 -> 4,5 ; 4,8 -> 5. */
export function demiEtoiles(note: number) {
  return Math.round(note * 2) / 2;
}

/** « 2026-11 » -> « novembre 2026 » */
export function moisAnnee(date: string) {
  const [annee, mois] = date.split("-");
  return `${MOIS[Number(mois) - 1] ?? ""} ${annee}`.trim();
}
