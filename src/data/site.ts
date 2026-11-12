export const SLOGAN = "Sois addict à ta sobriété";

export const ARTICLE_CATEGORIES = [
  {
    id: "envies-et-addictions",
    label: "Envies et addictions",
    intro: "Comprendre les envies, les laisser passer et rebondir après un écart.",
  },
  {
    id: "mental-discipline",
    label: "Mental et discipline",
    intro: "Des habitudes simples pour renforcer votre motivation et tenir vos objectifs.",
  },
  {
    id: "sport-corps",
    label: "Sport et corps",
    intro: "Reprendre le sport à votre rythme et prendre soin de vous.",
  },
  {
    id: "sortir-addiction",
    label: "Sortir d'une addiction",
    intro: "Des repères concrets pour avancer vers la sobriété, un jour après l'autre.",
  },
  {
    id: "temoignages",
    label: "Témoignages",
    intro: "Des parcours pour vous rappeler que vous n'êtes pas seul·e.",
  },
] as const;

export const SHOP_SHELVES = [
  { id: "numeriques", label: "Produits numériques", href: "/boutique/produits-numeriques/" },
  { id: "physiques", label: "Produits physiques", href: "/boutique/produits-physiques/" },
] as const;

export const LEGAL_PAGES = [
  { slug: "mentions-legales", label: "Mentions légales" },
  { slug: "cgv", label: "CGV" },
  { slug: "confidentialite", label: "Confidentialité" },
  { slug: "cookies", label: "Cookies" },
] as const;

/** L'appli Addictive : publiée sur Google Play depuis le 4 novembre 2026, et en version web pour iPhone et ordinateur. */
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.addictive_app.twa";
export const WEB_APP_URL = "https://addictive-app.com";

/**
 * Achat en ligne. Désactivé sur le site public tant que la boutique n'est pas ouverte (« La boutique ouvre bientôt »).
 * Pour l'activer : variable d'environnement PUBLIC_BOUTIQUE_OUVERTE=true au moment de la construction du site,
 * ET CHECKOUT_ENABLED=true côté Functions (le serveur refuse tout paiement sans ce second réglage).
 * Seuls les produits numériques sont achetables pour l'instant ; les produits physiques viendront avec Printful.
 */
export const BOUTIQUE_OUVERTE = import.meta.env.PUBLIC_BOUTIQUE_OUVERTE === "true";
