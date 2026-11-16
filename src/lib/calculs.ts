// Calculs des calculateurs gratuits. Tout se fait dans le navigateur : aucune donnée n'est envoyée ni conservée.
// Fichier partagé par les pages (affichage initial, sans JavaScript) et par le script du navigateur (résultat en direct).

/** Références officielles utilisées dans les calculs (sources et dates dans src/data/calculateurs.ts). */
export const REFERENCES = {
  /** Prix moyen pondéré de vente au détail des cigarettes pour 2025 : 627,07 € les 1 000 (arrêté du 26 janvier 2026). */
  prixPaquet: Math.round((627.07 / 1000) * 20 * 100) / 100, // 12,54 € le paquet de 20
  /** Smic horaire net indicatif et Smic mensuel net pour 35 h (service-public.gouv.fr, vérifié le 1er juin 2026). */
  smicHoraireNet: 9.74,
  smicMensuelNet: 1477.93,
  /** Durée légale du travail à temps complet (service-public.gouv.fr). */
  heuresSemaineTravail: 35,
};

export type Valeurs = Record<string, number | string>;
export interface Resultat {
  /** Le gros chiffre, et ce qu'il représente. */
  principal: { valeur: string; legende: string };
  lignes: { libelle: string; valeur: string }[];
  /** Phrase courte sous le résultat (équivalents, encouragement). */
  notes: string[];
}

const nombre = (v: number | string | undefined) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const euros = (n: number, decimales = 0) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: decimales, minimumFractionDigits: decimales }).format(n);
const entier = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n));
const un = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(Math.round(n * 10) / 10);
const pluriel = (n: number, mot: string, motPluriel = `${mot}s`) => `${Math.round(n * 10) / 10 >= 2 ? motPluriel : mot}`;

const JOURS_AN = 365;
const SEMAINES_AN = 52;

/** Économies d'argent : équivalents sobres, à partir d'une dépense par an. */
function equivalentsArgent(parAn: number): string[] {
  if (parAn <= 0) return [];
  const heures = parAn / REFERENCES.smicHoraireNet;
  const mois5ans = (parAn * 5) / REFERENCES.smicMensuelNet;
  return [
    `Chaque année, l'équivalent d'environ ${entier(heures)} heures de travail payées au Smic net.`,
    `Sur 5 ans, environ ${un(mois5ans)} mois de Smic net.`,
  ];
}

export const CALCULS: Record<string, (v: Valeurs) => Resultat> = {
  "economies-cigarette": (v) => {
    const vape = v.mode === "vape";
    const parJour = vape ? (nombre(v.flacons) * nombre(v.prixFlacon)) / 7 : (nombre(v.cigarettes) / 20) * nombre(v.prixPaquet);
    const parAn = parJour * JOURS_AN;
    return {
      principal: { valeur: euros(parAn), legende: "ce que vous récupérez chaque année" },
      lignes: [
        { libelle: "Par mois", valeur: euros(parAn / 12) },
        { libelle: "Par an", valeur: euros(parAn) },
        { libelle: "Sur 5 ans", valeur: euros(parAn * 5) },
      ],
      notes: [`Soit environ ${euros(parJour, 2)} par jour.`, ...equivalentsArgent(parAn)],
    };
  },

  "economies-alcool": (v) => {
    const parSemaine = nombre(v.verres) * nombre(v.prixVerre);
    const parAn = parSemaine * SEMAINES_AN;
    return {
      principal: { valeur: euros(parAn), legende: "ce que vous récupérez chaque année" },
      lignes: [
        { libelle: "Par mois", valeur: euros(parAn / 12) },
        { libelle: "Par an", valeur: euros(parAn) },
      ],
      notes: equivalentsArgent(parAn).slice(0, 1),
    };
  },

  "temps-ecran": (v) => {
    const actuel = Math.min(nombre(v.heures), 24);
    const objectif = Math.min(nombre(v.objectif), 24);
    const gagneParJour = Math.max(0, actuel - objectif);
    const heuresAn = actuel * JOURS_AN;
    const gagneAn = gagneParJour * JOURS_AN;
    const semainesTravail = gagneAn / REFERENCES.heuresSemaineTravail;
    return {
      principal: gagneParJour > 0
        ? { valeur: `${entier(gagneAn)} h`, legende: "le temps que vous récupérez chaque année avec votre objectif" }
        : { valeur: `${entier(heuresAn)} h`, legende: "le temps passé sur le téléphone en un an" },
      lignes: [
        { libelle: "Aujourd'hui, par an", valeur: `${entier(heuresAn)} h, soit ${un(heuresAn / 24)} jours` },
        { libelle: "Soit en semaines", valeur: `${un(heuresAn / 24 / 7)} ${pluriel(heuresAn / 24 / 7, "semaine")} complètes` },
        { libelle: "Récupéré par an", valeur: `${entier(gagneAn)} h, soit ${un(gagneAn / 24)} jours` },
      ],
      notes: gagneParJour > 0
        ? [
            `${un(gagneParJour)} h de moins par jour, c'est autant que ${un(semainesTravail)} ${pluriel(semainesTravail, "semaine")} de travail à temps plein (35 h) chaque année.`,
            "Même une petite baisse compte : chaque heure récupérée est à vous.",
          ]
        : ["Choisissez un objectif un peu plus bas que votre temps actuel pour voir ce que vous récupérez."],
    };
  },

  "temps-projet": (v) => {
    const parSemaine = (nombre(v.minutes) * Math.min(nombre(v.jours), 7)) / 60;
    const mois = (parSemaine * SEMAINES_AN) / 12;
    const an = parSemaine * SEMAINES_AN;
    const semainesTravail = an / REFERENCES.heuresSemaineTravail;
    return {
      principal: { valeur: `${entier(an)} h`, legende: "le temps consacré à votre projet en un an" },
      lignes: [
        { libelle: "En 1 mois", valeur: `${un(mois)} h` },
        { libelle: "En 6 mois", valeur: `${entier(mois * 6)} h` },
        { libelle: "En 1 an", valeur: `${entier(an)} h` },
      ],
      notes: an > 0
        ? [`En un an, autant que ${un(semainesTravail)} ${pluriel(semainesTravail, "semaine")} de travail à temps plein (35 h), sans rien bousculer dans vos journées.`]
        : [],
    };
  },
};
