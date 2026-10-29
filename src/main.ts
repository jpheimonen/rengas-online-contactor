import "./style.css";
import {
  RUNGS,
  TARGET,
  canAttemptUnlock,
  currentLevel,
  isUnlocked,
  validateKey,
  type Action,
  type Rung,
} from "./ladder";

const ACK_KEY = "roc-disclaimer-acknowledged";
const STEP_DELAY_MS = 550;
const VERIFY_DELAY_MS = 900;

const unlocked = new Set<string>();
const running = new Set<string>();
const verifying = new Set<string>();

const app = document.querySelector<HTMLDivElement>("#app")!;

const CHANNEL_ICON: Record<Action["channel"], string> = {
  web: "🌐",
  phone: "☎️",
  email: "✉️",
  sms: "💬",
  voice: "🤖",
  social: "👍",
  osint: "🔍",
  blimp: "🎈",
};

app.innerHTML = `
  <div class="banner" role="alert">
    <span>⚠️ JOKE PROJECT — PLEASE DON'T ACTUALLY USE IT. Nothing here is ever sent to anyone. ⚠️</span>
  </div>
  <header class="hero">
    <h1>Rengas Online Contactor<span class="tm">™</span></h1>
    <p class="sub">The AI agent that gets a reply from <strong>${TARGET}</strong>, one way or another.</p>
    <p class="sub small">Every email, text, call and blimp below is <strong>simulated in your browser</strong>.
      Keys are kept in memory only and go nowhere.</p>
  </header>
  <main class="layout">
    <section class="ladder" aria-label="Escalation ladder">
      <div class="meter">
        <span>Rengas Online staff mood:</span>
        <strong id="mood"></strong>
        <div class="meter-bar"><div id="meter-fill"></div></div>
      </div>
      <ol id="rungs" class="rungs" reversed></ol>
      <button id="reset" class="ghost">😇 De-escalate (forget all keys and start over)</button>
    </section>
    <aside class="log-panel" aria-label="Activity log">
      <h2>Agent activity log</h2>
      <p class="small">Every line is fake. No network requests are made.</p>
      <ul id="log" class="log" aria-live="polite"></ul>
    </aside>
  </main>
  <footer class="footer">
    <p><strong>Disclaimer:</strong> This is satire. Harassing, threatening or stalking people or businesses
      is illegal and awful. The integrations are fake on purpose, staff names are invented, and no messages,
      calls or requests ever leave this page. If you need help from a shop, call them once and be nice. 🛞</p>
  </footer>
  <dialog id="disclaimer" class="disclaimer">
    <h2>🚨 PLEASE DON'T ACTUALLY USE THIS 🚨</h2>
    <p>This is a <strong>joke project</strong>. It parodies "AI agents" that escalate customer complaints
      until someone, anyone, answers.</p>
    <ul>
      <li>Nothing is sent. Every email, SMS, call and Facebook message is a simulation shown on screen.</li>
      <li>The API keys you type are not checked, stored or sent anywhere.</li>
      <li>Every "staff" member it finds is made up.</li>
      <li>Harassing real people or businesses is illegal and mean. Don't.</li>
    </ul>
    <label class="ack"><input type="checkbox" id="ack-box" /> I understand this is a joke and I won't use it on anyone.</label>
    <button id="ack-btn" class="primary" disabled>Enter the ladder</button>
  </dialog>
`;

const rungsEl = document.querySelector<HTMLOListElement>("#rungs")!;
const logEl = document.querySelector<HTMLUListElement>("#log")!;
const moodEl = document.querySelector<HTMLElement>("#mood")!;
const meterFill = document.querySelector<HTMLDivElement>("#meter-fill")!;

function rungHtml(rung: Rung, index: number): string {
  const open = isUnlocked(index, unlocked);
  const next = canAttemptUnlock(index, unlocked);
  const state = open ? "unlocked" : next ? "next" : "locked";
  const badge = open ? "🔓 Unlocked" : next ? "🔑 Needs keys" : "🔒 Locked";

  let body: string;
  if (open) {
    body = `<div class="actions">${rung.actions
      .map(
        (a) => `
          <button class="action" data-action="${a.id}" ${running.has(a.id) ? "disabled" : ""}>
            ${CHANNEL_ICON[a.channel]} ${running.has(a.id) ? "Running…" : a.label}
          </button>
          ${a.speech ? `<button class="ghost" data-speak="${a.id}">🔊 Hear the robocall (your speakers only)</button>` : ""}`,
      )
      .join("")}</div>`;
  } else if (next) {
    const busy = verifying.has(rung.id);
    body = `
      <form class="keys" data-rung="${rung.id}" novalidate>
        ${rung.keys
          .map(
            (k) => `
            <label>${k.label}
              <input name="${k.id}" type="password" autocomplete="off" spellcheck="false"
                placeholder="${k.placeholder}" ${busy ? "disabled" : ""} />
              <span class="error" data-error="${k.id}"></span>
            </label>`,
          )
          .join("")}
        <button class="primary" type="submit" ${busy ? "disabled" : ""}>
          ${busy ? "Verifying keys…" : `Unlock level ${rung.level}`}
        </button>
        <p class="small">Any key-shaped text works. It isn't checked or sent anywhere.</p>
      </form>`;
  } else {
    const needs = rung.keys.map((k) => k.label).join(" + ");
    body = `<p class="small">Unlock the level below first. Needs: ${needs}.</p>`;
  }

  return `
    <li class="rung ${state}" data-level="${rung.level}">
      <div class="rung-head">
        <span class="level">LVL ${rung.level}</span>
        <div>
          <h3>${rung.title}</h3>
          <p class="tagline">${rung.tagline}</p>
        </div>
        <span class="badge">${badge}</span>
      </div>
      ${body}
    </li>`;
}

function render(): void {
  rungsEl.innerHTML = RUNGS.map((r, i) => ({ r, i }))
    .reverse()
    .map(({ r, i }) => rungHtml(r, i))
    .join("");
  const level = currentLevel(unlocked);
  moodEl.textContent = RUNGS[level].threat;
  meterFill.style.width = `${((level + 1) / RUNGS.length) * 100}%`;
  document.body.dataset.level = String(level + 1);
}

function log(text: string, kind: "info" | "sim" | "ok" = "sim"): void {
  const li = document.createElement("li");
  li.className = kind;
  const time = new Date().toLocaleTimeString();
  const tag = kind === "sim" ? '<span class="tag">SIMULATED</span>' : "";
  li.innerHTML = `<time>${time}</time>${tag}<span></span>`;
  li.querySelector("span:last-child")!.textContent = text;
  logEl.prepend(li);
}

function findAction(id: string): Action {
  return RUNGS.flatMap((r) => r.actions).find((a) => a.id === id)!;
}

// Updates just the action's button, so a re-render doesn't wipe keys being typed elsewhere.
function setActionButton(action: Action): void {
  const button = rungsEl.querySelector<HTMLButtonElement>(
    `[data-action="${action.id}"]`,
  );
  if (!button) return;
  const busy = running.has(action.id);
  button.disabled = busy;
  button.textContent = `${CHANNEL_ICON[action.channel]} ${busy ? "Running…" : action.label}`;
}

async function runAction(action: Action): Promise<void> {
  running.add(action.id);
  setActionButton(action);
  log(`▶ ${action.label}`, "info");
  for (const line of action.script) {
    await sleep(STEP_DELAY_MS);
    log(line);
  }
  log("✔ Done. Nothing was actually sent.", "ok");
  running.delete(action.id);
  setActionButton(action);
}

async function unlockRung(form: HTMLFormElement): Promise<void> {
  const rung = RUNGS.find((r) => r.id === form.dataset.rung)!;
  let valid = true;
  for (const key of rung.keys) {
    const input = form.elements.namedItem(key.id) as HTMLInputElement;
    const error = validateKey(input.value);
    form.querySelector<HTMLElement>(`[data-error="${key.id}"]`)!.textContent =
      error ?? "";
    input.setAttribute("aria-invalid", String(error !== null));
    if (error) valid = false;
  }
  if (!valid) return;

  verifying.add(rung.id);
  render();
  await sleep(VERIFY_DELAY_MS);
  verifying.delete(rung.id);
  unlocked.add(rung.id);
  log(
    `🔓 Level ${rung.level} "${rung.title}" unlocked. Keys accepted without checking.`,
    "ok",
  );
  render();
  rungsEl
    .querySelector(`[data-level="${rung.level}"]`)!
    .scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function speak(action: Action): void {
  if (!("speechSynthesis" in window)) {
    log(
      "Your browser has no speech synthesis, so imagine a very tired robot voice.",
      "info",
    );
    return;
  }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(action.speech);
  utterance.rate = 0.9;
  utterance.pitch = 0.7;
  speechSynthesis.speak(utterance);
  log(
    "🔊 Playing the robocall on your own speakers. Nobody else hears it.",
    "info",
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

rungsEl.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "button",
  );
  if (!target) return;
  if (target.dataset.action) void runAction(findAction(target.dataset.action));
  if (target.dataset.speak) speak(findAction(target.dataset.speak));
});

rungsEl.addEventListener("submit", (event) => {
  event.preventDefault();
  void unlockRung(event.target as HTMLFormElement);
});

document.querySelector("#reset")!.addEventListener("click", () => {
  unlocked.clear();
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  log(
    "😇 De-escalated. All keys forgotten. Maybe just send them one nice email.",
    "info",
  );
  render();
});

const dialog = document.querySelector<HTMLDialogElement>("#disclaimer")!;
const ackBox = document.querySelector<HTMLInputElement>("#ack-box")!;
const ackBtn = document.querySelector<HTMLButtonElement>("#ack-btn")!;
ackBox.addEventListener("change", () => (ackBtn.disabled = !ackBox.checked));
ackBtn.addEventListener("click", () => {
  sessionStorage.setItem(ACK_KEY, "yes");
  dialog.close();
});
dialog.addEventListener("cancel", (event) => event.preventDefault());
if (sessionStorage.getItem(ACK_KEY) !== "yes") dialog.showModal();

log(
  `Agent ready. Target: ${TARGET}. Start at level 1, like a reasonable person.`,
  "info",
);
render();
