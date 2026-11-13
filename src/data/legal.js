// Informations légales de la boutique, partagées par les pages légales, le panier et les Functions (facture).
// Une valeur à null s'affiche sur le site comme un repère visible « [À COMPLÉTER : …] » : ne jamais inventer ces données.
// Liste complète des repères : docs/pages-legales.md.

/** L'entrepreneur individuel (micro-entreprise en cours de création). */
export const EDITEUR = {
  nom: null, // prénom et nom, suivis de « EI » sur le site
  adresse: null, // adresse de l'entreprise (domicile ou domiciliation)
  telephone: null,
  siret: null,
  immatriculation: null, // registre et numéro indiqués sur l'attestation d'immatriculation
  email: "contact@addictive-app.com",
};

/** Directeur de la publication : en principe l'entrepreneur lui-même. */
export const DIRECTEUR_PUBLICATION = null;

/** Hébergeur (vérifié sur cloudflare.com/website-terms, novembre 2026). */
export const HEBERGEUR = {
  nom: "Cloudflare, Inc.",
  adresse: "101 Townsend St, San Francisco, CA 94107, États-Unis",
  telephone: "+1 (650) 319-8930",
  site: "https://www.cloudflare.com",
};

/** Médiateur de la consommation choisi (nom, adresse postale, site de saisie). */
export const MEDIATEUR = null;

/** Adresse où renvoyer un article livré en cas de rétractation. */
export const ADRESSE_RETOUR = null;

/** Messagerie qui reçoit les e-mails envoyés à contact@addictive-app.com (destinataire des messages de contact). */
export const MESSAGERIE = null;

export const MENTION_TVA = "TVA non applicable, art. 293 B du CGI";

/** Version des CGV : à changer à chaque modification. Elle est enregistrée avec chaque commande. */
export const CGV_VERSION = "2026-11-13";
export const CGV_VERSION_TEXTE = "13 novembre 2026";

/** Case du panier, non cochée par défaut, obligatoire pour payer. */
export const ACCEPTATION_CGV = "J'ai lu et j'accepte les conditions générales de vente.";
export const ACCEPTATION_CGV_VALEUR = "oui";

/** Repère visible pour une donnée manquante. */
export const aCompleter = (quoi) => `[À COMPLÉTER : ${quoi}]`;
