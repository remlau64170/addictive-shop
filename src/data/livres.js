// Livres numériques « Série 60 » : fichiers livrés après paiement. Partagé par le site, les Functions et les scripts.
// Les PDF sont dans prive/pdf/ (jamais dans git, jamais publics) et, en ligne, dans le stockage privé FICHIERS
// sous la clé « pdf:<cle> ». Chaque achat donne la version téléphone et la version A4.

const fichiers = (slug, tel, a4) => [
  { version: "telephone", libelle: "Version téléphone", cle: `${slug}-telephone`, source: tel.source, pages: tel.pages },
  { version: "a4", libelle: "Version A4 à imprimer", cle: `${slug}-a4`, source: a4.source, pages: a4.pages },
];

export const LIVRES = {
  "sors-de-ton-addiction": {
    titre: "Sors de ton addiction",
    remplissable: true,
    fichiers: fichiers("sors-de-ton-addiction", { source: "sors-de-ton-addiction-telephone-v5.pdf", pages: 119 }, { source: "sors-de-ton-addiction-A4-v3.pdf", pages: 93 }),
  },
  "aiguise-ton-mental": {
    titre: "Aiguise ton mental",
    remplissable: true,
    fichiers: fichiers("aiguise-ton-mental", { source: "aiguise-ton-mental-telephone-v3.pdf", pages: 85 }, { source: "aiguise-ton-mental-A4-v3.pdf", pages: 83 }),
  },
  "ose-ton-projet": {
    titre: "Ose ton projet",
    remplissable: true,
    fichiers: fichiers("ose-ton-projet", { source: "ose-ton-projet-telephone-v5.pdf", pages: 89 }, { source: "ose-ton-projet-A4-v5.pdf", pages: 88 }),
  },
};

/** Packs : un produit qui donne accès à plusieurs livres. */
export const PACKS = {
  "pack-serie-60": { livres: ["sors-de-ton-addiction", "aiguise-ton-mental", "ose-ton-projet"] },
};

/** Fichiers livrés pour un produit (livre seul ou pack), avec le titre du livre. */
export function fichiersDuProduit(slug) {
  const livres = PACKS[slug]?.livres ?? (LIVRES[slug] ? [slug] : []);
  return livres.flatMap((l) => LIVRES[l].fichiers.map((f) => ({ ...f, livre: LIVRES[l].titre })));
}

/** Livres déjà contenus dans un pack présent dans le panier (pour proposer de retirer le doublon). */
export function livresEnDouble(ids) {
  const dansPacks = new Set(ids.flatMap((id) => PACKS[id]?.livres ?? []));
  return ids.filter((id) => dansPacks.has(id));
}
