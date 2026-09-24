import { AGENT_RUNNABLE, STEP_CATALOG } from "/agent-tools.js";
import { fillInstruction } from "/instructions.js";

const STEPS = [
  { id: "set-up", label: "Set up", title: "Set up this brand", help: "Prepare the library on this computer.", button: "Set up this brand", cli: "init", fields: [] },
  { id: "add-notes", label: "Add notes", title: "Add the notes", help: "The winning-ad notes this work starts from.", button: "Add these notes", cli: "brief", fields: ["notes"] },
  { id: "find-footage", label: "Find footage", title: "Find footage you already have", help: "Look through this brand’s library before making a new clip.", button: "Search the library", cli: "search-broll", fields: ["footage"] },
  { id: "write-script", label: "Write the script", title: "Write the script", help: "A draft. It is not approved.", button: "Write the script", cli: "script", fields: [] },
  { id: "approve-script", label: "Approve the script", title: "Approve the script", help: "Only after you have read a script that passed the claims check.", button: "I read it. Approve.", cli: "script --approve", fields: [] },
  { id: "check-price", label: "Check the price", title: "Check the price", help: "Nothing is charged.", button: "Check the price", cli: "estimate", fields: ["price"] },
  { id: "make-clip", label: "Make the clip", title: "Make the clip", help: "A practice clip. Confirmation is separate.", button: "Try it — it should stop", cli: "generate", fields: ["price"] },
  { id: "rough-cut", label: "Build the rough cut", title: "Build the rough cut", help: "Files for the editor. The ad is not posted.", button: "Build the rough cut", cli: "assemble", fields: [] },
  { id: "spending", label: "See spending", title: "See spending", help: "What has been counted against the budget.", button: "See spending", cli: "cost", fields: [] },
  { id: "practice", label: "Practice run", title: "Practice run", help: "The packaged path, in its own library.", button: "Run the practice job", cli: "demo", fields: [], apart: true },
  { id: "keys", label: "Keys", title: "Keys and install", help: "Save API keys on this computer, and copy the official install commands.", button: "", cli: "", fields: [], apart: true },
];

const state = { brandId: "aether-wellness", step: "find-footage", snapshot: null, last: null, priced: null, confirming: false, models: [], model: "", keys: [] };
const agent = { open: false, messages: [], busy: false };
const AGENT_ROUNDS = 4;

const $ = (id) => document.getElementById(id);

function dollars(n) {
  return `$${n.toFixed(2)}`;
}

function scaleDollars(n) {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

function priceFields() {
  return {
    seconds: Number($("seconds").value || 5),
    backend: $("backend").value,
    resolution: $("size").value,
  };
}

function blanks(extra = {}) {
  const brand = state.snapshot?.brand;
  return {
    brand: state.brandId,
    brandName: brand?.name ?? "Aether Wellness",
    notesPath: $("notes").value,
    footage: $("footage").value,
    seconds: Number($("seconds").value || 5),
    backend: $("backend").value,
    resolution: $("size").value,
    ...extra,
  };
}

/* ---------- Result readout ---------- */

function resultFor(exitCode) {
  if (exitCode === 0) return { state: "ok", lamp: "ok", status: "Done · exit 0" };
  if (exitCode === 2) return { state: "stopped-on-purpose", lamp: "signal", status: "Stopped on purpose · exit 2" };
  if (exitCode === 1) return { state: "invalid", lamp: "signal", status: "Not valid · exit 1" };
  if (exitCode === 3 || exitCode === 4 || exitCode === 5) return { state: "stopped", lamp: "signal", status: `Stopped · exit ${exitCode}` };
  return { state: "ok", lamp: "ok", status: "Done" };
}

function setResult(text, view) {
  $("sentence").textContent = text;
  $("result").dataset.state = view.state;
  $("result-lamp").dataset.lamp = view.lamp;
  $("result-status").textContent = view.status;
}

const VIEW = {
  idle: { state: "idle", lamp: "off", status: "Nothing run yet" },
  running: { state: "running", lamp: "done", status: "Working" },
  busy: { state: "stopped", lamp: "signal", status: "Busy" },
  offline: { state: "invalid", lamp: "signal", status: "Desk not running" },
  saved: { state: "ok", lamp: "ok", status: "Saved" },
  refused: { state: "invalid", lamp: "signal", status: "Stopped" },
};

/* ---------- Readings for the transport keys ---------- */

function reading(step, brand) {
  const total = brand.library.fine + brand.library.heldBack;
  switch (step.id) {
    case "set-up":
      return total > 0 ? { lamp: "done", text: "ready" } : { lamp: "pending", text: "—" };
    case "add-notes":
      return brand.notes ? { lamp: "done", text: "on file" } : { lamp: "pending", text: "—" };
    case "find-footage":
      return { lamp: total > 0 ? "done" : "pending", text: `${brand.library.fine}·${brand.library.heldBack}` };
    case "write-script":
      if (!brand.script) return { lamp: "pending", text: "—" };
      return { lamp: "done", text: brand.script.lintPass ? "passed" : "failed" };
    case "approve-script":
      if (!brand.script) return { lamp: "pending", text: "—" };
      return brand.script.approved ? { lamp: "done", text: "approved" } : { lamp: "pending", text: "waiting" };
    case "check-price":
      return brand.clip ? { lamp: "done", text: dollars(brand.clip.quotedUsd) } : { lamp: "pending", text: "—" };
    case "make-clip":
      if (!brand.clip) return { lamp: "pending", text: "—" };
      return { lamp: "done", text: `${brand.clip.dryRun ? "practice" : "made"} ${dollars(brand.clip.spentUsd)}` };
    case "spending":
      return { lamp: brand.budget.spentUsd > 0 ? "done" : "pending", text: dollars(brand.budget.spentUsd) };
    case "keys": {
      const set = state.keys.filter((key) => key.set).length;
      return set > 0 ? { lamp: "done", text: `${set} set` } : { lamp: "pending", text: "not set" };
    }
    default:
      return { lamp: "pending", text: "—" };
  }
}

/* ---------- Step view ---------- */

function showFields() {
  const step = STEPS.find((item) => item.id === state.step);
  for (const id of ["notes-label", "footage-label", "seconds-label", "backend-label", "size-label"]) {
    $(id).hidden = true;
  }
  if (step.fields.includes("notes")) $("notes-label").hidden = false;
  if (step.fields.includes("footage")) $("footage-label").hidden = false;
  if (step.fields.includes("price")) {
    $("seconds-label").hidden = false;
    $("backend-label").hidden = false;
    $("size-label").hidden = false;
  }
  $("backend-hint").textContent = `--backend ${$("backend").value}`;
  $("size-hint").textContent = `--resolution ${$("size").value}`;
  $("step-title").textContent = step.title;
  $("step-help").textContent = step.help;
  const keys = state.step === "keys";
  const canFill = state.models.length > 0 && !keys;
  $("form").hidden = keys || step.fields.length === 0;
  $("ai-row").hidden = !canFill;
  $("fill").hidden = !canFill;
  $("model-label").hidden = !canFill;
  $("keys").hidden = !keys;
  const make = state.step === "make-clip";
  $("actions").hidden = keys;
  $("actions").classList.toggle("single", !make);
  $("run").hidden = make || keys;
  $("run-wrap").hidden = make || keys;
  $("try-stop").hidden = !make;
  $("try-stop-wrap").hidden = !make;
  $("open-sheet").hidden = !make;
  $("open-sheet-wrap").hidden = !make;
  $("copy").hidden = keys;
  $("copy-wrap").hidden = keys;
  $("toggle-terminal").hidden = keys;
  if (keys) $("terminal").hidden = true;
  if (!keys) {
    $("run").textContent = step.button;
    $("run-hint").textContent = `runs jeremai ${step.cli}`;
  }
  $("instruction").textContent = keys
    ? "Install commands are on this tab. Copy does not run them."
    : fillInstruction(state.step, blanks());
  $("ticket-step").textContent = make ? `${step.label} · unconfirmed` : step.label;
  $("ticket-brand").textContent = state.brandId;
  renderGate();
  if (keys) loadKeys();
}

function renderGate() {
  const brand = state.snapshot?.brand;
  const readout = $("gate-readout");
  const lamp = readout.querySelector(".lamp");
  if (brand?.budget.hardStop) {
    readout.className = "value signal";
    lamp.dataset.lamp = "signal";
    $("gate-text").textContent = "Budget reached · clips stop";
    return;
  }
  if (state.step === "make-clip") {
    readout.className = "value signal";
    lamp.dataset.lamp = "signal";
    $("gate-text").textContent = "Confirm required";
    return;
  }
  readout.className = "value";
  lamp.dataset.lamp = "off";
  $("gate-text").textContent = "Closed · this step spends nothing";
}

function renderGauge(budget) {
  const pct = Math.max(0, Math.min(100, budget.usedPct));
  $("gauge-needle").style.left = `${pct}%`;
  $("gauge-fill").style.width = `${pct}%`;
  $("gauge-fill").classList.toggle("warn", budget.warn80);
  $("gauge").setAttribute("aria-label", `${pct.toFixed(1)}% of the budget spent`);
  const scale = $("gauge-scale");
  scale.textContent = "";
  for (const stop of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
    const span = document.createElement("span");
    span.textContent = stop === 0.8 ? `${scaleDollars(budget.capUsd * stop)} · 80%` : scaleDollars(budget.capUsd * stop);
    if (stop === 0.8) span.className = "warn";
    scale.append(span);
  }
}

function render() {
  const brand = state.snapshot?.brand;
  if (!brand) return;
  $("brand-name").textContent = brand.name;
  $("product").textContent = brand.product;
  const spent = brand.budget.spentUsd;
  $("budget").textContent = "";
  const amount = document.createElement("span");
  amount.className = "amount";
  amount.textContent = `Spent ${dollars(spent)} / ${dollars(brand.budget.capUsd)}`;
  $("budget").append(amount);
  const note = document.createElement("span");
  note.className = brand.budget.warn80 ? "warn" : "dim";
  note.textContent = spent === 0 ? "Nothing spent yet" : `${brand.budget.usedPct.toFixed(1)}% of the budget`;
  $("budget").append(note);
  if (brand.budget.warn80) {
    const span = document.createElement("span");
    span.className = "warn";
    span.textContent = "You have used 80% of the budget.";
    $("budget").append(span);
  }
  renderGauge(brand.budget);
  const library = $("library-readout");
  library.textContent = "";
  const fine = document.createElement("span");
  fine.className = "big";
  fine.textContent = String(brand.library.fine);
  const dot = document.createElement("span");
  dot.className = "dim";
  dot.textContent = "·";
  const held = document.createElement("span");
  held.className = "big";
  held.textContent = String(brand.library.heldBack);
  library.append(fine, " fine ", dot, " ", held, " held back");
  $("ticket-quote").textContent = brand.clip ? `${dollars(brand.clip.quotedUsd)} quoted` : "—";
  $("ticket-charged").textContent = dollars(spent);
  const select = $("brand");
  select.textContent = "";
  for (const item of state.snapshot.brands) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    select.append(option);
  }
  select.value = state.brandId;
  if (!$("backend").dataset.touched) $("backend").value = brand.preferredBackend;
  if (!$("notes").dataset.touched && brand.notesPrefill) $("notes").value = brand.notesPrefill;
  const nav = $("steps");
  nav.textContent = "";
  let gapDrawn = false;
  for (const step of STEPS) {
    if (step.apart && !gapDrawn) {
      const gap = document.createElement("span");
      gap.className = "gap";
      gap.setAttribute("aria-hidden", "true");
      nav.append(gap);
      gapDrawn = true;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = step.apart ? "tkey apart" : "tkey";
    const current = step.id === state.step;
    button.setAttribute("aria-current", current ? "true" : "false");
    const info = reading(step, brand);
    button.dataset.status = info.lamp;
    const lamp = document.createElement("span");
    lamp.className = "lamp";
    lamp.dataset.lamp = current ? "current" : info.lamp;
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = step.label;
    const read = document.createElement("span");
    read.className = "reading";
    read.textContent = info.text;
    button.append(lamp, label, read);
    button.addEventListener("click", () => {
      state.step = step.id;
      showFields();
      render();
    });
    nav.append(button);
  }
  const scriptSteps = state.step === "write-script" || state.step === "approve-script";
  $("script").hidden = !(scriptSteps && brand.script);
  $("script").textContent = scriptSteps && brand.script ? brand.script.body : "";
  renderGate();
}

async function load() {
  const res = await fetch(`/api/state?brand=${encodeURIComponent(state.brandId)}`);
  if (!res.ok) {
    setResult("That brand is not on this computer.", VIEW.refused);
    return;
  }
  state.snapshot = await res.json();
  await Promise.all([loadModels(), loadKeyStatus()]);
  render();
  showFields();
}

async function loadKeyStatus() {
  try {
    const res = await fetch("/api/keys");
    if (!res.ok) return;
    const body = await res.json();
    state.keys = body.keys ?? [];
  } catch {
    /* The reading stays as it was. */
  }
}

async function run(step, extra) {
  setResult("", VIEW.running);
  const payload = blanks(extra);
  delete payload.brandName;
  let res;
  try {
    res = await fetch("/api/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, step }),
    });
  } catch {
    setResult("The desk is not running on this computer.", VIEW.offline);
    return null;
  }
  const body = await res.json();
  if (res.status === 409) {
    setResult(body.sentence, VIEW.busy);
    return null;
  }
  state.last = body;
  setResult(body.sentence, resultFor(body.exitCode));
  $("terminal").textContent = `${body.stdout ?? ""}${body.stderr ?? ""}`;
  await load();
  return body;
}

$("run").addEventListener("click", () => run(state.step));
$("try-stop").addEventListener("click", () => run("make-clip", { confirm: false }));
$("copy").addEventListener("click", () => copy(fillInstruction(state.step, blanks({ confirm: false }))));
$("ticket-copy").addEventListener("click", () => {
  if (state.step === "keys") return;
  copy(fillInstruction(state.step, blanks({ confirm: false })));
});
$("open-sheet").addEventListener("click", async () => {
  const priced = priceFields();
  const body = await run("check-price");
  const now = priceFields();
  if (priced.seconds !== now.seconds || priced.backend !== now.backend || priced.resolution !== now.resolution) {
    setResult("The price is for different settings. Check the price again.", VIEW.refused);
    return;
  }
  if (!body) return;
  state.priced = priced;
  $("sheet-sentence").textContent = body.sentence;
  $("count-quote").checked = false;
  const blocked = body.exitCode !== 0 || body.sentence.includes("Making a clip will stop");
  $("sheet-confirm").hidden = blocked;
  $("sheet").showModal();
});
$("sheet-close").addEventListener("click", () => $("sheet").close());
$("sheet-confirm").addEventListener("click", async () => {
  if (state.confirming) return;
  state.confirming = true;
  try {
    const priced = state.priced;
    const body = await run("make-clip", {
      confirm: true,
      countQuote: $("count-quote").checked,
      seconds: priced.seconds,
      backend: priced.backend,
      resolution: priced.resolution,
    });
    if (body) $("sheet").close();
  } finally {
    state.confirming = false;
  }
});
$("sheet-copy").addEventListener("click", () => {
  const priced = state.priced;
  if (!priced) {
    setResult("The price is for different settings. Check the price again.", VIEW.refused);
    return;
  }
  copy(fillInstruction("make-clip", blanks({
    confirm: true,
    countQuote: $("count-quote").checked,
    seconds: priced.seconds,
    backend: priced.backend,
    resolution: priced.resolution,
  })));
});
$("toggle-terminal").addEventListener("click", () => {
  $("terminal").hidden = !$("terminal").hidden;
  $("toggle-terminal").textContent = $("terminal").hidden ? "Show the terminal output" : "Hide the terminal output";
});
$("brand").addEventListener("change", () => {
  state.brandId = $("brand").value;
  $("notes").dataset.touched = "";
  $("backend").dataset.touched = "";
  load();
});
$("new-brand-open").addEventListener("click", () => $("new-brand").showModal());
$("new-brand-close").addEventListener("click", () => $("new-brand").close());
$("new-brand-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const allowedClaims = $("new-claims").value.split("\n").map((line) => line.trim()).filter(Boolean);
  let res;
  try {
    res = await fetch("/api/brands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: $("new-name").value,
        product: $("new-product").value,
        budgetCapUsd: Number($("new-budget").value),
        allowedClaims,
      }),
    });
  } catch {
    setResult("The desk is not running on this computer.", VIEW.offline);
    return;
  }
  const body = await res.json();
  setResult(body.sentence, res.ok ? VIEW.saved : VIEW.refused);
  if (!res.ok) return;
  state.brandId = body.id;
  $("notes").dataset.touched = "";
  $("backend").dataset.touched = "";
  $("new-brand-form").reset();
  $("new-brand").close();
  await load();
});
$("notes").addEventListener("input", () => { $("notes").dataset.touched = "1"; showFields(); });
$("footage").addEventListener("input", showFields);
$("seconds").addEventListener("input", showFields);
$("backend").addEventListener("change", () => { $("backend").dataset.touched = "1"; showFields(); });
$("size").addEventListener("change", showFields);

async function copy(text) {
  $("instruction").textContent = text;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* The instruction stays on screen. */
  }
}

async function loadKeys() {
  const res = await fetch("/api/keys");
  if (!res.ok) return;
  const body = await res.json();
  state.keys = body.keys ?? [];
  const form = $("keys-form");
  form.textContent = "";
  for (const key of body.keys) {
    const row = document.createElement("div");
    row.className = "key-row";
    const label = document.createElement("label");
    const title = document.createElement("span");
    title.className = "caps label";
    title.textContent = `${key.label} key`;
    const input = document.createElement("input");
    input.type = "password";
    input.autocomplete = "off";
    input.placeholder = key.set ? "Saved. Paste a new key to replace it." : "Paste the key";
    const status = document.createElement("p");
    status.className = "key-status";
    status.textContent = key.set ? "Saved on this computer." : "Not set.";
    label.append(title, input, status);
    const save = document.createElement("button");
    save.type = "button";
    save.className = "key ink";
    save.textContent = "Save";
    save.addEventListener("click", () => storeKey(key.env, input.value));
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "key";
    clear.textContent = "Remove";
    clear.hidden = !key.set;
    clear.addEventListener("click", () => storeKey(key.env, "", true));
    row.append(label, save, clear);
    form.append(row);
  }
}

async function storeKey(env, value, clear) {
  const res = await fetch("/api/keys", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(clear ? { env, clear: true } : { env, value }),
  });
  const body = await res.json();
  setResult(body.sentence, res.ok ? VIEW.saved : VIEW.refused);
  if (res.ok) {
    await loadKeys();
    await loadModels();
    showFields();
    render();
  }
}

async function loadModels() {
  const res = await fetch("/api/models");
  if (!res.ok) return;
  const body = await res.json();
  state.models = body.models ?? [];
  state.model = body.selected || state.models[0]?.id || "";
  const select = $("model");
  select.textContent = "";
  const agentSelect = $("agent-model");
  agentSelect.textContent = "";
  const list = $("model-list");
  list.textContent = "";
  renderAgentAccess();
  if (!state.models.length) return;
  const heading = document.createElement("h3");
  heading.textContent = "Models that can read text and pictures";
  list.append(heading);
  for (const model of state.models) {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = model.name;
    select.append(option);
    agentSelect.append(option.cloneNode(true));
    const label = document.createElement("label");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "openrouter-model";
    radio.value = model.id;
    radio.checked = model.id === state.model;
    radio.addEventListener("change", () => chooseModel(model.id));
    label.append(radio, document.createTextNode(` ${model.name}`));
    list.append(label);
  }
  select.value = state.model;
  agentSelect.value = state.model;
}

async function chooseModel(id) {
  state.model = id;
  $("model").value = id;
  $("agent-model").value = id;
  await fetch("/api/model", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

$("model").addEventListener("change", () => chooseModel($("model").value));
$("fill").addEventListener("click", async () => {
  setResult("", VIEW.running);
  const res = await fetch("/api/fill", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ brand: state.brandId, step: state.step, model: state.model }),
  });
  const body = await res.json();
  setResult(body.sentence, res.ok ? VIEW.saved : VIEW.refused);
  if (!res.ok) return;
  if (body.notesPath) {
    $("notes").value = body.notesPath;
    $("notes").dataset.touched = "1";
  }
  if (body.footage) $("footage").value = body.footage;
  if (body.seconds) $("seconds").value = String(body.seconds);
  if (body.backend) {
    $("backend").value = body.backend;
    $("backend").dataset.touched = "1";
  }
  if (body.resolution) $("size").value = body.resolution;
  if (body.script) {
    $("script").hidden = false;
    $("script").textContent = body.script;
  }
  if (body.saved) await load();
  else showFields();
});

/* ---------- Desk agent ---------- */

function agentLine(text, cls) {
  const p = document.createElement("p");
  p.className = cls;
  p.textContent = text;
  $("agent-log").append(p);
  $("agent-log").scrollTop = $("agent-log").scrollHeight;
}

function agentStatus(text, lamp) {
  $("agent-status").textContent = text;
  $("agent-lamp").dataset.lamp = lamp;
}

function renderAgentAccess() {
  const hasModels = state.models.length > 0;
  $("agent-nokey").hidden = hasModels;
  $("agent-form").hidden = !hasModels;
  $("agent-chips").hidden = !hasModels;
}

function setAgentOpen(open) {
  agent.open = open;
  $("agent").hidden = !open;
  $("agent-open").setAttribute("aria-expanded", open ? "true" : "false");
  if (open) $("agent-input").focus();
}

function agentScreen() {
  const step = STEPS.find((item) => item.id === state.step);
  const blanks = {};
  if (step?.fields.includes("notes")) blanks.notesPath = $("notes").value;
  if (step?.fields.includes("footage")) blanks.footage = $("footage").value;
  if (step?.fields.includes("price")) Object.assign(blanks, priceFields());
  return {
    step: state.step,
    blanks,
    lastSentence: $("sentence").textContent,
    lastExitCode: typeof state.last?.exitCode === "number" ? state.last.exitCode : null,
  };
}

function stepLabel(id) {
  return STEP_CATALOG.find((step) => step.id === id)?.label ?? id;
}

async function executeTool(call) {
  const args = call.args ?? {};
  if (call.name === "go_to_step") {
    if (!STEPS.some((step) => step.id === args.step)) return { text: `No step called ${args.step}.`, refused: true };
    state.step = args.step;
    showFields();
    render();
    return { text: `Opened ${stepLabel(args.step)}.` };
  }
  if (call.name === "fill_blanks") {
    const filled = [];
    if (typeof args.notesPath === "string") {
      $("notes").value = args.notesPath;
      $("notes").dataset.touched = "1";
      filled.push(`notes ${args.notesPath}`);
    }
    if (typeof args.footage === "string") {
      $("footage").value = args.footage;
      filled.push(`footage "${args.footage}"`);
    }
    if (typeof args.seconds === "number") {
      $("seconds").value = String(args.seconds);
      filled.push(`${args.seconds} seconds`);
    }
    if (typeof args.backend === "string") {
      $("backend").value = args.backend;
      $("backend").dataset.touched = "1";
      filled.push(`--backend ${args.backend}`);
    }
    if (typeof args.resolution === "string") {
      $("size").value = args.resolution;
      filled.push(`--resolution ${args.resolution}`);
    }
    showFields();
    if (!filled.length) return { text: "Nothing to fill.", refused: true };
    return { text: `Filled ${filled.join(", ")}.` };
  }
  if (call.name === "run_step") {
    if (!AGENT_RUNNABLE.includes(args.step)) {
      return { text: `Refused: ${stepLabel(args.step)} is a human key.`, refused: true };
    }
    state.step = args.step;
    showFields();
    render();
    const body = await run(args.step);
    if (!body) return { text: `${stepLabel(args.step)} did not run: ${$("sentence").textContent}`, refused: true };
    return { text: `Ran ${stepLabel(args.step)} (exit ${body.exitCode}): ${body.sentence}`, refused: body.exitCode !== 0 };
  }
  if (call.name === "read_state") {
    await load();
    const brand = state.snapshot?.brand;
    return { text: brand ? JSON.stringify(brand) : "No brand loaded.", quiet: true };
  }
  return { text: `Unknown tool ${call.name}.`, refused: true };
}

async function agentSend(text) {
  const ask = text.trim();
  if (!ask || agent.busy) return;
  if (!state.models.length) {
    renderAgentAccess();
    return;
  }
  agent.busy = true;
  $("agent").dataset.busy = "true";
  agentStatus("Working", "signal");
  agentLine(ask, "me");
  agent.messages.push({ role: "user", content: ask });
  try {
    for (let round = 0; round <= AGENT_ROUNDS; round += 1) {
      let res;
      try {
        res = await fetch("/api/agent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            brand: state.brandId,
            model: state.model,
            messages: agent.messages,
            screen: agentScreen(),
          }),
        });
      } catch {
        agentLine("The desk is not running on this computer.", "bot error");
        break;
      }
      const body = await res.json();
      if (!res.ok) {
        agentLine(body.sentence ?? "The agent did not answer.", "bot error");
        if (body.sentence === "Add an OpenRouter key on the Keys tab.") {
          state.models = [];
          renderAgentAccess();
        }
        break;
      }
      const calls = Array.isArray(body.toolCalls) ? body.toolCalls : [];
      if (body.content) agentLine(body.content, "bot");
      if (!calls.length) {
        agent.messages.push({ role: "assistant", content: body.content ?? "" });
        break;
      }
      if (round === AGENT_ROUNDS) {
        agentLine("Stopped after four actions. Ask again to continue.", "act refused");
        agent.messages.push({ role: "assistant", content: body.content ?? "" });
        break;
      }
      agent.messages.push({
        role: "assistant",
        content: body.content ?? "",
        tool_calls: calls.map((call) => ({
          id: call.id,
          type: "function",
          function: { name: call.name, arguments: JSON.stringify(call.args ?? {}) },
        })),
      });
      for (const call of calls) {
        const result = await executeTool(call);
        if (!result.quiet) agentLine(result.text, result.refused ? "act refused" : "act");
        agent.messages.push({ role: "tool", tool_call_id: call.id, content: result.text });
      }
    }
  } finally {
    agent.busy = false;
    $("agent").dataset.busy = "false";
    agentStatus("Ready", "off");
  }
}

$("agent-open").addEventListener("click", () => setAgentOpen(true));
$("agent-close").addEventListener("click", () => setAgentOpen(false));
$("agent-go-keys").addEventListener("click", () => {
  state.step = "keys";
  showFields();
  render();
});
$("agent-model").addEventListener("change", () => chooseModel($("agent-model").value));
$("agent-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const text = $("agent-input").value;
  $("agent-input").value = "";
  agentSend(text);
});
$("agent-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    $("agent-form").requestSubmit();
  }
});
for (const chip of document.querySelectorAll("#agent-chips [data-ask]")) {
  chip.addEventListener("click", () => agentSend(chip.dataset.ask));
}

for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", () => {
    const node = $(button.dataset.copy);
    if (node) copy(node.textContent);
  });
}

load().catch(() => {
  setResult("The desk is not running on this computer.", VIEW.offline);
});
