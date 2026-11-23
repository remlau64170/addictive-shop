// Informations légales de la boutique, partagées par les pages légales, le panier et les Functions (facture).
// Une valeur à null s'affiche sur le site comme un repère visible « [À COMPLÉTER : …] » : ne jamais inventer ces données.
// Liste des choix et de ce qui reste à mettre à jour : docs/pages-legales.md.

/** L'entrepreneur individuel (micro-entreprise), d'après les informations données par Rémy le 23 novembre 2026. Pas de téléphone affiché (choix de Rémy). */
export const EDITEUR = {
  nom: "Rémy ALLIOD",
  nomEI: "Rémy ALLIOD EI",
  nomCommercial: "ADDICTIVE",
  adresse: "Adresse communiquée sur demande à contact@addictive-app.com",
  siret: "941 433 369 00027",
  siren: "941 433 369",
  ape: "4791B",
  immatriculation: "Inscrit au Registre national des entreprises (RNE)",
  email: "contact@addictive-app.com",
};

/** Directeur de la publication. */
export const DIRECTEUR_PUBLICATION = "Rémy ALLIOD";

/** Hébergeur (vérifié sur cloudflare.com/website-terms, novembre 2026). */
export const HEBERGEUR = {
  nom: "Cloudflare, Inc.",
  adresse: "101 Townsend St, San Francisco, CA 94107, États-Unis",
  telephone: "+1 (650) 319-8930",
  site: "https://www.cloudflare.com",
};

/** Médiateur de la consommation. À remplacer par les coordonnées de CM2C après l'adhésion, avant d'ouvrir les paiements. */
export const MEDIATEUR = "En cours de désignation";

/** Adresse de retour d'un article livré : jamais affichée, donnée par e-mail (dépend du centre Printful ou de Rémy). */
export const ADRESSE_RETOUR = "communiquée par e-mail lors de la demande de rétractation";

/** Réception des e-mails de contact@addictive-app.com (enregistrements MX du domaine, vérifiés le 13 novembre 2026). */
export const MESSAGERIE = "service de routage d'e-mails de Cloudflare (Email Routing), qui les transfère vers la boîte de réception de l'éditeur";

export const MENTION_TVA = "TVA non applicable, art. 293 B du CGI";

/** Version des CGV : à changer à chaque modification. Elle est enregistrée avec chaque commande. */
export const CGV_VERSION = "2026-11-23";
export const CGV_VERSION_TEXTE = "23 novembre 2026";

/** Case du panier, non cochée par défaut, obligatoire pour payer. */
export const ACCEPTATION_CGV = "J'ai lu et j'accepte les conditions générales de vente.";
export const ACCEPTATION_CGV_VALEUR = "oui";

/** Repère visible pour une donnée manquante. */
export const aCompleter = (quoi) => `[À COMPLÉTER : ${quoi}]`;
