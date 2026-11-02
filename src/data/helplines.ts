/**
 * Numéros d'aide : copie à l'identique de `HELPLINES` et `EMERGENCY` (src/lib/helplines.ts de l'appli), vérifiés par
 * le responsable du produit. Ne rien saisir ici à la main : toute correction part de l'appli, puis est recopiée.
 */

const NBSP = String.fromCharCode(0xa0);

export type Helpline = {
  id: string;
  name: string;
  /** Numéro tel qu'affiché (« 0 980 980 930 »). */
  phone: string;
  /** Chiffres seuls, pour le lien `tel:`. */
  phoneHref: string;
  /** Jours et horaires (« 7 j/7, 8 h–2 h »). */
  hours: string;
  /** Précisions (anonyme, gratuit…) ; vide si aucune. */
  details: string;
  /** Site du service ; `null` s'il n'y en a pas. */
  site: { label: string; url: string } | null;
};

export const HELPLINES: readonly Helpline[] = [
  {
    id: "tabac",
    name: "Tabac Info Service",
    phone: "39 89",
    phoneHref: "3989",
    hours: `lundi–samedi, 8${NBSP}h–20${NBSP}h`,
    details: "",
    site: { label: "tabac-info-service.fr", url: "https://tabac-info-service.fr" },
  },
  {
    id: "alcool",
    name: "Alcool Info Service",
    phone: "0 980 980 930",
    phoneHref: "0980980930",
    hours: `7${NBSP}j/7, 8${NBSP}h–2${NBSP}h`,
    details: "Anonyme, non surtaxé",
    site: { label: "alcool-info-service.fr", url: "https://alcool-info-service.fr" },
  },
  {
    id: "drogues",
    name: "Drogues Info Service",
    phone: "0 800 23 13 13",
    phoneHref: "0800231313",
    hours: `7${NBSP}j/7, 8${NBSP}h–2${NBSP}h`,
    details: "Anonyme et gratuit",
    site: { label: "drogues-info-service.fr", url: "https://drogues-info-service.fr" },
  },
  {
    id: "cannabis",
    name: "Écoute Cannabis",
    phone: "0 980 980 940",
    phoneHref: "0980980940",
    hours: `7${NBSP}j/7, 8${NBSP}h–2${NBSP}h`,
    details: "Anonyme, non surtaxé",
    site: null,
  },
  {
    id: "joueurs",
    name: "Joueurs Info Service",
    phone: "09 74 75 13 13",
    phoneHref: "0974751313",
    hours: `7${NBSP}j/7, 8${NBSP}h–2${NBSP}h`,
    details: "Anonyme, non surtaxé",
    site: { label: "joueurs-info-service.fr", url: "https://joueurs-info-service.fr" },
  },
];

/** Encadré d'urgence, affiché en haut (en danger). */
export const EMERGENCY = {
  title: "Urgences",
  lines: [
    {
      text: `En cas d'urgence${NBSP}: 15 (SAMU) ou 112`,
      calls: [
        { label: "15 (SAMU)", phoneHref: "15" },
        { label: "112", phoneHref: "112" },
      ],
    },
    {
      text: `Idées suicidaires${NBSP}: 3114, 24${NBSP}h/24, gratuit`,
      calls: [{ label: "3114", phoneHref: "3114" }],
    },
  ],
} as const;

/** Lien `tel:` d'un numéro. */
export function telHref(phoneHref: string): string {
  return `tel:${phoneHref}`;
}
