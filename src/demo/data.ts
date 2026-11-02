/**
 * Données 100 % fictives de la démo : aucune vraie personne, aucun appel réseau. Les règles (série, record, badges, étapes de
 * réduction) sont celles de l'appli (src/lib/addiction.ts, badge-defs.ts, reduction-goals.ts), pour que les chiffres restent cohérents.
 */

export type Mark = { status: "success" | "relapse"; consumption: number | null; reasons?: string[] };
export type Marks = Record<number, Mark>;

export type Addiction = {
  id: "tabac" | "reseaux";
  emoji: string;
  label: string;
  type: string;
  goalDays: number;
  startOffset: number;
  motivation: string;
  reference: number | null;
  unit: string | null;
};

/** Le « jour de la démo » est le 28 du mois en cours : toujours assez de jours pour montrer tout le calendrier. */
const NOW = new Date();
export const YEAR = NOW.getFullYear();
export const MONTH = NOW.getMonth();
export const DEMO_DAY = 28;

export const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** Date d'un décalage en jours depuis le jour de la démo (0 = aujourd'hui, -1 = hier). */
export function dateOf(offset: number) {
  return new Date(YEAR, MONTH, DEMO_DAY + offset);
}

export function offsetOf(date: Date) {
  return Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - dateOf(0).getTime()) / 86400000);
}

export function longDate(offset: number) {
  const date = dateOf(offset);
  return `${date.getDate()} ${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
}

export const ADDICTIONS: Addiction[] = [
  {
    id: "tabac",
    emoji: "🚬",
    label: "Tabac",
    type: "tabac",
    goalDays: 90,
    startOffset: -75,
    motivation: "Retrouver du souffle et de la liberté.",
    reference: 15,
    unit: "cigarettes par jour",
  },
  {
    id: "reseaux",
    emoji: "📱",
    label: "Réseaux sociaux",
    type: "reseaux_sociaux",
    goalDays: 30,
    startOffset: -40,
    motivation: "Garder mes soirées pour moi.",
    reference: null,
    unit: null,
  },
];

const success = (consumption: number | null = null): Mark => ({ status: "success", consumption });

function tabacMarks(): Marks {
  const marks: Marks = {};
  // Série de 23 jours : aujourd'hui compris, de plus en plus bas, le dégradé de réduction se voit dans le calendrier.
  const recent = [1, 0, 1, 0, 2, 0, 4, 1, 0, 0, 2, 4, 0, 1, 0, 5, 3, 6, 2, 4, 7, 5, 8];
  recent.forEach((value, index) => (marks[-index] = success(value)));
  marks[-23] = { status: "relapse", consumption: 15, reasons: ["Stress", "Fatigue"] };
  // -24, -26 et -27 : non renseignés.
  marks[-25] = { status: "relapse", consumption: 16, reasons: ["Pression sociale"] };
  // Record : 31 jours d'affilée.
  for (let day = -28; day >= -58; day -= 1) marks[day] = success(day % 3 === 0 ? 6 : 9);
  marks[-59] = { status: "relapse", consumption: 15, reasons: ["Habitude"] };
  for (let day = -60; day >= -75; day -= 1) marks[day] = day === -66 ? { status: "relapse", consumption: 18, reasons: ["Envie forte"] } : success(11);
  return marks;
}

function reseauxMarks(): Marks {
  const marks: Marks = {};
  for (let day = 0; day >= -40; day -= 1) marks[day] = success();
  marks[-9] = { status: "relapse", consumption: null, reasons: ["Ennui"] };
  marks[-22] = { status: "relapse", consumption: null, reasons: ["Fatigue"] };
  marks[-34] = { status: "relapse", consumption: null, reasons: ["Habitude"] };
  delete marks[-25];
  delete marks[-30];
  return marks;
}

export function initialMarks(): Record<Addiction["id"], Marks> {
  return { tabac: tabacMarks(), reseaux: reseauxMarks() };
}

/** Comme `computeStats` de l'appli. */
export function computeStats(addiction: Addiction, marks: Marks) {
  let cursor = marks[0] ? 0 : -1;
  let current = 0;
  let streakStart: number | null = null;
  while (cursor >= addiction.startOffset && marks[cursor]?.status === "success") {
    current += 1;
    streakStart = cursor;
    cursor -= 1;
  }
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  let relapses = 0;
  let successes = 0;
  for (const day of Object.keys(marks).map(Number).sort((a, b) => a - b)) {
    if (marks[day]?.status === "success") {
      run = previous !== null && previous + 1 === day ? run + 1 : 1;
      successes += 1;
      best = Math.max(best, run);
    } else {
      relapses += 1;
      run = 0;
    }
    previous = day;
  }
  return { current, best: Math.max(best, current), relapses, successes, tracked: 1 - addiction.startOffset, streakStart };
}

export function symbolFor(streak: number) {
  if (streak >= 90) return { emoji: "🌲", title: "Arbre" };
  if (streak >= 30) return { emoji: "🪴", title: "Jeune pousse" };
  if (streak >= 7) return { emoji: "🌱", title: "Pousse" };
  if (streak >= 1) return { emoji: "🌰", title: "Graine plantée" };
  return { emoji: "💧", title: "Nouveau départ" };
}

export function consumptionColor(consumption: number, reference: number) {
  if (consumption <= 0) return "var(--success)";
  if (consumption >= reference) return "var(--danger)";
  const ratio = consumption / reference;
  if (ratio <= 0.25) return `color-mix(in oklch, var(--success) ${(1 - ratio / 0.25) * 100}%, var(--warning))`;
  if (ratio <= 0.5) return `color-mix(in oklch, var(--warning) ${(1 - (ratio - 0.25) / 0.25) * 100}%, var(--reduction-mid))`;
  return `color-mix(in oklch, var(--reduction-mid) ${(1 - (ratio - 0.5) / 0.5) * 100}%, var(--danger))`;
}

export function frenchNumber(value: number) {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}

export const GOAL_LABELS: Record<number, string> = { 30: "1 mois", 90: "3 mois" };

/** Étapes de réduction du tabac : `offset` = échéance par rapport au jour de la démo. */
export const REDUCTION_GOALS = [
  { target: 5, offset: -10 },
  { target: 0, offset: 32 },
];

export const AVERAGE_WINDOW_DAYS = 7;

export const STREAK_BADGES = [
  { threshold: 1, name: "Premier pas", emoji: "🌰" },
  { threshold: 3, name: "Élan", emoji: "🌱" },
  { threshold: 7, name: "Une semaine", emoji: "🪴" },
  { threshold: 14, name: "Deux semaines", emoji: "🍀" },
  { threshold: 21, name: "Cap des 21", emoji: "🌿" },
  { threshold: 30, name: "Un mois", emoji: "🌲" },
  { threshold: 60, name: "Solide", emoji: "🌳" },
  { threshold: 90, name: "Maîtrise", emoji: "⛰️" },
];

export const CRAVING_BADGES = [
  { threshold: 1, name: "Première victoire", emoji: "✨" },
  { threshold: 3, name: "Je tiens bon", emoji: "🧠" },
  { threshold: 5, name: "Résistance", emoji: "🛡️" },
  { threshold: 10, name: "Maîtrise", emoji: "🎯" },
  { threshold: 25, name: "Solide face aux envies", emoji: "🧗" },
];

export const GAME_BADGES = [
  { threshold: 30, name: "Premier envol", emoji: "🕊️" },
  { threshold: 60, name: "Une minute", emoji: "⏱️" },
  { threshold: 120, name: "Deux minutes", emoji: "🌄" },
  { threshold: 180, name: "Trois minutes", emoji: "🦅" },
];

export const GAME_STATS = { bestPoints: 94.5, bestSeconds: 88, coins: 13, games: 9 };

export const GAME_PODIUM = [
  { points: "94,5", detail: "1 min 28 · 🪙 13 pièces", medal: "🥇" },
  { points: "71", detail: "1 min 05 · 🪙 12 pièces", medal: "🥈" },
  { points: "52,5", detail: "47 s · 🪙 11 pièces", medal: "🥉" },
];

export const PLACE_OPTIONS = [
  "Chez moi", "Au travail", "Dans les transports", "Dans la rue", "Chez des amis / famille",
  "Dans un bar / restaurant", "Un lieu associé à mon addiction", "Autre",
];

export const BEFORE_OPTIONS = [
  "Je travaillais", "Je venais de finir le travail", "Je me reposais", "Je regardais une série / vidéo",
  "Je faisais la fête", "Je mangeais", "J'étais dans les transports", "Je discutais avec quelqu'un", "Je m'ennuyais", "Autre",
];

/** Activités de l'appli, passées au vouvoiement pour le site. */
export const ACTIVITIES = [
  "Allez boire un grand verre d'eau, lentement.",
  "Passez-vous de l'eau fraîche sur le visage et les mains.",
  "Étirez-vous debout pendant une minute, sans vous presser.",
  "Sortez marcher un peu, même quelques pas dehors.",
  "Respirez : inspirez 4 secondes, expirez 6 secondes, dix fois.",
  "Fermez les yeux et comptez dix respirations complètes.",
  "Brossez-vous les dents : la bouche fraîche coupe souvent l'envie.",
  "Roulez doucement les épaules en arrière, dix fois.",
];

export const QUIZ = [
  { question: "Quelle est la capitale de l'Australie ?", options: ["Sydney", "Canberra", "Melbourne"], answer: 1, explanation: "Canberra a été choisie pour départager Sydney et Melbourne." },
  { question: "Combien de planètes compte le système solaire ?", options: ["7", "8", "9"], answer: 1, explanation: "Huit depuis 2006, quand Pluton est devenue planète naine." },
  { question: "Quel est l'océan le plus vaste ?", options: ["Atlantique", "Indien", "Pacifique"], answer: 2, explanation: "Le Pacifique couvre près d'un tiers de la surface du globe." },
  { question: "Qui a peint la Joconde ?", options: ["Léonard de Vinci", "Michel-Ange", "Raphaël"], answer: 0, explanation: "Peinte au début du XVIe siècle, elle est aujourd'hui au Louvre." },
  { question: "Quel animal est le plus grand du monde ?", options: ["L'éléphant d'Afrique", "La baleine bleue", "Le requin-baleine"], answer: 1, explanation: "La baleine bleue peut dépasser 30 mètres de long." },
];

export const INTENSITY_OPTIONS = [
  { emoji: "🟢", label: "Beaucoup moins forte", message: "Bravo. Vous avez laissé passer une vague sans agir dessus." },
  { emoji: "🟡", label: "Encore présente", message: "Elle est encore là, mais vous avez tenu trois minutes de plus. C'est déjà beaucoup." },
  { emoji: "🔴", label: "Toujours très forte", message: "L'envie est encore là. Ce n'est pas grave. Vous pouvez recommencer une session de 3 minutes." },
];

/** Envies fictives : `offset` depuis le jour de la démo. */
export const SESSIONS = [
  { offset: -1, time: "21:10", addiction: "tabac", mode: "Activité", place: "Chez moi", before: "Je me reposais", trigger: "Fatigue" },
  { offset: -3, time: "20:45", addiction: "tabac", mode: "Quiz", place: "Chez moi", before: "Je regardais une série / vidéo", trigger: "Ennui" },
  { offset: -6, time: "18:20", addiction: "tabac", mode: "Mini-jeu", place: "Dans les transports", before: "Je venais de finir le travail", trigger: "Stress" },
  { offset: -6, time: "21:40", addiction: "reseaux", mode: "Activité", place: "Chez moi", before: "Je m'ennuyais", trigger: "Ennui" },
  { offset: -9, time: "19:15", addiction: "tabac", mode: "Activité", place: "Chez moi", before: "Je venais de finir le travail", trigger: "Stress" },
  { offset: -12, time: "12:30", addiction: "tabac", mode: "Quiz", place: "Au travail", before: "Je mangeais", trigger: "Habitude" },
  { offset: -14, time: "22:05", addiction: "reseaux", mode: "Mini-jeu", place: "Chez moi", before: "Je me reposais", trigger: "Ennui" },
  { offset: -16, time: "20:30", addiction: "tabac", mode: "Activité", place: "Chez des amis / famille", before: "Je discutais avec quelqu'un", trigger: "Pression sociale" },
  { offset: -19, time: "08:50", addiction: "tabac", mode: "Activité", place: "Dans les transports", before: "Je travaillais", trigger: "Habitude" },
  { offset: -21, time: "19:40", addiction: "tabac", mode: "Quiz", place: "Chez moi", before: "Je venais de finir le travail", trigger: "Stress" },
  { offset: -23, time: "18:05", addiction: "tabac", mode: "Activité", place: "Au travail", before: "Je travaillais", trigger: "Stress" },
  { offset: -25, time: "20:15", addiction: "tabac", mode: "Mini-jeu", place: "Chez des amis / famille", before: "Je discutais avec quelqu'un", trigger: "Pression sociale" },
];

export const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** Rubriques d'AddictForms : titres et résumés repris de docs/ressources/ressources.json de l'appli. */
export const CONSEILS = [
  { title: "Faire face aux envies des premiers jours", text: "Une envie dure 2 à 3 minutes : occupez votre esprit, vos mains et votre bouche, respirez, et appelez le 39 89 si besoin.", source: "Tabac Info Service", tags: "Tabac" },
  { title: "9 conseils pour arrêter de fumer", text: "Connaître votre profil de fumeur, fixer vos raisons, préparer l'arrêt, choisir une stratégie et ne pas renoncer après un écart.", source: "Tabac Info Service", tags: "Tabac" },
  { title: "Arrêt du tabac et insomnie", text: "Des nuits agitées peuvent être un signe de sevrage : adaptez vos soirées (écrans, repas léger, chambre fraîche) et demandez conseil.", source: "Tabac Info Service", tags: "Tabac" },
];

export const STRUCTURES = [
  { title: "Annuaire des structures d'addictologie", text: "Trouvez près de chez vous un CSAPA, une consultation hospitalière ou un médecin addictologue en saisissant votre adresse ou votre code postal.", source: "Addict'Aide", tags: "" },
  { title: "Trouver un tabacologue", text: "Recherchez une consultation de tabacologie par adresse, ville ou département, en métropole comme en outre-mer.", source: "Tabac Info Service", tags: "Tabac" },
];

export const FEED = [
  { id: "f1", name: "Sam", mine: false, sentence: "a débloqué le badge 30 jours — Alcool", when: "il y a 2 h", badge: { emoji: "🌲", name: "Un mois", tier: "30 jours sans rechute" }, details: null, props: 4, comments: 2 },
  { id: "f2", name: "Camille", mine: true, sentence: "avez débloqué le badge 21 jours — Tabac", when: "il y a 2 jours", badge: { emoji: "🌿", name: "Cap des 21", tier: "21 jours sans rechute" }, details: null, props: 6, comments: 3 },
  { id: "f3", name: "Nora", mine: false, sentence: "a battu son record au mini-jeu", when: "il y a 3 jours", badge: null, details: "71 points · 1 min 5 · 12 pièces — ancien record : 58 points", props: 3, comments: 1 },
];

export const FRIENDS = { followers: 8, following: 6 };
