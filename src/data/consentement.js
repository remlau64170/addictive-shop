// Accord pour un contenu numérique livré tout de suite : accord exprès à l'exécution immédiate et renonciation
// expresse au droit de rétractation (article L221-28, 13° du Code de la consommation).
// Formulé pour un livre, plusieurs livres ou le pack. Ce texte unique sert partout : la case de la fiche produit, la preuve enregistrée dans Stripe,
// la facture et la page de remerciement. Ne pas le modifier à un seul endroit.
export const CONSENTEMENT_RETRACTATION =
  "Je demande l'accès immédiat à mes livres numériques et je renonce à mon droit de rétractation pour ces contenus.";

/** Valeur envoyée par la case cochée. */
export const CONSENTEMENT_VALEUR = "oui";

/**
 * Panier mixte (livre numérique + article livré) : même accord, précisé pour ne viser que les contenus numériques.
 * Les articles livrés gardent leur délai de rétractation de 14 jours.
 */
export const CONSENTEMENT_RETRACTATION_MIXTE = `${CONSENTEMENT_RETRACTATION} Cet accord concerne uniquement les contenus numériques : les articles livrés gardent leur délai de rétractation de 14 jours.`;

/** Mention des articles livrés, sur la facture et dans le panier. */
export const RETRACTATION_PHYSIQUE = "Articles livrés : délai de rétractation de 14 jours à compter de leur réception.";

/** Le texte de la case selon le contenu du panier (le serveur fait le même choix et enregistre ce texte exact). */
export const texteConsentement = (physique) => (physique ? CONSENTEMENT_RETRACTATION_MIXTE : CONSENTEMENT_RETRACTATION);
