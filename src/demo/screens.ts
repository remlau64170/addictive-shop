/**
 * Écrans de la démo, recréés d'après l'appli (src/routes/_authenticated/*.tsx) : de simples chaînes HTML, pour servir à la fois
 * à la construction du site (téléphones décoratifs, premier écran) et dans le navigateur. Aucune écriture, aucun appel réseau.
 */
import { EMERGENCY, HELPLINES, telHref } from "../data/helplines";
import {
  ACTIVITIES,
  ADDICTIONS,
  AVERAGE_WINDOW_DAYS,
  BEFORE_OPTIONS,
  CONSEILS,
  CRAVING_BADGES,
  FEED,
  FRIENDS,
  GAME_BADGES,
  GAME_PODIUM,
  GAME_STATS,
  GOAL_LABELS,
  INTENSITY_OPTIONS,
  MONTH,
  MONTHS_FR,
  PLACE_OPTIONS,
  QUIZ,
  REDUCTION_GOALS,
  SESSIONS,
  STREAK_BADGES,
  STRUCTURES,
  WEEKDAYS,
  YEAR,
  computeStats,
  consumptionColor,
  dateOf,
  frenchNumber,
  initialMarks,
  longDate,
  offsetOf,
  symbolFor,
  type Addiction,
  type Marks,
} from "./data";
import { icon, type IconName } from "./icons";

export type Route =
  | { name: "home" | "news" | "envies" | "choose" | "context" | "session" | "done" | "game" }
  | { name: "fiche"; id: Addiction["id"] }
  | { name: "badges" }
  | { name: "forms" }
  | { name: "compte" };

export type State = {
  stack: Route[];
  marks: ReturnType<typeof initialMarks>;
  /** Mois affiché, en décalage depuis le mois de la démo. */
  calendar: Record<string, number>;
  enviesMonth: number;
  enviesDay: number | null;
  dayOpen: number | null;
  badgesTab: "badges" | "mini-jeu";
  formsTab: "conseils" | "structures" | "aide";
  compteTab: "activite" | "badges" | "messages";
  favorites: string[];
  helpful: string[];
  myProps: string[];
  banner: string | null;
  craving: {
    addiction: Addiction["id"];
    place: string | null;
    before: string | null;
    remaining: number;
    mode: "activity" | "quiz" | null;
    activity: number;
    question: number;
    picked: number | null;
    answered: number;
    score: number;
    intensity: number | null;
  };
};

export const initialCraving = (addiction: Addiction["id"] = "tabac"): State["craving"] => ({
  addiction,
  place: null,
  before: null,
  remaining: 180,
  mode: null,
  activity: 0,
  question: 0,
  picked: null,
  answered: 0,
  score: 0,
  intensity: null,
});

export function initialState(): State {
  return {
    stack: [{ name: "home" }],
    marks: initialMarks(),
    calendar: {},
    enviesMonth: 0,
    enviesDay: null,
    dayOpen: null,
    badgesTab: "badges",
    formsTab: "conseils",
    compteTab: "activite",
    favorites: [],
    helpful: [],
    myProps: ["f1"],
    banner: null,
    craving: initialCraving(),
  };
}

export const SOON = "Disponible dans l'appli";

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;
const addictionById = (id: string) => ADDICTIONS.find((item) => item.id === id) ?? ADDICTIONS[0]!;

export function formatCountdown(seconds: number) {
  const value = Math.max(0, seconds);
  return `${Math.floor(value / 60)}:${`${value % 60}`.padStart(2, "0")}`;
}

/* ---------- Éléments communs ---------- */

function backBar(title: string, action = `data-back`, right = "") {
  return `<div class="topbar"><button class="round" type="button" ${action} aria-label="Retour">${icon("arrowLeft")}</button><h1 class="title">${title}</h1>${right}</div>`;
}

const backLink = (label: string) =>
  `<button class="backlink" type="button" data-back>${icon("arrowLeft", 16)} ${label}</button>`;

const toastButton = (label: string, className: string, iconName?: IconName) =>
  `<button class="${className}" type="button" data-toast>${iconName ? icon(iconName, 16) : ""} ${label}</button>`;

const row = (label: string, value: string) => `<div class="row"><dt>${label}</dt><dd>${value}</dd></div>`;

const pills = (group: string, items: [string, string][], selected: string) =>
  `<ul class="pills">${items
    .map(
      ([value, label]) =>
        `<li><button type="button" class="pill${value === selected ? " on" : ""}" data-pill="${group}" data-value="${value}"${value === selected ? ' aria-current="page"' : ""}>${label}</button></li>`,
    )
    .join("")}</ul>`;

const badgeTile = (emoji: string, locked = false, onSoft = true) =>
  `<span class="tile${locked ? " locked" : onSoft ? "" : " soft"}">${locked ? icon("lock", 16) : emoji}</span>`;

/* ---------- Mes addictions ---------- */

function home(state: State) {
  const cards = ADDICTIONS.map((addiction) => {
    const stats = computeStats(addiction, state.marks[addiction.id]);
    const pct = Math.min(100, Math.round((stats.current / addiction.goalDays) * 100));
    return `<button class="card addiction" type="button" data-go="fiche" data-id="${addiction.id}">
      <span class="line"><span class="emoji-box">${addiction.emoji}</span>
      <span class="grow"><span class="name">${addiction.label}</span>
      <span class="sub">${icon("flame", 14, "primary")} ${stats.current} ${stats.current <= 1 ? "jour" : "jours"} de série</span></span>
      ${icon("chevronRight", 20, "muted")}</span>
      <span class="bar"><span style="width:${pct}%"></span></span>
      <span class="small muted">${stats.current} / ${addiction.goalDays} jours — objectif final ${GOAL_LABELS[addiction.goalDays]}</span>
    </button>`;
  }).join("");

  return `<div class="pad">
    <div class="brandbar">
      <span class="brand-mini"><img src="/icon-only-192.png" width="36" height="36" alt=""><b>Addictive</b></span>
      <span class="shortcuts">
        <button class="short" type="button" data-go="envies" aria-label="Mes envies">${icon("calendarDays", 16, "primary")}</button>
        <button class="short wide" type="button" data-go="badges" aria-label="Mes badges"><span>🌿</span><span>Badges</span></button>
        <button class="short" type="button" data-toast aria-label="Paramètres">${icon("settings", 16, "primary")}</button>
      </span>
    </div>
    <p class="tiny muted">Sois addict à ta sobriété</p>
    <h1 class="h1">Mes addictions</h1>
    <button class="craving-cta" type="button" data-go="choose">
      <span class="cta-main">${icon("heartPulse", 20)} J'ai une envie maintenant</span>
      <span class="cta-sub">Prenons 3 minutes pour la faire redescendre.</span>
    </button>
    <div class="stack mt20">${cards}</div>
    ${toastButton("Ajouter une addiction", "btn secondary mt12", "plus")}
    <section class="encourage">
      <p class="eyebrow">${icon("sparkles", 14)} Encouragement du jour</p>
      <p class="text-sm mt8">Votre progression vous appartient, à votre rythme.</p>
    </section>
  </div>`;
}

/* ---------- Calendrier ---------- */

function monthGrid(state: State, addiction: Addiction, marks: Marks) {
  const delta = state.calendar[addiction.id] ?? 0;
  const first = new Date(YEAR, MONTH + delta, 1);
  const count = new Date(YEAR, MONTH + delta + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const quantifiable = addiction.reference !== null;
  const cells = [`<span></span>`.repeat(lead)];
  for (let day = 1; day <= count; day += 1) {
    const offset = offsetOf(new Date(YEAR, MONTH + delta, day));
    const inRange = offset >= addiction.startOffset && offset <= 0;
    const mark = marks[offset];
    let className = "day";
    let style = "";
    if (quantifiable && mark?.consumption !== null && mark?.consumption !== undefined) {
      className += " filled";
      style = ` style="background-color:${consumptionColor(mark.consumption, addiction.reference ?? 1)}"`;
    } else if (mark?.status === "relapse") className += " relapse";
    else if (mark?.status === "success") className += " success";
    if (!inRange) className += " dim";
    if (offset === 0) className += " today";
    cells.push(
      `<button class="${className}"${style} type="button" ${inRange ? `data-day="${offset}"` : "disabled"} aria-label="${day} ${MONTHS_FR[first.getMonth()]}">${day}</button>`,
    );
  }
  const earliest = dateOf(addiction.startOffset);
  const atStart = first.getFullYear() === earliest.getFullYear() && first.getMonth() === earliest.getMonth();
  const legend = quantifiable
    ? `<div class="legend col"><span>${dot("success")} Sans consommation</span>
       <span><i class="gradient"></i> Réduction</span>
       <span class="pair"><span>${dot("danger")} Rechute</span><span>${dot("secondary")} Non renseigné</span></span></div>`
    : `<div class="legend"><span>${dot("success")} Journée tenue</span><span>${dot("danger")} Rechute</span><span>${dot("secondary")} Non renseigné</span></div>`;

  return `<section class="card mt16">
    <div class="between">
      <button class="round sm" type="button" data-month="-1" data-id="${addiction.id}" ${atStart ? "disabled" : ""} aria-label="Mois précédent">${icon("chevronLeft", 16)}</button>
      <h2 class="h2 cap">${MONTHS_FR[first.getMonth()]} ${first.getFullYear()}</h2>
      <button class="round sm" type="button" data-month="1" data-id="${addiction.id}" ${delta >= 0 ? "disabled" : ""} aria-label="Mois suivant">${icon("chevronRight", 16)}</button>
    </div>
    ${toastButton("Sélection multiple de jours passés", "btn outline sm mt12")}
    <div class="week mt16">${["L", "M", "M", "J", "V", "S", "D"].map((d) => `<span>${d}</span>`).join("")}</div>
    <div class="days">${cells.join("")}</div>
    ${legend}
  </section>`;
}

const dot = (color: string) => `<i class="dot ${color}"></i>`;

function dayDialog(state: State, addiction: Addiction) {
  if (state.dayOpen === null) return "";
  const mark = state.marks[addiction.id][state.dayOpen];
  const reference = addiction.reference;
  let body = `<p class="text-sm muted">Cette journée n'est pas renseignée.</p>`;
  if (reference !== null && mark?.consumption !== null && mark?.consumption !== undefined) {
    const value = mark.consumption;
    const status = value === 0 ? "Sans consommation" : value < reference ? "Réduction" : "Rechute";
    body = `<dl class="box dl">
      ${row("Consommation", `${frenchNumber(value)} ${addiction.unit}`)}
      ${row("Référence", `${reference} ${addiction.unit}`)}
      ${value > 0 && value < reference ? row("Réduction", `${Math.round((1 - value / reference) * 100)} %`) : ""}
      ${row("Statut", status)}
    </dl>`;
  } else if (mark?.status === "relapse") {
    body = `<div class="box danger-box"><p class="text-sm b danger">🔴 Rechute</p>
      <div class="chips mt8">${(mark.reasons ?? []).map((reason) => `<span class="chip">${reason}</span>`).join("")}</div></div>`;
  } else if (mark?.status === "success") {
    body = `<p class="text-sm b success">Journée tenue</p>`;
  }
  return `<div class="dialog-veil" data-close-day></div>
  <div class="dialog" role="dialog" aria-label="${longDate(state.dayOpen)}">
    <div class="between"><h2 class="h3">${longDate(state.dayOpen)}</h2>
    <button class="round sm" type="button" data-close-day aria-label="Fermer">${icon("x", 16)}</button></div>
    <p class="text-sm muted mt4">Renseignez ou corrigez cette journée.</p>
    <div class="mt12">${body}</div>
    ${toastButton("Effacer le marquage", "btn outline mt12")}
  </div>`;
}

/* ---------- Fiche d'une addiction ---------- */

function fiche(state: State, id: Addiction["id"]) {
  const addiction = addictionById(id);
  const marks = state.marks[addiction.id];
  const stats = computeStats(addiction, marks);
  const symbol = symbolFor(stats.current);
  const pct = Math.min(100, Math.round((stats.current / addiction.goalDays) * 100));
  const goal = GOAL_LABELS[addiction.goalDays];
  const earned = STREAK_BADGES.filter((badge) => badge.threshold <= stats.best);
  const next = STREAK_BADGES.find((badge) => badge.threshold > stats.best);
  const quantifiable = addiction.reference !== null;
  const today = marks[0];

  const todayBlock = quantifiable
    ? `<div class="consume mt12">
        <label class="grow"><span class="label">Consommation du jour</span>
        <input id="today-consumption" type="text" inputmode="decimal" value="${today?.consumption ?? ""}" placeholder="0" autocomplete="off"></label>
        <span class="unit">${addiction.unit}</span>
      </div>
      <button class="btn primary sm mt8" type="button" data-save-today>Enregistrer</button>`
    : `<div class="two mt12">
        <button class="btn mark ok${today?.status === "success" ? " on" : ""}" type="button" data-today="success">${icon("check", 16)} Journée tenue</button>
        <button class="btn mark ko${today?.status === "relapse" ? " on" : ""}" type="button" data-today="relapse">Rechute</button>
      </div>`;

  return `<div class="pad">
    ${backBar(`<span>${addiction.emoji}</span> <span class="trunc">${addiction.label}</span>`, "data-back", `<button class="round" type="button" data-toast aria-label="Paramètres de cette addiction">${icon("settings")}</button>`)}
    ${state.banner ? `<p class="banner mt12" role="status">${state.banner}</p>` : ""}
    <section class="streak mt16">
      <div class="between"><span class="streak-tag">${icon("flame", 14)} Série en cours</span><span class="big-emoji">${symbol.emoji}</span></div>
      <p class="streak-num">${stats.current}</p>
      <p class="text-sm soft">${stats.current <= 1 ? "jour tenu" : "jours tenus"} d'affilée — ${symbol.title}</p>
      <div class="streak-bar"><span style="width:${pct}%"></span></div>
      <p class="small soft mt8">${stats.current} / ${addiction.goalDays} jours — objectif final ${goal}</p>
      <p class="quote">“${addiction.motivation}”</p>
    </section>
    <div class="two mt16">
      <section class="card sm-pad"><p class="eyebrow">Série actuelle</p><p class="stat success">${stats.current}</p>
        <p class="text-sm muted">${stats.streakStart !== null ? `depuis le ${longDate(stats.streakStart)}` : "série à démarrer"}</p></section>
      <section class="card sm-pad"><p class="eyebrow">${icon("trophy", 14)} Record</p><p class="stat">${stats.best}</p>
        <p class="text-sm muted">jours consécutifs</p></section>
    </div>
    <section class="card mt16">
      <div class="between"><h2 class="h2">Progression</h2><button class="linkish" type="button" data-go="badges">Tous les badges</button></div>
      <p class="text-sm muted mt8">🔥 ${stats.current} jour${stats.current > 1 ? "s" : ""} sans rechute · 🧠 ${SESSIONS.length} envies maîtrisées · 🏆 ${plural(earned.length, "badge")}</p>
      <div class="chips mt12">${earned.map((badge) => `<span class="chip soft">${badge.emoji} ${badge.name}</span>`).join("")}</div>
      ${next ? `<p class="small muted mt12">${stats.current} / ${next.threshold} jours — encore ${plural(next.threshold - stats.current, "jour")} pour débloquer « ${next.name} »</p>` : ""}
      ${toastButton("Partager ma progression", "btn secondary sm mt16", "share")}
    </section>
    <section class="card mt16"><h2 class="h2">Aujourd'hui — ${longDate(0)}</h2>${todayBlock}</section>
    ${quantifiable ? reductionCard(addiction, marks) : ""}
    ${monthGrid(state, addiction, marks)}
    <section class="card mt16"><h2 class="h2">Infos</h2>
      <dl class="dl mt12">
        ${row("Journées tenues", `${stats.successes}`)}
        ${row("Rechutes notées", `${stats.relapses}`)}
        ${row("Objectif final", goal ?? "")}
        ${row("Date de début", longDate(addiction.startOffset))}
        ${row("Jours suivis", `${stats.tracked}`)}
        ${quantifiable ? row("Référence", `${addiction.reference} ${addiction.unit}`) : ""}
      </dl>
    </section>
    ${dayDialog(state, addiction)}
  </div>`;
}

function reductionCard(addiction: Addiction, marks: Marks) {
  const reference = addiction.reference ?? 1;
  const values: number[] = [];
  for (let day = 0; day > -AVERAGE_WINDOW_DAYS; day -= 1) {
    const value = marks[day]?.consumption;
    if (value !== null && value !== undefined) values.push(value);
  }
  const average = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const items = REDUCTION_GOALS.map(({ target, offset }) => {
    const reached = average <= target;
    const pct = reached ? 100 : Math.max(0, Math.min(100, Math.round(((reference - average) / (reference - target)) * 100)));
    const label = target <= 0 ? "Arrêt complet" : `${target} ${addiction.unit}`;
    return `<li class="step">
      <div class="between top"><div><p class="b">${label}</p><p class="text-sm muted">d'ici le ${longDate(offset)}</p></div>
      <span class="chip b ${reached ? "ok" : "soft"}">${reached ? "Atteint" : "En cours"}</span></div>
      <div class="bar mt12"><span class="${reached ? "done" : ""}" style="width:${pct}%"></span></div>
      <p class="small muted mt8">${reached ? "🎉 Étape atteinte, bravo !" : `${pct} % du chemin parcouru depuis votre référence (${reference} ${addiction.unit})`}</p>
    </li>`;
  }).join("");
  return `<section class="card mt16"><h2 class="h2">Étapes de réduction</h2>
    <p class="text-sm muted mt4">Moyenne actuelle : ${frenchNumber(average)} ${addiction.unit} (sur ${AVERAGE_WINDOW_DAYS} jours)</p>
    <ul class="stack mt12">${items}</ul></section>`;
}

/* ---------- « J'ai une envie maintenant » ---------- */

function choose() {
  return `<div class="pad">${backLink("Mes addictions")}
    <h1 class="h1 mt20">Une envie forte ?</h1>
    <p class="muted mt8">On va simplement passer les 3 prochaines minutes ensemble.</p>
    <p class="text-sm b mt24">Quelle addiction vous donne envie en ce moment ?</p>
    <div class="stack mt12">${ADDICTIONS.map(
      (addiction) => `<button class="card pick" type="button" data-craving="${addiction.id}">
        <span class="emoji-box lg">${addiction.emoji}</span><span class="pick-name">${addiction.label}</span></button>`,
    ).join("")}</div>
  </div>`;
}

const options = (field: string, list: string[], selected: string | null) =>
  `<div class="options mt12">${list
    .map(
      (value) =>
        `<button class="opt${value === selected ? " on" : ""}" type="button" data-context="${field}" data-value="${value}" aria-pressed="${value === selected}">${value}</button>`,
    )
    .join("")}</div>`;

function context(state: State) {
  return `<div class="pad">${backLink("Mes addictions")}
    <h1 class="h1 mt20">Deux questions rapides</h1>
    <p class="text-sm muted mt8">Facultatif. Vous pouvez commencer tout de suite.</p>
    <button class="btn primary tall mt16" type="button" data-start>Commencer les 3 minutes</button>
    <div class="card mt16"><p class="text-sm b">Où êtes-vous ?</p>${options("place", PLACE_OPTIONS, state.craving.place)}</div>
    <div class="card mt16"><p class="text-sm b">Que faisiez-vous juste avant ?</p>${options("before", BEFORE_OPTIONS, state.craving.before)}</div>
    <button class="plainlink" type="button" data-start>Passer ces questions</button>
  </div>`;
}

const helpNumbers = `<p class="help-line">Besoin d'une aide humaine maintenant ? Le <a href="tel:3114">3114</a> (prévention du suicide, gratuit, 24h/24) ou le <a href="tel:15">15</a> en cas d'urgence.</p>`;

const modeSwitch = (from: "activity" | "quiz") =>
  `<div class="switch">
    ${from === "quiz" ? `<button type="button" data-mode="activity">Passer à une activité</button>` : `<button type="button" data-mode="quiz">Passer au quiz</button>`}
    <button type="button" data-go="game">Jouer au mini-jeu</button>
  </div>`;

function activityBlock(state: State) {
  return `<div class="card big mt24">
    <p class="text-sm muted">Pendant les prochaines minutes…</p>
    <p class="activity">${ACTIVITIES[state.craving.activity % ACTIVITIES.length]}</p>
    <p class="text-sm muted mt16">Vous n'avez pas besoin de lutter contre l'envie. Vous pouvez simplement attendre qu'elle passe.</p>
    <button class="btn secondary mt20" type="button" data-next-activity>${icon("refresh", 16)} Nouvelle activité</button>
    ${modeSwitch("activity")}
  </div>`;
}

function quizBlock(state: State) {
  const { question, picked, answered, score } = state.craving;
  const current = QUIZ[question % QUIZ.length]!;
  const good = answered === 0 ? 0 : (score / answered) * 100;
  const bad = answered === 0 ? 0 : ((answered - score) / answered) * 100;
  const buttons = current.options
    .map((option, index) => {
      const isAnswer = index === current.answer;
      const stateClass = picked === null ? "" : isAnswer ? " right" : picked === index ? " wrong" : " faded";
      return `<button class="answer${stateClass}" type="button" data-answer="${index}" ${picked !== null ? "disabled" : ""}>${option}</button>`;
    })
    .join("");
  return `<div class="card mt24">
    <div class="split"><span class="ok" style="width:${good}%"></span><span class="ko" style="width:${bad}%"></span></div>
    <div class="between small muted mt8"><span>Réponses : ${answered}</span>
      <span class="score"><span class="success">✓ ${score} juste${score > 1 ? "s" : ""}</span><span class="danger">✕ ${answered - score} fausse${answered - score > 1 ? "s" : ""}</span></span></div>
    <p class="activity">${current.question}</p>
    <div class="stack mt16">${buttons}</div>
    ${picked !== null ? `<p class="text-sm muted mt16">${current.explanation}</p><button class="btn primary mt16" type="button" data-next-question>Question suivante</button>` : ""}
    <p class="small muted center mt16">L'important est de passer le temps, pas le score.</p>
    ${modeSwitch("quiz")}
  </div>`;
}

/** Écran de choix de l'appli, avec la carte repliée « Ça peut aider maintenant » : rien n'est chargé, même à l'ouverture. */
function helpNowCard(addiction: Addiction) {
  const conseil = addiction.id === "tabac" ? CONSEILS[0] : undefined;
  return `<details class="helpnow">
    <summary>${icon("lifeBuoy", 16, "primary")} Ça peut aider maintenant</summary>
    <div class="stack mt12">
      <div><p class="text-sm b">Cohérence cardiaque : exercice de respiration anti-stress (5 min)</p>
        <button class="video-box mt8" type="button" data-toast aria-label="Lancer la vidéo">${icon("play", 28)}</button></div>
      ${conseil ? `<div><p class="text-sm b">${conseil.title}</p><p class="text-sm muted mt4">${conseil.text}</p>
        ${toastButton("Lire le conseil", "btn outline auto sm mt12", "externalLink")}</div>` : ""}
    </div>
  </details>`;
}

function chooser(addiction: Addiction) {
  return `<div class="mt24">
    <p class="center b">Comment voulez-vous passer ces 3 minutes ?</p>
    <div class="stack mt16">
      <button class="btn primary choice" type="button" data-mode="activity">${icon("brain")} Faire une activité</button>
      <button class="btn secondary choice" type="button" data-mode="quiz">${icon("target")} Me distraire avec un quiz</button>
      <button class="btn secondary choice col" type="button" data-go="game"><span class="choice-title">${icon("gamepad")} Jouer à un mini-jeu</span>
        <span class="small muted">Faites voler votre personnage le plus longtemps possible.</span></button>
    </div>
    ${helpNowCard(addiction)}
  </div>`;
}

function session(state: State) {
  const addiction = addictionById(state.craving.addiction);
  const elapsed = Math.round(((180 - state.craving.remaining) / 180) * 100);
  return `<div class="pad session">
    <div class="timer-head">
      <p class="text-sm muted center">${addiction.emoji} ${addiction.label}</p>
      <p class="timer" data-timer>${formatCountdown(state.craving.remaining)}</p>
      <div class="timer-bar"><span data-timer-bar style="width:${elapsed}%"></span></div>
    </div>
    ${state.craving.mode === "quiz" ? quizBlock(state) : state.craving.mode === "activity" ? activityBlock(state) : chooser(addiction)}
    <button class="ended" type="button" data-ended>L'envie est déjà passée</button>
    ${helpNumbers}
  </div>`;
}

function done(state: State) {
  const picked = state.craving.intensity;
  const body =
    picked === null
      ? `<div class="stack mt20">${INTENSITY_OPTIONS.map(
          (option, index) => `<button class="card pick" type="button" data-intensity="${index}"><span class="big-emoji">${option.emoji}</span><span class="pick-name">${option.label}</span></button>`,
        ).join("")}</div>`
      : `<div class="card big mt20"><p>${INTENSITY_OPTIONS[picked]?.message}</p>
         <p class="small muted mt12">Cette session n'est pas comptée comme une rechute : votre série et votre record sont intacts.</p></div>`;
  return `<div class="pad">
    <h1 class="h1 mt16">3 minutes sont passées.</h1>
    <p class="muted mt8">L'envie est-elle toujours là ?</p>
    ${body}
    <button class="btn primary tall mt20" type="button" data-start>Recommencer 3 minutes</button>
    <button class="btn secondary mt12" type="button" data-home>Retour à mes addictions</button>
    ${helpNumbers}
  </div>`;
}

/** Écran fixe, à l'image du mini-jeu : l'oiseau est dessiné pour la démo. */
function game() {
  const peaks = [
    "M0 780V600L70 520L130 590L210 470L290 590L360 530V780Z",
    "M0 0V120L60 210L130 100L200 240L280 110L360 190V0Z",
  ];
  return `<div class="game">
    <svg class="game-bg" viewBox="0 0 360 780" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="demo-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050914"/><stop offset=".5" stop-color="#0a1230"/><stop offset="1" stop-color="#0e1a44"/></linearGradient>
      <radialGradient id="demo-glow"><stop offset="0" stop-color="#508cff" stop-opacity=".35"/><stop offset="1" stop-color="#508cff" stop-opacity="0"/></radialGradient></defs>
      <rect width="360" height="780" fill="url(#demo-sky)"/><circle cx="280" cy="220" r="210" fill="url(#demo-glow)"/>
      <path d="M0 780V660L90 570L170 650L260 560L360 640V780Z" fill="#14234f" opacity=".55"/>
      ${peaks.map((d) => `<path d="${d}" fill="#101c44" stroke="#5a96ff" stroke-width="2.5"/>`).join("")}
      <g fill="#ffd166" stroke="#a9781f" stroke-width="2"><circle cx="210" cy="340" r="10"/><circle cx="250" cy="372" r="10"/><circle cx="290" cy="340" r="10"/></g>
      <g transform="translate(112 352) rotate(-10)"><ellipse cx="0" cy="0" rx="30" ry="21" fill="#7fb2ff" stroke="#0b1430" stroke-width="4"/>
      <path d="M-8 -3 C-32 -30 -44 -16 -40 6 C-28 8 -18 8 -8 6Z" fill="#b8d3ff" stroke="#0b1430" stroke-width="4"/>
      <circle cx="14" cy="-7" r="6.5" fill="#fff" stroke="#0b1430" stroke-width="2.5"/><circle cx="16" cy="-7" r="2.6" fill="#0b1430"/>
      <path d="M27 -3 L44 3 L27 9Z" fill="#ffd166" stroke="#0b1430" stroke-width="3" stroke-linejoin="round"/></g>
    </svg>
    <div class="game-top">
      <button class="glass" type="button" data-back aria-label="Quitter le jeu">${icon("x")}</button>
      <div class="center"><p class="game-time">12<small>s</small></p>
        <p class="game-meta"><span>🪙 3 pièces</span><b>13,5 pts</b></p></div>
      <div class="game-tools"><span class="glass">${icon("volume")}</span><span class="glass">${icon("pause")}</span></div>
    </div>
    <div class="game-bottom">
      <p class="game-soon">${SOON}</p>
      <p class="game-how">Touchez l'écran pour battre des ailes</p>
      <p class="game-rule">Restez dans le passage entre les montagnes. Chaque seconde compte 1 point, chaque pièce 0,5.</p>
    </div>
  </div>`;
}

/* ---------- Mes envies ---------- */

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
}

const slotOf = (time: string) => {
  const hour = Number(time.slice(0, 2));
  return hour < 12 ? "le matin" : hour < 18 ? "l'après-midi" : "en soirée";
};

function envies(state: State) {
  const relapseDays = new Set(
    Object.values(state.marks).flatMap((marks) =>
      Object.entries(marks).filter(([, mark]) => mark.status === "relapse").map(([day]) => Number(day)),
    ),
  );
  const first = new Date(YEAR, MONTH + state.enviesMonth, 1);
  const count = new Date(YEAR, MONTH + state.enviesMonth + 1, 0).getDate();
  const cells = [`<span></span>`.repeat((first.getDay() + 6) % 7)];
  for (let day = 1; day <= count; day += 1) {
    const offset = offsetOf(new Date(YEAR, MONTH + state.enviesMonth, day));
    const sessions = SESSIONS.filter((item) => item.offset === offset).length;
    const className = `eday${sessions > 0 ? " has" : ""}${relapseDays.has(offset) ? " hard" : ""}${state.enviesDay === offset ? " open" : ""}`;
    cells.push(
      `<button class="${className}" type="button" ${sessions > 0 ? `data-envie-day="${offset}"` : "disabled"} aria-label="${day} ${MONTHS_FR[first.getMonth()]}, ${plural(sessions, "envie")}"><span>${day}</span>${sessions > 0 ? `<small>${sessions}</small>` : ""}</button>`,
    );
  }

  const detail =
    state.enviesDay === null
      ? ""
      : `<section class="card mt16"><p class="text-sm b">${WEEKDAYS[dateOf(state.enviesDay).getDay()]} ${dateOf(state.enviesDay).getDate()} ${MONTHS_FR[dateOf(state.enviesDay).getMonth()]}</p>
        <ul class="stack mt12">${SESSIONS.filter((item) => item.offset === state.enviesDay)
          .map((item) => {
            const addiction = addictionById(item.addiction);
            return `<li class="note"><p class="text-sm b">${addiction.emoji} ${addiction.label} · ${item.time}</p>
              <p class="small muted mt4">${item.mode} · ${item.place} · avant : ${item.before}</p>
              <p class="small muted mt4">Déclencheurs : ${item.trigger}</p></li>`;
          })
          .join("")}</ul></section>`;

  const slot = mostCommon(SESSIONS.map((item) => slotOf(item.time)));
  const weekday = mostCommon(SESSIONS.map((item) => WEEKDAYS[dateOf(item.offset).getDay()] ?? ""));
  const place = mostCommon(SESSIONS.map((item) => item.place));
  const trigger = mostCommon(SESSIONS.map((item) => item.trigger));
  const slotLabel = `${String(slot[0]).charAt(0).toUpperCase()}${String(slot[0]).slice(1)}`;

  return `<div class="pad">${backLink("Mes addictions")}
    <h1 class="h1 mt20">Mes envies</h1>
    <p class="text-sm muted mt8">Ces moments ne sont jamais comptés comme des rechutes : ils servent seulement à repérer quand les envies apparaissent.</p>
    <section class="card mt24">
      <div class="between">
        <button class="round sm" type="button" data-envie-month="-1" aria-label="Mois précédent">${icon("chevronLeft")}</button>
        <p class="text-sm b cap">${MONTHS_FR[first.getMonth()]} ${first.getFullYear()}</p>
        <button class="round sm" type="button" data-envie-month="1" ${state.enviesMonth >= 0 ? "disabled" : ""} aria-label="Mois suivant">${icon("chevronRight")}</button>
      </div>
      <div class="week mt12">${["L", "M", "M", "J", "V", "S", "D"].map((d) => `<span>${d}</span>`).join("")}</div>
      <div class="days tight">${cells.join("")}</div>
      <p class="small muted mt12">Les jours colorés indiquent des envies notées. Un liseré rouge signale une journée difficile déjà enregistrée dans votre suivi.</p>
    </section>
    ${detail}
    <section class="card mt16"><p class="text-sm b">Ce qui revient</p>
      <dl class="dl mt12">
        ${row("Envies notées", `${SESSIONS.length}`)}
        ${row("Moment le plus fréquent", `${slot[0]} (${slot[1]})`)}
        ${row("Jour le plus fréquent", `${weekday[0]} (${weekday[1]})`)}
        ${row("Lieu le plus noté", `${place[0]} (${place[1]})`)}
        ${row("Déclencheur le plus noté", `${trigger[0]} (${trigger[1]})`)}
      </dl>
    </section>
    <section class="card mt16"><p class="eyebrow-plain">${icon("sparkles", 16, "primary")} Observations</p>
      <ul class="stack mt12">
        <li class="note soft">${slotLabel} semble être un moment où vos envies apparaissent souvent. Vous pouvez prévoir quelque chose pour passer ce moment autrement.</li>
        <li class="note">${trigger[0]} revient souvent avant vos envies. Cela pourrait être une situation à risque pour vous.</li>
        <li class="note">Vous semblez avoir davantage d'envies dans ce contexte : ${String(place[0]).toLowerCase()}.</li>
      </ul>
      <p class="small muted mt12">Ces observations décrivent seulement vos données. Ce ne sont ni des diagnostics ni des certitudes.</p>
    </section>
  </div>`;
}

/* ---------- Badges et mini-jeu ---------- */

function badgeSection(title: string, subtitle: string, badges: { threshold: number; name: string; emoji: string }[], value: number, label: (threshold: number) => string, unit = "") {
  const items = badges
    .map((badge) => {
      const unlocked = value >= badge.threshold;
      const pct = Math.min(100, Math.round((value / badge.threshold) * 100));
      return `<li class="badge${unlocked ? " on" : ""}">${badgeTile(badge.emoji, !unlocked)}
        <div class="grow"><p class="text-sm b trunc${unlocked ? "" : " muted"}">${badge.name}</p><p class="small muted">${label(badge.threshold)}</p>
        ${unlocked ? "" : `<div class="bar thin mt4"><span style="width:${pct}%"></span></div><p class="tiny muted mt4">${Math.min(value, badge.threshold)}${unit} / ${badge.threshold}${unit}</p>`}</div></li>`;
    })
    .join("");
  return `<section class="card mt16"><h2 class="h2">${title}</h2><p class="small muted">${subtitle}</p><ul class="stack-sm mt16">${items}</ul></section>`;
}

const streakLabel = (threshold: number) => `${threshold} ${threshold <= 1 ? "jour" : "jours"} sans rechute`;
const cravingLabel = (threshold: number) => `${threshold} ${threshold <= 1 ? "envie maîtrisée" : "envies maîtrisées"}`;
const gameLabel = (threshold: number) => `Tenir ${threshold < 60 ? `${threshold} secondes` : `${threshold / 60} minute${threshold >= 120 ? "s" : ""}`} en une partie`;

export function badgeCount(state: State) {
  const streak = ADDICTIONS.reduce(
    (sum, addiction) => sum + STREAK_BADGES.filter((badge) => badge.threshold <= computeStats(addiction, state.marks[addiction.id]).best).length,
    0,
  );
  return streak + CRAVING_BADGES.filter((badge) => badge.threshold <= SESSIONS.length).length + GAME_BADGES.filter((badge) => badge.threshold <= GAME_STATS.bestSeconds).length;
}

function badges(state: State) {
  const tabs = [["badges", "Badges"], ["mini-jeu", "Mini-jeu"]] as const;
  const tabButtons = tabs
    .map(([value, label]) => `<button class="seg${state.badgesTab === value ? " on" : ""}" type="button" data-badges-tab="${value}" aria-pressed="${state.badgesTab === value}">${label}</button>`)
    .join("");
  const total = badgeCount(state);
  const content =
    state.badgesTab === "badges"
      ? `<p class="text-sm muted mt16">${total} badges débloqués — un badge obtenu reste acquis.</p>
      ${toastButton("Partager ma progression", "btn primary sm mt16", "share")}
      ${badgeSection("Envies maîtrisées", `${SESSIONS.length} envies maîtrisées`, CRAVING_BADGES, SESSIONS.length, cravingLabel)}
      ${badgeSection("🎮 Mini-jeu", `meilleure partie : ${GAME_STATS.bestSeconds} secondes`, GAME_BADGES, GAME_STATS.bestSeconds, gameLabel, " s")}
      ${ADDICTIONS.map((addiction) => {
        const best = computeStats(addiction, state.marks[addiction.id]).best;
        return badgeSection(`${addiction.emoji} ${addiction.label}`, `meilleure série : ${best} jours`, STREAK_BADGES, best, streakLabel);
      }).join("")}`
      : `<section class="card big mt24 center">
        <p class="eyebrow centered">${icon("trophy", 16, "primary")} Meilleur score</p>
        <p class="score-num">${frenchNumber(GAME_STATS.bestPoints)}<small>pts</small></p>
        <p class="text-sm muted mt8">1 min 28 · 🪙 ${GAME_STATS.coins} pièces</p>
        <p class="small muted mt4">${GAME_STATS.games} parties jouées</p>
      </section>
      <section class="card mt16"><h2 class="h2">Podium</h2><p class="small muted">Vos 3 meilleures parties en points, toutes addictions confondues.</p>
        <ul class="stack-sm mt12">${GAME_PODIUM.map((item) => `<li class="note podium"><span class="big-emoji">${item.medal}</span><span><b>${item.points} pts</b><span class="small muted block">${item.detail}</span></span></li>`).join("")}</ul>
      </section>`;
  return `<div class="pad">${backBar("Badges et mini-jeu")}<div class="segments mt20">${tabButtons}</div>${content}</div>`;
}

/* ---------- AddictForms ---------- */

function resource(state: State, item: (typeof CONSEILS)[number], kind: IconName) {
  const favorite = state.favorites.includes(item.title);
  const helpful = state.helpful.includes(item.title);
  return `<article class="card">
    <div class="between top"><span class="res-icon">${icon(kind)}</span>
    <button class="round${favorite ? " primary-txt" : ""}" type="button" data-favorite="${item.title}" aria-pressed="${favorite}" aria-label="${favorite ? "Retirer des favoris" : "Ajouter aux favoris"}">${icon("bookmark", 20, favorite ? "fill" : "")}</button></div>
    <h3 class="h3 mt8">${item.title}</h3>
    <p class="text-sm muted mt4">${item.text}</p>
    <p class="small muted mt8">Source : ${item.source}${item.tags ? ` · ${item.tags}` : ""}</p>
    <div class="res-actions mt16">
      ${toastButton("Ouvrir", "btn outline auto sm")}
      <button class="btn ghost auto sm${helpful ? " on" : ""}" type="button" data-helpful="${item.title}" aria-pressed="${helpful}">${icon("thumbsUp", 16)} Ça m'a aidé</button>
    </div>
  </article>`;
}

function helpSection() {
  return `<div class="stack mt16">
    <section class="emergency-box"><h2 class="emergency-title">${EMERGENCY.title}</h2>
      ${EMERGENCY.lines
        .map(
          (line) => `<p class="text-sm b mt12">${line.text}</p><div class="calls mt8">${line.calls
            .map((call) => `<a href="${telHref(call.phoneHref)}">${icon("phone", 16)} Appeler le ${call.label}</a>`)
            .join("")}</div>`,
        )
        .join("")}
    </section>
    <p class="text-sm muted">Ces services vous écoutent, vous informent et vous orientent.</p>
    ${HELPLINES.map(
      (helpline) => `<div class="card"><p class="b">${helpline.name}</p><p class="phone-num">${helpline.phone}</p>
        <p class="text-sm muted">${helpline.hours}${helpline.details ? ` · ${helpline.details}` : ""}</p>
        <a class="btn primary auto sm mt12" href="${telHref(helpline.phoneHref)}">${icon("phone", 16)} Appeler</a></div>`,
    ).join("")}
  </div>`;
}

function forms(state: State) {
  const tab = state.formsTab;
  const placeholder = tab === "conseils" ? "Rechercher un conseil" : "Rechercher une aide";
  const content =
    tab === "aide"
      ? helpSection()
      : `<button class="fake-search mt12" type="button" data-toast>${icon("search", 16)} ${placeholder}</button>
        <div class="stack mt16">${(tab === "conseils" ? CONSEILS : STRUCTURES).map((item) => resource(state, item, tab === "conseils" ? "lightbulb" : "mapPin")).join("")}</div>`;
  return `<div class="pad forms">
    <header class="forms-head"><span class="forms-title">${icon("compass", 24, "primary")}<h1 class="title">AddictForms</h1></span>
      <span class="forms-tools">
        <button class="round lg" type="button" data-toast aria-label="Mes favoris">${icon("bookmark")}</button>
        <button class="round lg sos" type="button" data-pill="forms" data-value="aide" aria-label="Besoin d'aide immédiate">${icon("phone")}</button>
      </span></header>
    ${pills("forms", [["conseils", "Conseils"], ["structures", "Où se faire aider"], ["aide", "Besoin d'aide"]], tab)}
    ${content}
  </div>`;
}

/* ---------- Mon compte ---------- */

function activityList() {
  return `<p class="flex-note">${icon("eye", 16)} Voici ce que vos abonnés voient de vous dans leur fil.</p>
  <ul class="stack-sm mt12">
    <li class="mini-card" data-go="news" role="button" tabindex="0">${badgeTile("🌿", false, false)}<span class="grow"><span class="text-sm block"><b>Vous</b> avez débloqué le badge 21 jours — Tabac</span><span class="small muted block mt4">il y a 2 jours · 6 Props · 3 commentaires</span></span>${icon("chevronRight", 20, "muted")}</li>
    <li class="mini-card" data-go="news" role="button" tabindex="0">${badgeTile("🎯", false, false)}<span class="grow"><span class="text-sm block"><b>Vous</b> avez débloqué le badge 10 envies maîtrisées</span><span class="small muted block mt4">il y a 8 jours · 4 Props</span></span>${icon("chevronRight", 20, "muted")}</li>
    <li class="mini-card" data-go="news" role="button" tabindex="0">${badgeTile("🏆", false, false)}<span class="grow"><span class="text-sm block"><b>Vous</b> avez battu votre record au mini-jeu</span><span class="small muted block mt4">il y a 12 jours · 2 Props</span></span>${icon("chevronRight", 20, "muted")}</li>
  </ul>`;
}

function compte(state: State) {
  const best = Math.max(...ADDICTIONS.map((addiction) => computeStats(addiction, state.marks[addiction.id]).current));
  const tracked = computeStats(ADDICTIONS[0]!, state.marks.tabac).tracked;
  const unlocked = [
    ...STREAK_BADGES.filter((badge) => badge.threshold <= 31).reverse().map((badge) => ({ ...badge, label: streakLabel(badge.threshold) })),
    ...CRAVING_BADGES.filter((badge) => badge.threshold <= SESSIONS.length).reverse().map((badge) => ({ ...badge, label: cravingLabel(badge.threshold) })),
  ].slice(0, 5);
  const content =
    state.compteTab === "activite"
      ? activityList()
      : state.compteTab === "badges"
        ? `<ul class="stack-sm">${unlocked.map((badge) => `<li class="mini-card plain">${badgeTile(badge.emoji, false, false)}<span class="grow"><span class="text-sm b block trunc">${badge.name}</span><span class="small muted block trunc">${badge.label}</span></span></li>`).join("")}</ul>
           <button class="btn outline spread mt16" type="button" data-go="badges">Tous les badges et le mini-jeu ${icon("chevronRight")}</button>`
        : `<section class="card center">${icon("messageCircle", 32, "primary")}<p class="b mt12">Vos conversations apparaîtront ici</p><p class="text-sm muted mt4">${SOON}.</p></section>`;
  return `<div class="pad">
    <header class="profile"><button class="avatar" type="button" data-toast aria-label="Modifier mon profil (nom affiché et photo)">C</button>
      <div class="grow"><h1 class="title">Camille</h1><button class="underline text-sm muted" type="button" data-toast>Modifier mon profil</button></div>
      <button class="round lg gear" type="button" data-toast aria-label="Paramètres">${icon("settings")}</button></header>
    <dl class="figures mt20">
      <div><dd>${best}</dd><dt>Série en cours</dt></div>
      <div><dd>${tracked}</dd><dt>Jours suivis</dt></div>
      <div><dd>${badgeCount(state)}</dd><dt>Badges</dt></div>
    </dl>
    <div class="friends mt12">
      <button type="button" data-toast><b>${FRIENDS.followers}</b><span>Abonnés</span></button>
      <button type="button" data-toast><b>${FRIENDS.following}</b><span>Abonnements</span></button>
      <button class="new" type="button" data-toast>${icon("userPlus")}<span>Nouveaux amis</span></button>
    </div>
    <div class="mt20">${pills("compte", [["activite", "Mon activité"], ["badges", "Mes badges"], ["messages", "Messages"]], state.compteTab)}</div>
    <div class="mt16">${content}</div>
  </div>`;
}

/* ---------- Actualités ---------- */

function news(state: State) {
  const cards = FEED.map((card) => {
    const mine = state.myProps.includes(card.id);
    const props = card.props + (mine ? 1 : 0);
    return `<article class="card">
      <div class="line top"><span class="avatar sm">${card.name.charAt(0)}</span>
        <div class="grow"><p class="text-sm"><b>${card.mine ? "Vous" : card.name}</b> ${card.sentence}</p><p class="small muted mt4">${card.when}</p></div></div>
      ${card.badge ? `<div class="feed-badge mt12">${badgeTile(card.badge.emoji)}<div><p class="text-sm b">${card.badge.name}</p><p class="small muted">${card.badge.tier}</p></div></div>` : ""}
      ${card.details ? `<p class="note text-sm mt12">${card.details}</p>` : ""}
      <div class="feed-actions mt12">
        <button class="act${mine ? " on" : ""}" type="button" ${card.mine ? "disabled" : `data-prop="${card.id}"`} aria-pressed="${mine}">${icon("handMetal")} Props <span>${props}</span></button>
        <button class="act end" type="button" data-toast>${icon("messageCircle")} Commenter <span>${card.comments}</span></button>
      </div>
    </article>`;
  }).join("");
  return `<div class="pad">
    <div class="between"><h1 class="h1 flat">Actualités</h1>
      <span class="forms-tools"><button class="round" type="button" data-toast aria-label="Actualiser">${icon("refresh")}</button>
      <button class="round" type="button" data-toast aria-label="Activité">${icon("bell")}</button></span></div>
    <div class="stack mt20">${cards}</div>
  </div>`;
}

/* ---------- Coque de l'appli ---------- */

const TABS: { name: Route["name"]; label: string; icon: IconName }[] = [
  { name: "home", label: "Mes addictions", icon: "heartPulse" },
  { name: "news", label: "Actualités", icon: "newspaper" },
  { name: "forms", label: "AddictForms", icon: "compass" },
  { name: "compte", label: "Mon compte", icon: "userRound" },
];

function screen(route: Route, state: State) {
  switch (route.name) {
    case "home": return home(state);
    case "fiche": return fiche(state, route.id);
    case "choose": return choose();
    case "context": return context(state);
    case "session": return session(state);
    case "done": return done(state);
    case "game": return game();
    case "envies": return envies(state);
    case "badges": return badges(state);
    case "forms": return forms(state);
    case "compte": return compte(state);
    case "news": return news(state);
  }
}

/** Toute l'appli pour une route : le contenu défilant et, sur les 4 écrans principaux, la barre d'onglets. */
export function renderApp(route: Route, state: State) {
  const tabbed = TABS.some((tab) => tab.name === route.name);
  const bar = tabbed
    ? `<nav class="tabbar" aria-label="Navigation de la démo">${TABS.map(
        (tab) => `<button type="button" data-tab="${tab.name}" ${tab.name === route.name ? 'aria-current="page" class="on"' : ""}>${icon(tab.icon)}<span>${tab.label}</span></button>`,
      ).join("")}</nav>`
    : "";
  return `<div class="scroll${tabbed ? " tabbed" : ""}" data-scroll tabindex="-1">${screen(route, state)}</div>${bar}<p class="toast" data-toast-box role="status" hidden></p>`;
}

