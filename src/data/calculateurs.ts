// Les calculateurs gratuits : textes, champs, questions fréquentes et sources (vérifiées le 16 novembre 2026).
// Les calculs sont dans src/lib/calculs.ts. Une page par calculateur : /calculateurs/<slug>/.
import { REFERENCES } from "../lib/calculs";

export interface Champ {
  id: string;
  libelle: string;
  unite: string;
  valeur: number;
  min: number;
  max: number;
  pas: number;
  aide?: string;
  /** Champ affiché seulement pour ce mode (calculateur à deux modes). */
  mode?: string;
}

export interface Calculateur {
  slug: string;
  titre: string;
  titreCourt: string;
  seoTitle: string;
  description: string;
  intro: string;
  categorie: "FinanceApplication" | "HealthApplication" | "LifestyleApplication";
  modes?: { id: string; libelle: string }[];
  champs: Champ[];
  enBref: string[];
  calcul: string[];
  faq: { question: string; reponse: string }[];
  sources: { libelle: string; url: string; date: string }[];
  /** Livres proposés en bas de page (identifiants des produits). */
  livres: string[];
  /** Articles qui renvoient vers ce calculateur. */
  articles: string[];
  /** Repère discret affiché sous le résultat (alcool). */
  repere?: { texte: string; lien: string; libelleLien: string };
}

const prixPaquet = REFERENCES.prixPaquet.toFixed(2).replace(".", ",");
const VERIF = "consulté le 16 novembre 2026";

const SMIC = {
  libelle: "Service-public.gouv.fr, « Montant du Smic » : 9,74 € net de l'heure et 1 477,93 € net par mois pour 35 h (vérifié le 1er juin 2026)",
  url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2300",
  date: VERIF,
};
const DUREE_TRAVAIL = {
  libelle: "Service-public.gouv.fr, « Durée légale du travail d'un salarié à temps complet » : 35 heures par semaine (vérifié le 25 septembre 2025)",
  url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F1911",
  date: VERIF,
};

export const CALCULATEURS: Calculateur[] = [
  {
    slug: "economies-cigarette",
    titre: "Calculateur d'économies : cigarette et vape",
    titreCourt: "Économies cigarette et vape",
    seoTitle: "Économies cigarette et vape : le calculateur gratuit",
    description: `Calculez l'argent récupéré en arrêtant ou en réduisant la cigarette ou la vape : par mois, par an et sur 5 ans, au prix moyen du paquet (${prixPaquet} €).`,
    intro: "Indiquez votre consommation : le résultat s'affiche tout de suite. Rien n'est envoyé ni enregistré, tout se calcule sur votre appareil.",
    categorie: "FinanceApplication",
    modes: [
      { id: "cigarette", libelle: "Cigarette" },
      { id: "vape", libelle: "Vape" },
    ],
    champs: [
      { id: "cigarettes", libelle: "Cigarettes par jour", unite: "par jour", valeur: 10, min: 0, max: 80, pas: 1, mode: "cigarette" },
      {
        id: "prixPaquet", libelle: "Prix du paquet de 20", unite: "€", valeur: REFERENCES.prixPaquet, min: 0, max: 30, pas: 0.01, mode: "cigarette",
        aide: `Prérempli avec le prix moyen officiel en France (${prixPaquet} €). Modifiez-le pour votre marque.`,
      },
      { id: "flacons", libelle: "Flacons ou recharges par semaine", unite: "par semaine", valeur: 3, min: 0, max: 50, pas: 1, mode: "vape" },
      {
        id: "prixFlacon", libelle: "Prix d'un flacon ou d'une recharge", unite: "€", valeur: 6, min: 0, max: 50, pas: 0.1, mode: "vape",
        aide: "6 € est un exemple : indiquez le prix que vous payez.",
      },
    ],
    enBref: [
      `Au prix moyen officiel du paquet (${prixPaquet} €), 10 cigarettes par jour représentent environ 2 290 € par an.`,
      "Le calcul fonctionne aussi pour la vape, à partir de vos flacons ou recharges par semaine.",
      "Réduire compte aussi : essayez avec un nombre plus bas pour voir la différence.",
    ],
    calcul: [
      `Cigarette : (cigarettes par jour ÷ 20) × prix du paquet = dépense par jour. Le prix proposé, ${prixPaquet} €, vient du prix moyen pondéré officiel des cigarettes en France pour 2025 (627,07 € les 1 000 cigarettes).`,
      "Vape : flacons par semaine × prix d'un flacon ÷ 7 = dépense par jour.",
      "Par an : dépense par jour × 365. Par mois : dépense par an ÷ 12. Sur 5 ans : dépense par an × 5, sans tenir compte des hausses de prix à venir.",
      "Équivalents : dépense par an ÷ Smic horaire net (9,74 €) pour les heures de travail, et dépense sur 5 ans ÷ Smic mensuel net (1 477,93 €) pour les mois.",
    ],
    faq: [
      {
        question: "Quel est le prix moyen d'un paquet de cigarettes en France ?",
        reponse: `Le prix moyen pondéré officiel des cigarettes pour 2025 est de 627,07 € les 1 000 cigarettes, soit environ ${prixPaquet} € le paquet de 20 (arrêté du 26 janvier 2026). Le prix réel dépend de la marque : vous pouvez le modifier dans le calculateur.`,
      },
      {
        question: "Le calcul marche-t-il si je réduis sans arrêter ?",
        reponse: "Oui. Indiquez le nombre de cigarettes que vous ne fumez plus chaque jour (par exemple 5 au lieu de 15) : le résultat montre ce que cette baisse vous fait récupérer.",
      },
      {
        question: "Et pour la cigarette électronique ?",
        reponse: "Choisissez « Vape », puis indiquez le nombre de flacons ou de recharges par semaine et leur prix. Le prix proposé est un exemple, à remplacer par le vôtre.",
      },
      {
        question: "Mes données sont-elles enregistrées ?",
        reponse: "Non. Le calcul se fait uniquement dans votre navigateur : rien n'est envoyé, rien n'est conservé, aucun cookie n'est déposé.",
      },
      {
        question: "Où trouver de l'aide pour arrêter de fumer ?",
        reponse: "Tabac info service propose un accompagnement gratuit par des tabacologues, au 39 89 et sur tabac-info-service.fr.",
      },
    ],
    sources: [
      {
        libelle: "Arrêté du 26 janvier 2026 constatant le prix moyen pondéré de vente au détail des produits du tabac pour 2025 (Journal officiel du 30 janvier 2026) : cigarettes, 627,07 € les 1 000",
        url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053417349",
        date: VERIF,
      },
      { libelle: "Tabac info service (Santé publique France et Assurance Maladie) : aide gratuite à l'arrêt, 39 89", url: "https://www.tabac-info-service.fr", date: VERIF },
      SMIC,
    ],
    livres: ["sors-de-ton-addiction"],
    articles: ["envie-de-fumer"],
  },

  {
    slug: "economies-alcool",
    titre: "Calculateur d'économies : alcool",
    titreCourt: "Économies alcool",
    seoTitle: "Économies alcool : le calculateur gratuit",
    description: "Calculez l'argent que vous récupérez en réduisant l'alcool : vos verres par semaine et le prix moyen d'un verre, résultat par mois et par an.",
    intro: "Indiquez le nombre de verres que vous ne buvez plus (ou que vous buvez aujourd'hui) et leur prix moyen. Rien n'est envoyé ni enregistré.",
    categorie: "FinanceApplication",
    champs: [
      { id: "verres", libelle: "Verres par semaine", unite: "par semaine", valeur: 8, min: 0, max: 100, pas: 1 },
      {
        id: "prixVerre", libelle: "Prix moyen d'un verre", unite: "€", valeur: 5, min: 0, max: 30, pas: 0.1,
        aide: "5 € est un exemple : au bar, au restaurant ou à la maison, le prix change beaucoup. Indiquez le vôtre.",
      },
    ],
    enBref: [
      "8 verres par semaine à 5 € représentent environ 2 080 € par an.",
      "Le calcul vaut aussi pour une baisse : indiquez seulement les verres en moins.",
      "Les repères de Santé publique France : 10 verres standard par semaine maximum, 2 par jour maximum, et des jours sans alcool.",
    ],
    calcul: [
      "Par semaine : verres par semaine × prix moyen d'un verre.",
      "Par an : dépense par semaine × 52. Par mois : dépense par an ÷ 12.",
      "Équivalent : dépense par an ÷ Smic horaire net (9,74 €).",
    ],
    faq: [
      {
        question: "Qu'est-ce qu'un verre standard ?",
        reponse: "Un verre standard contient 10 g d'alcool pur : par exemple un verre de vin de 10 cl, un demi de bière de 25 cl ou une dose de 3 cl d'alcool fort, servis au bar.",
      },
      {
        question: "Quels sont les repères de consommation ?",
        reponse: "Santé publique France recommande, pour limiter les risques, de ne pas dépasser 10 verres standard par semaine, 2 verres par jour, et d'avoir des jours sans alcool dans la semaine. Il n'existe pas de consommation sans risque.",
      },
      {
        question: "Quel prix indiquer pour un verre ?",
        reponse: "Votre prix moyen : celui d'un verre au bar si vous buvez surtout dehors, ou le prix de la bouteille divisé par le nombre de verres si vous buvez à la maison.",
      },
      {
        question: "Mes données sont-elles enregistrées ?",
        reponse: "Non. Le calcul se fait uniquement dans votre navigateur : rien n'est envoyé, rien n'est conservé, aucun cookie n'est déposé.",
      },
      {
        question: "Où trouver de l'aide pour réduire ?",
        reponse: "Alcool info service répond gratuitement et anonymement au 0 980 980 930 et sur alcool-info-service.fr.",
      },
    ],
    sources: [
      {
        libelle: "Santé publique France, « Comment réduire les risques de la consommation d'alcool » : repères de consommation (page mise à jour le 26 janvier 2026)",
        url: "https://www.santepubliquefrance.fr/alcool/comment-reduire-les-risques-de-la-consommation-dalcool",
        date: VERIF,
      },
      { libelle: "Alcool info service (Santé publique France) : aide gratuite et anonyme", url: "https://www.alcool-info-service.fr", date: VERIF },
      SMIC,
    ],
    livres: ["sors-de-ton-addiction"],
    articles: ["reduire-alcool"],
    repere: {
      texte: "Repères de Santé publique France : 10 verres standard par semaine maximum, 2 par jour maximum, et pas tous les jours.",
      lien: "https://www.santepubliquefrance.fr/alcool/comment-reduire-les-risques-de-la-consommation-dalcool",
      libelleLien: "En savoir plus",
    },
  },

  {
    slug: "temps-ecran",
    titre: "Calculateur de temps d'écran",
    titreCourt: "Temps d'écran",
    seoTitle: "Temps d'écran : calculez le temps récupéré",
    description: "Calculez gratuitement votre temps d'écran sur un an, en heures, jours et semaines, et le temps que vous récupérez avec un objectif quotidien plus bas.",
    intro: "Indiquez votre temps actuel sur le téléphone et l'objectif que vous visez. Rien n'est envoyé ni enregistré.",
    categorie: "LifestyleApplication",
    champs: [
      {
        id: "heures", libelle: "Temps sur le téléphone aujourd'hui", unite: "h par jour", valeur: 4, min: 0, max: 24, pas: 0.25,
        aide: "Votre moyenne quotidienne : sur iPhone dans Réglages > Temps d'écran, sur Android dans Paramètres > Bien-être numérique.",
      },
      { id: "objectif", libelle: "Objectif visé", unite: "h par jour", valeur: 2.5, min: 0, max: 24, pas: 0.25 },
    ],
    enBref: [
      "4 heures par jour sur le téléphone, c'est 1 460 heures par an, soit près de 61 jours complets.",
      "Passer à 2 h 30 par jour fait récupérer environ 548 heures par an.",
      "Pas besoin de tout supprimer : un objectif réaliste suffit pour libérer du temps.",
    ],
    calcul: [
      "Par an : heures par jour × 365. En jours : heures par an ÷ 24. En semaines : jours ÷ 7.",
      "Temps récupéré : (temps actuel − objectif) × 365.",
      "Équivalent : temps récupéré ÷ 35 h, la durée légale d'une semaine de travail à temps plein.",
    ],
    faq: [
      {
        question: "Comment connaître mon temps d'écran ?",
        reponse: "Sur iPhone : Réglages > Temps d'écran. Sur Android : Paramètres > Bien-être numérique et contrôle parental. Prenez la moyenne quotidienne de la semaine.",
      },
      {
        question: "Quel objectif choisir ?",
        reponse: "Un objectif atteignable : par exemple 30 minutes à 1 heure de moins que votre moyenne actuelle. Vous pourrez le baisser ensuite.",
      },
      {
        question: "Le temps d'écran compte-t-il le travail ?",
        reponse: "Le calculateur compte ce que vous indiquez. Pour mesurer le temps que vous voulez réduire, indiquez plutôt le temps passé hors travail.",
      },
      {
        question: "Mes données sont-elles enregistrées ?",
        reponse: "Non. Le calcul se fait uniquement dans votre navigateur : rien n'est envoyé, rien n'est conservé, aucun cookie n'est déposé.",
      },
    ],
    sources: [DUREE_TRAVAIL],
    livres: ["sors-de-ton-addiction", "aiguise-ton-mental"],
    articles: ["decrocher-du-telephone"],
  },

  {
    slug: "temps-projet",
    titre: "Calculateur de temps pour un projet",
    titreCourt: "Temps pour un projet",
    seoTitle: "Temps pour un projet : le calculateur gratuit",
    description: "Calculez gratuitement le temps que vous consacrez à un projet personnel : minutes par jour et jours par semaine, résultat en heures sur 1 mois, 6 mois et 1 an.",
    intro: "Indiquez le temps que vous pouvez donner à votre projet. Rien n'est envoyé ni enregistré.",
    categorie: "LifestyleApplication",
    champs: [
      { id: "minutes", libelle: "Minutes par jour", unite: "min", valeur: 20, min: 0, max: 600, pas: 5 },
      { id: "jours", libelle: "Jours par semaine", unite: "jours", valeur: 5, min: 0, max: 7, pas: 1 },
    ],
    enBref: [
      "20 minutes par jour, 5 jours par semaine, c'est environ 87 heures en un an.",
      "Autant que 2,5 semaines de travail à temps plein, sans bouleverser vos journées.",
      "Le calculateur mesure le temps investi : le résultat dépend ensuite de votre projet et de votre régularité.",
    ],
    calcul: [
      "Par semaine : minutes par jour × jours par semaine ÷ 60.",
      "En 1 an : heures par semaine × 52. En 1 mois : heures par an ÷ 12. En 6 mois : heures par mois × 6.",
      "Équivalent : heures par an ÷ 35 h, la durée légale d'une semaine de travail à temps plein.",
    ],
    faq: [
      {
        question: "Combien de temps par jour pour avancer sur un projet ?",
        reponse: "Il n'y a pas de durée idéale. Un temps court et régulier, que vous tenez même les jours chargés, compte souvent plus qu'une longue séance de temps en temps.",
      },
      {
        question: "Le calculateur promet-il un résultat ?",
        reponse: "Non. Il montre le temps que vous investissez, pas ce que vous obtiendrez : cela dépend du projet, de votre point de départ et de votre régularité.",
      },
      {
        question: "Et si je rate des jours ?",
        reponse: "C'est normal. Indiquez une moyenne réaliste de jours par semaine : le résultat restera juste, et un jour manqué n'efface pas le temps déjà investi.",
      },
      {
        question: "Mes données sont-elles enregistrées ?",
        reponse: "Non. Le calcul se fait uniquement dans votre navigateur : rien n'est envoyé, rien n'est conservé, aucun cookie n'est déposé.",
      },
    ],
    sources: [DUREE_TRAVAIL],
    livres: ["ose-ton-projet"],
    articles: ["procrastination", "motivation-habitude"],
  },
];

export const calculateurPour = (slug: string) => CALCULATEURS.find((c) => c.slug === slug);
export const calculateurDeLArticle = (articleId: string) => CALCULATEURS.find((c) => c.articles.includes(articleId));
