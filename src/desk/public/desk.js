import { fillInstruction } from "/instructions.js";

const STEPS = [
  { id: "set-up", label: "Set up", title: "Set up this brand", help: "Prepare the library on this computer.", button: "Set up this brand", fields: [] },
  { id: "add-notes", label: "Add notes", title: "Add the notes", help: "The winning-ad notes this work starts from.", button: "Add these notes", fields: ["notes"] },
  { id: "find-footage", label: "Find footage", title: "Find footage you already have", help: "Look through this brand’s library before making a new clip.", button: "Search the library", fields: ["footage"] },
  { id: "write-script", label: "Write the script", title: "Write the script", help: "A draft. It is not approved.", button: "Write the script", fields: [] },
  { id: "approve-script", label: "Approve the script", title: "Approve the script", help: "Only after you have read a script that passed the claims check.", button: "I read it. Approve.", fields: [] },
  { id: "check-price", label: "Check the price", title: "Check the price", help: "Nothing is charged.", button: "Check the price", fields: ["price"] },
  { id: "make-clip", label: "Make the clip", title: "Make the clip", help: "A practice clip. Confirmation is separate.", button: "Try it — it should stop", fields: ["price"] },
  { id: "rough-cut", label: "Build the rough cut", title: "Build the rough cut", help: "Files for the editor. The ad is not posted.", button: "Build the rough cut", fields: [] },
  { id: "spending", label: "See spending", title: "See spending", help: "What has been counted against the budget.", button: "See spending", fields: [] },
  { id: "practice", label: "Practice run", title: "Practice run", help: "The packaged path, in its own library.", button: "Run the practice job", fields: [], apart: true },
  { id: "keys", label: "Keys", title: "Keys and install", help: "Save API keys on this computer, and copy the official install commands.", button: "", fields: [], apart: true },
];

const state = { brandId: "aether-wellness", step: "find-footage", snapshot: null, last: null, priced: null, confirming: false, models: [], model: "" };

const $ = (id) => document.getElementById(id);

function dollars(n) {
  return `$${n.toFixed(2)}`;
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
  $("step-title").textContent = step.title;
  $("step-help").textContent = step.help;
  const keys = state.step === "keys";
  const canFill = state.models.length > 0 && !keys;
  $("form").hidden = keys;
  $("fill").hidden = !canFill;
  $("model-label").hidden = !canFill;
  $("keys").hidden = !keys;
  const make = state.step === "make-clip";
  $("run").hidden = make || keys;
  $("try-stop").hidden = !make;
  $("open-sheet").hidden = !make;
  $("copy").hidden = keys;
  $("toggle-terminal").hidden = keys;
  if (keys) $("terminal").hidden = true;
  if (!keys) $("run").textContent = step.button;
  $("instruction").textContent = keys
    ? "Install commands are on this tab. Copy does not run them."
    : fillInstruction(state.step, blanks());
  if (keys) loadKeys();
}

function render() {
  const brand = state.snapshot?.brand;
  if (!brand) return;
  $("brand-name").textContent = brand.name;
  $("product").textContent = brand.product;
  const spent = brand.budget.spentUsd;
  const bits = [`Budget ${dollars(brand.budget.capUsd)}`, `Spent ${dollars(spent)}`];
  bits.push(spent === 0 ? "Nothing spent yet" : `${brand.budget.usedPct.toFixed(1)}% of the budget`);
  $("budget").textContent = "";
  for (const text of bits) {
    const span = document.createElement("span");
    span.textContent = text;
    if (brand.budget.warn80 && text.includes("%")) span.className = "warn";
    $("budget").append(span);
  }
  if (brand.budget.warn80) {
    const span = document.createElement("span");
    span.className = "warn";
    span.textContent = "You have used 80% of the budget.";
    $("budget").append(span);
  }
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
  for (const step of STEPS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = step.label;
    button.setAttribute("aria-current", step.id === state.step ? "true" : "false");
    if (step.apart) button.className = "apart";
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
}

async function load() {
  const res = await fetch(`/api/state?brand=${encodeURIComponent(state.brandId)}`);
  if (!res.ok) {
    $("sentence").textContent = "That brand is not on this computer.";
    return;
  }
  state.snapshot = await res.json();
  await loadModels();
  render();
  showFields();
}

async function run(step, extra) {
  $("sentence").textContent = "";
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
    $("sentence").textContent = "The desk is not running on this computer.";
    return null;
  }
  const body = await res.json();
  if (res.status === 409) {
    $("sentence").textContent = body.sentence;
    return null;
  }
  state.last = body;
  $("sentence").textContent = body.sentence;
  $("terminal").textContent = `${body.stdout ?? ""}${body.stderr ?? ""}`;
  await load();
  return body;
}

$("run").addEventListener("click", () => run(state.step));
$("try-stop").addEventListener("click", () => run("make-clip", { confirm: false }));
$("copy").addEventListener("click", () => copy(fillInstruction(state.step, blanks({ confirm: false }))));
$("open-sheet").addEventListener("click", async () => {
  const priced = priceFields();
  const body = await run("check-price");
  const now = priceFields();
  if (priced.seconds !== now.seconds || priced.backend !== now.backend || priced.resolution !== now.resolution) {
    $("sentence").textContent = "The price is for different settings. Check the price again.";
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
    $("sentence").textContent = "The price is for different settings. Check the price again.";
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
    $("sentence").textContent = "The desk is not running on this computer.";
    return;
  }
  const body = await res.json();
  $("sentence").textContent = body.sentence;
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
  const form = $("keys-form");
  form.textContent = "";
  for (const key of body.keys) {
    const row = document.createElement("div");
    row.className = "key-row";
    const label = document.createElement("label");
    label.textContent = `${key.label} key`;
    const input = document.createElement("input");
    input.type = "password";
    input.autocomplete = "off";
    input.placeholder = key.set ? "Saved. Paste a new key to replace it." : "Paste the key";
    label.append(input);
    const status = document.createElement("p");
    status.className = "key-status";
    status.textContent = key.set ? "Saved on this computer." : "Not set.";
    label.append(status);
    const save = document.createElement("button");
    save.type = "button";
    save.textContent = "Save";
    save.addEventListener("click", () => storeKey(key.env, input.value));
    const clear = document.createElement("button");
    clear.type = "button";
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
  $("sentence").textContent = body.sentence;
  if (res.ok) {
    await loadKeys();
    await loadModels();
    showFields();
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
  const list = $("model-list");
  list.textContent = "";
  if (!state.models.length) return;
  const heading = document.createElement("h3");
  heading.textContent = "Models that can read text and pictures";
  list.append(heading);
  for (const model of state.models) {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = model.name;
    select.append(option);
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
}

async function chooseModel(id) {
  state.model = id;
  $("model").value = id;
  await fetch("/api/model", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

$("model").addEventListener("change", () => chooseModel($("model").value));
$("fill").addEventListener("click", async () => {
  $("sentence").textContent = "";
  const res = await fetch("/api/fill", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ brand: state.brandId, step: state.step, model: state.model }),
  });
  const body = await res.json();
  $("sentence").textContent = body.sentence;
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

for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", () => {
    const node = $(button.dataset.copy);
    if (node) copy(node.textContent);
  });
}

load().catch(() => {
  $("sentence").textContent = "The desk is not running on this computer.";
});
