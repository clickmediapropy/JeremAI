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
];

const state = { brandId: "aether-wellness", step: "find-footage", snapshot: null, last: null };

const $ = (id) => document.getElementById(id);

function dollars(n) {
  return `$${n.toFixed(2)}`;
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
  const make = state.step === "make-clip";
  $("run").hidden = make;
  $("try-stop").hidden = !make;
  $("open-sheet").hidden = !make;
  $("run").textContent = step.button;
  $("instruction").textContent = fillInstruction(state.step, blanks());
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
  const body = await run("check-price");
  if (!body) return;
  $("sheet-sentence").textContent = body.sentence;
  $("count-quote").checked = false;
  const blocked = body.sentence.includes("Making a clip will stop");
  $("sheet-confirm").hidden = blocked;
  $("sheet").showModal();
});
$("sheet-close").addEventListener("click", () => $("sheet").close());
$("sheet-confirm").addEventListener("click", async () => {
  await run("make-clip", { confirm: true, countQuote: $("count-quote").checked });
  $("sheet").close();
});
$("sheet-copy").addEventListener("click", () => {
  copy(fillInstruction("make-clip", blanks({ confirm: true, countQuote: $("count-quote").checked })));
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

load().catch(() => {
  $("sentence").textContent = "The desk is not running on this computer.";
});
