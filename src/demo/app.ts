import { ACTIVITIES, ADDICTIONS, QUIZ } from "./data";
import { SOON, formatCountdown, initialCraving, initialState, renderApp, type Route, type State } from "./screens";

const SESSION_SECONDS = 180;

/** Fait vivre le téléphone du milieu : tout reste en mémoire et disparaît au rechargement de la page. */
export function start(root: HTMLElement) {
  const state: State = initialState();
  let timer: number | undefined;
  let startedAt = 0;
  let toastTimer: number | undefined;

  const route = () => state.stack[state.stack.length - 1]!;

  function draw(keepScroll = false) {
    const scroller = root.querySelector<HTMLElement>("[data-scroll]");
    const top = keepScroll ? (scroller?.scrollTop ?? 0) : 0;
    const hadFocus = root.contains(document.activeElement);
    root.innerHTML = renderApp(route(), state);
    const next = root.querySelector<HTMLElement>("[data-scroll]");
    if (next) next.scrollTop = top;
    // Jamais de défilement de la page : le focus reste dans le téléphone, sans bouger l'écran.
    if (hadFocus) next?.focus({ preventScroll: true });
  }

  function go(next: Route) {
    state.stack.push(next);
    draw();
  }

  function back() {
    if (route().name === "game") {
      state.stack.pop();
      draw();
      return;
    }
    if (state.stack.length > 1) state.stack.pop();
    state.dayOpen = null;
    draw();
  }

  function toast(message = SOON) {
    const box = root.querySelector<HTMLElement>("[data-toast-box]");
    if (!box) return;
    box.textContent = message;
    box.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => (box.hidden = true), 2600);
  }

  function stopTimer() {
    window.clearInterval(timer);
    timer = undefined;
  }

  function tick() {
    const left = Math.max(0, SESSION_SECONDS - Math.floor((Date.now() - startedAt) / 1000));
    state.craving.remaining = left;
    if (left <= 0) {
      stopTimer();
      state.craving.intensity = null;
      if (route().name === "game") state.stack.pop();
      state.stack[state.stack.length - 1] = { name: "done" };
      draw();
      return;
    }
    const text = root.querySelector("[data-timer]");
    if (text) text.textContent = formatCountdown(left);
    const bar = root.querySelector<HTMLElement>("[data-timer-bar]");
    if (bar) bar.style.width = `${Math.round(((SESSION_SECONDS - left) / SESSION_SECONDS) * 100)}%`;
  }

  function startSession() {
    const { addiction, place, before } = state.craving;
    state.craving = { ...initialCraving(addiction), place, before, activity: Math.floor(Math.random() * ACTIVITIES.length) };
    startedAt = Date.now();
    stopTimer();
    timer = window.setInterval(tick, 500);
    state.stack = [{ name: "home" }, { name: "session" }];
    draw();
  }

  function saveToday(input: HTMLInputElement) {
    const addiction = ADDICTIONS[0]!;
    const value = Number(input.value.replace(",", ".").trim() || "NaN");
    if (!Number.isFinite(value) || value < 0) {
      toast("Saisissez une consommation valide");
      return;
    }
    const relapse = value >= (addiction.reference ?? 0);
    state.marks.tabac[0] = { status: relapse ? "relapse" : "success", consumption: value };
    draw(true);
    toast(relapse ? "Journée notée. Votre record reste acquis." : "Journée enregistrée");
  }

  root.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("button, [data-go], [data-close-day]");
    if (!target || (target as HTMLButtonElement).disabled) return;
    root.closest(".float")?.classList.add("touched");
    const data = target.dataset;
    if (route().name !== "fiche") state.banner = null;

    if (data.back !== undefined) back();
    else if (data.tab) {
      state.stack = [{ name: data.tab } as Route];
      draw();
    } else if (data.go === "fiche") go({ name: "fiche", id: data.id as "tabac" | "reseaux" });
    else if (data.go) go({ name: data.go } as Route);
    else if (data.toast !== undefined) toast();
    else if (data.home !== undefined) {
      stopTimer();
      state.stack = [{ name: "home" }];
      draw();
    } else if (data.pill === "forms") {
      state.formsTab = data.value as State["formsTab"];
      draw();
    } else if (data.pill === "compte") {
      state.compteTab = data.value as State["compteTab"];
      draw(true);
    } else if (data.craving) {
      state.craving = initialCraving(data.craving as "tabac" | "reseaux");
      go({ name: "context" });
    } else if (data.context) {
      const field = data.context as "place" | "before";
      state.craving[field] = state.craving[field] === data.value ? null : (data.value ?? null);
      draw(true);
    } else if (data.start !== undefined) startSession();
    else if (data.nextActivity !== undefined) {
      state.craving.activity += 1;
      draw(true);
    } else if (data.mode) {
      state.craving.mode = data.mode as "activity" | "quiz";
      draw(true);
    } else if (data.answer) {
      const picked = Number(data.answer);
      state.craving.picked = picked;
      state.craving.answered += 1;
      if (QUIZ[state.craving.question % QUIZ.length]?.answer === picked) state.craving.score += 1;
      draw(true);
    } else if (data.nextQuestion !== undefined) {
      state.craving.question += 1;
      state.craving.picked = null;
      draw(true);
    } else if (data.ended !== undefined) {
      stopTimer();
      state.banner = "Bravo. Vous avez laissé passer une vague sans agir dessus. Votre série et votre record sont intacts.";
      state.stack = [{ name: "home" }, { name: "fiche", id: state.craving.addiction }];
      draw();
    } else if (data.intensity) {
      state.craving.intensity = Number(data.intensity);
      draw(true);
    } else if (data.month) {
      const id = data.id ?? "tabac";
      state.calendar[id] = (state.calendar[id] ?? 0) + Number(data.month);
      draw(true);
    } else if (data.day) {
      state.dayOpen = Number(data.day);
      draw(true);
    } else if (data.closeDay !== undefined) {
      state.dayOpen = null;
      draw(true);
    } else if (data.saveToday !== undefined) {
      const input = root.querySelector<HTMLInputElement>("#today-consumption");
      if (input) saveToday(input);
    } else if (data.today) {
      const current = route();
      if (current.name === "fiche") {
        const marks = state.marks[current.id];
        if (marks[0]?.status === data.today) delete marks[0];
        else marks[0] = { status: data.today as "success" | "relapse", consumption: null };
        draw(true);
        if (data.today === "relapse" && marks[0]) toast("Journée notée. Votre record reste acquis.");
      }
    } else if (data.envieMonth) {
      state.enviesMonth += Number(data.envieMonth);
      state.enviesDay = null;
      draw(true);
    } else if (data.envieDay) {
      state.enviesDay = Number(data.envieDay);
      draw(true);
    } else if (data.badgesTab) {
      state.badgesTab = data.badgesTab as State["badgesTab"];
      draw();
    } else if (data.favorite) {
      const added = !state.favorites.includes(data.favorite);
      state.favorites = added ? [...state.favorites, data.favorite] : state.favorites.filter((title) => title !== data.favorite);
      draw(true);
      toast(added ? "Ajouté aux favoris" : "Retiré des favoris");
    } else if (data.helpful) {
      state.helpful = state.helpful.includes(data.helpful) ? state.helpful.filter((title) => title !== data.helpful) : [...state.helpful, data.helpful];
      draw(true);
    } else if (data.prop) {
      state.myProps = state.myProps.includes(data.prop) ? state.myProps.filter((id) => id !== data.prop) : [...state.myProps, data.prop];
      draw(true);
    }
  });

  root.addEventListener("keydown", (event) => {
    const target = event.target as HTMLElement;
    if (event.key === "Enter" && target.dataset.go) target.click();
    if (event.key === "Escape" && state.dayOpen !== null) {
      state.dayOpen = null;
      draw(true);
    }
  });

  root.addEventListener("focusin", () => root.closest(".float")?.classList.add("touched"));
  root.dataset.ready = "true";
}
