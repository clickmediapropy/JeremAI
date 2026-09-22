# Local desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve a local page at `127.0.0.1:4173` that runs every JeremAI step and copies a finished instruction for Jeremy’s terminal agent.

**Architecture:** `pnpm desk` starts a Node HTTP server on this computer. The page sends a step id. The server builds an argv, spawns the existing CLI, and returns a sentence. Copy fills a template in the browser and does not call the server. The CLI remains the only writer.

**Tech Stack:** Node 20+ (built-in `node:http`, `node:sqlite`), existing TypeScript CLI, one HTML page, one CSS file, two plain JS files. No new dependencies. No Vite.

**Spec:** `docs/superpowers/specs/2026-09-22-local-desk-design.md`

## File map

| File | Responsibility |
| --- | --- |
| `src/desk/public/instructions.js` | Fill a copy-paste instruction. No IO. Served at `/instructions.js`. |
| `src/desk/types.ts` | Step ids and the run body. |
| `src/desk/sentences.ts` | Headlines from exit codes, search rows, and estimates. |
| `src/desk/argv.ts` | Step id to CLI args. Rejects unknown steps and sneaked `--confirm`. |
| `src/desk/read-db.ts` | Open `jeremai.sqlite` read-only, or return null when the file is absent. |
| `src/desk/state.ts` | Brand list, budget, library counts, latest notes, script, and clip. |
| `src/desk/run.ts` | One run at a time. Spawn the CLI. Pick the headline. |
| `src/desk/server.ts` | Bind `127.0.0.1`, serve the page and two routes. |
| `src/desk/public/index.html` | The desk markup, including the words the checks look for. |
| `src/desk/public/desk.css` | Layout and the confirm sheet. |
| `src/desk/public/desk.js` | Render state, run a step, copy an instruction. |
| `tests/desk-instructions.test.ts` | Templates. |
| `tests/desk-sentences.test.ts` | Headlines, including the bathroom-scale clip. |
| `tests/desk-argv.test.ts` | Argv allowlist. |
| `tests/desk-state.test.ts` | Read-only snapshot. Does not create a database. |
| `tests/desk-run.test.ts` | Lock, rejected steps, headline selection. |
| `tests/desk-server.test.ts` | Bind address, unconfirmed clip, served words. |

Do not add a package dependency. Do not deploy. Do not call RunPod, fal, or MiniMax.

---

### Task 1: Instruction templates

**Files:**
- Create: `src/desk/public/instructions.js`
- Test: `tests/desk-instructions.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { fillInstruction } from "../src/desk/public/instructions.js";

const brand = { brand: "aether-wellness", brandName: "Aether Wellness" };

test("find-footage instruction keeps the footage words and the stop line", () => {
  const text = fillInstruction("find-footage", { ...brand, footage: "morning kitchen" });
  assert.match(text, /Aether Wellness \(aether-wellness\)/);
  assert.match(text, /Look for: morning kitchen/);
  assert.match(text, /pnpm jeremai search-broll --client aether-wellness --query "morning kitchen"/);
  assert.match(text, /Do not write a script, make a clip, or publish\./);
  assert.equal(text.includes("--confirm"), false);
  assert.equal(text.includes("--approve"), false);
});

test("write-script instruction does not approve", () => {
  const text = fillInstruction("write-script", brand);
  assert.match(text, /pnpm jeremai script --client aether-wellness/);
  assert.equal(text.includes("--approve"), false);
  assert.match(text, /Do not approve\./);
});

test("approve-script instruction says the person already read a passing script", () => {
  const text = fillInstruction("approve-script", brand);
  assert.match(text, /The person has already read a script that passed the claims check\./);
  assert.match(text, /pnpm jeremai script --client aether-wellness --approve/);
  assert.match(text, /Do not make a clip\./);
});

test("unconfirmed clip instruction has no confirm flag", () => {
  const text = fillInstruction("make-clip", {
    ...brand,
    seconds: 5,
    backend: "runpod-h3",
    resolution: "768P",
  });
  assert.match(text, /pnpm jeremai generate --client aether-wellness --seconds 5 --backend runpod-h3 --resolution 768P/);
  assert.equal(text.includes("--confirm"), false);
  assert.match(text, /Do not pass `--confirm`\./);
});

test("confirmed clip instruction is the only one with --confirm", () => {
  const text = fillInstruction("make-clip", {
    ...brand,
    seconds: 5,
    backend: "fal-ai",
    resolution: "2K",
    confirm: true,
    countQuote: true,
  });
  assert.match(text, /--confirm/);
  assert.match(text, /--simulate-spend/);
  assert.match(text, /--backend fal-ai --resolution 2K/);
  const plain = fillInstruction("make-clip", {
    ...brand,
    seconds: 5,
    backend: "fal-ai",
    resolution: "2K",
    confirm: true,
    countQuote: false,
  });
  assert.equal(plain.includes("--simulate-spend"), false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --no-warnings --import tsx --test tests/desk-instructions.test.ts`

Expected: FAIL. Node cannot find `../src/desk/public/instructions.js`.

- [ ] **Step 3: Write the templates**

Create `src/desk/public/instructions.js`:

```js
const PREFIX = (name, id) =>
  `You are working in the JeremAI repo for ${name} (${id}).\n` +
  `Use pnpm jeremai. Do not post an ad. Do not call RunPod, fal, or MiniMax. Clips in this build are practice clips.`;

function clipCommand(blanks, confirm) {
  const seconds = blanks.seconds ?? 5;
  const backend = blanks.backend ?? "runpod-h3";
  const resolution = blanks.resolution ?? "768P";
  let command =
    `pnpm jeremai generate --client ${blanks.brand} --seconds ${seconds} --backend ${backend} --resolution ${resolution}`;
  if (confirm) {
    command += " --confirm";
    if (blanks.countQuote) command += " --simulate-spend";
  }
  return command;
}

export function fillInstruction(step, blanks) {
  const name = blanks.brandName;
  const id = blanks.brand;
  const head = PREFIX(name, id);
  let body = "";
  if (step === "set-up") {
    body =
      `Run \`pnpm jeremai init --client ${id}\`.\n` +
      `Then stop. Do not search, write a script, or make a clip.`;
  } else if (step === "add-notes") {
    body =
      `Notes file: ${blanks.notesPath}.\n` +
      `Run \`pnpm jeremai brief --client ${id} --file "${blanks.notesPath}"\`.\n` +
      `Then stop. Do not write the script.`;
  } else if (step === "find-footage") {
    body =
      `Look for: ${blanks.footage}.\n` +
      `Run \`pnpm jeremai search-broll --client ${id} --query "${blanks.footage}"\`.\n` +
      `Tell me which clips are fine for an ad and which were held back.\n` +
      `Then stop. Do not write a script, make a clip, or publish.`;
  } else if (step === "write-script") {
    body =
      `Run \`pnpm jeremai script --client ${id}\`.\n` +
      `Show the script and whether the claims check passed.\n` +
      `Then stop. Do not approve. Do not make a clip.`;
  } else if (step === "approve-script") {
    body =
      `The person has already read a script that passed the claims check.\n` +
      `Run \`pnpm jeremai script --client ${id} --approve\`.\n` +
      `Then stop. Do not make a clip.`;
  } else if (step === "check-price") {
    const seconds = blanks.seconds ?? 5;
    const backend = blanks.backend ?? "runpod-h3";
    const resolution = blanks.resolution ?? "768P";
    body =
      `Run \`pnpm jeremai estimate --client ${id} --seconds ${seconds} --backend ${backend} --resolution ${resolution}\`.\n` +
      `Show the price and what is left of the budget.\n` +
      `Then stop. Do not make a clip.`;
  } else if (step === "make-clip" && blanks.confirm) {
    body =
      `Run \`${clipCommand(blanks, true)}\`.\n` +
      `Say that a practice clip records $0 unless the quote was counted.\n` +
      `Do not publish.`;
  } else if (step === "make-clip") {
    body =
      `Run \`${clipCommand(blanks, false)}\` with no confirm flag.\n` +
      `It should stop. Report that stop. Do not pass \`--confirm\`. Do not publish.`;
  } else if (step === "rough-cut") {
    body =
      `Run \`pnpm jeremai assemble --client ${id}\`.\n` +
      `Hand the editor the rough cut. Do not post the ad.`;
  } else if (step === "spending") {
    body =
      `Run \`pnpm jeremai cost --client ${id}\`.\n` +
      `Report what has been spent against the budget. Do not make a clip or post.`;
  } else if (step === "practice") {
    body =
      `Run \`pnpm jeremai demo --client ${id}\`.\n` +
      `A clip request without confirmation stops on purpose, then practice clips are made.\n` +
      `Do not post.`;
  } else {
    throw new Error(`Unknown step: ${step}`);
  }
  return `${head}\n\n${body}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --no-warnings --import tsx --test tests/desk-instructions.test.ts`

Expected: PASS. 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/desk/public/instructions.js tests/desk-instructions.test.ts
git commit -m "Add desk instruction templates."
```

---

### Task 2: Headlines

**Files:**
- Create: `src/desk/types.ts`
- Create: `src/desk/sentences.ts`
- Test: `tests/desk-sentences.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildEstimate } from "../src/lib/budget.ts";
import { loadClient } from "../src/lib/config.ts";
import { listAssets, openDb } from "../src/lib/db.ts";
import { seedClientLibrary } from "../src/lib/seed.ts";
import { footageSentence, priceSentence, stopSentence, successSentence } from "../src/desk/sentences.ts";

test("stop headlines match the exit codes", () => {
  assert.equal(
    stopSentence(2),
    "Stopped on purpose. Making a clip needs a confirmation. Nothing was spent.",
  );
  assert.equal(stopSentence(3), "Stopped. This would pass the brand’s budget.");
  assert.equal(
    stopSentence(4),
    "Stopped. The script is not approved, or it says something this brand is not allowed to say.",
  );
  assert.equal(stopSentence(5), "Stopped. Add the notes, write the script, or make the clip first.");
  assert.equal(stopSentence(1), "Stopped. Something on this step is not valid.");
  assert.equal(stopSentence(0), null);
});

test("bathroom scale is held back only when the footage words match it", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-sentence-"));
  const { db } = openDb(dataDir);
  seedClientLibrary(db, "aether-wellness");
  const assets = listAssets(db, "aether-wellness");
  const scale = footageSentence(assets, "bathroom scale");
  assert.match(scale, /Bathroom scale before\/after wall/);
  const morning = footageSentence(assets, "morning kitchen");
  assert.equal(morning.includes("Bathroom scale"), false);
  assert.match(morning, /clips are fine to use in an ad/);
});

test("empty library and a price quote", () => {
  assert.equal(footageSentence([], "morning kitchen"), "The library is empty. Set up this brand first.");
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-price-"));
  const { db } = openDb(dataDir);
  const client = loadClient("aether-wellness");
  const estimate = buildEstimate(db, client, { seconds: 5, backend: "runpod-h3", resolution: "768P" });
  assert.equal(
    priceSentence(estimate),
    "About $0.2040 for 5 seconds. $0.0000 of $25.0000 is spent. Nothing was charged.",
  );
});

test("success headlines for the steps that do not search", () => {
  assert.equal(
    successSentence("set-up", { brandName: "Aether Wellness" }),
    "The library for Aether Wellness is ready.",
  );
  assert.equal(successSentence("add-notes", { brandName: "Aether Wellness" }), "Notes added.");
  assert.equal(
    successSentence("make-clip", { brandName: "Aether Wellness", countQuote: false }),
    "Practice clip is ready. $0 was spent.",
  );
  assert.equal(
    successSentence("make-clip", { brandName: "Aether Wellness", countQuote: true }),
    "Practice clip is ready. The quote was counted against the budget.",
  );
  assert.equal(
    successSentence("rough-cut", { brandName: "Aether Wellness" }),
    "Rough cut is ready for the editor. The ad was not posted.",
  );
  assert.equal(
    successSentence("spending", { brandName: "Aether Wellness", spentUsd: 0, capUsd: 25 }),
    "Spent $0.0000 of $25.0000.",
  );
  assert.equal(
    successSentence("practice", { brandName: "Aether Wellness" }),
    "Practice run finished. A clip request without confirmation stopped on purpose, then practice clips were made. Nothing was posted.",
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --no-warnings --import tsx --test tests/desk-sentences.test.ts`

Expected: FAIL. Node cannot find `../src/desk/sentences.ts`.

- [ ] **Step 3: Write the types and headlines**

Create `src/desk/types.ts`:

```ts
export const STEPS = [
  "set-up",
  "add-notes",
  "find-footage",
  "write-script",
  "approve-script",
  "check-price",
  "make-clip",
  "rough-cut",
  "spending",
  "practice",
] as const;

export type StepId = (typeof STEPS)[number];

export interface RunBody {
  step: string;
  brand: string;
  notesPath?: string;
  footage?: string;
  seconds?: number;
  backend?: string;
  resolution?: "768P" | "2K";
  confirm?: boolean;
  countQuote?: boolean;
}

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  sentence: string;
}
```

Create `src/desk/sentences.ts`:

```ts
import { money } from "../lib/print.ts";
import { searchBroll } from "../lib/search.ts";
import type { AssetRecord, CostEstimate } from "../types.ts";
import type { StepId } from "./types.ts";

export function stopSentence(exitCode: number): string | null {
  if (exitCode === 2) return "Stopped on purpose. Making a clip needs a confirmation. Nothing was spent.";
  if (exitCode === 3) return "Stopped. This would pass the brand’s budget.";
  if (exitCode === 4) {
    return "Stopped. The script is not approved, or it says something this brand is not allowed to say.";
  }
  if (exitCode === 5) return "Stopped. Add the notes, write the script, or make the clip first.";
  if (exitCode === 1) return "Stopped. Something on this step is not valid.";
  return null;
}

export function footageSentence(assets: AssetRecord[], query: string): string {
  if (assets.length === 0) return "The library is empty. Set up this brand first.";
  const ranked = searchBroll(assets, query).slice(0, 8);
  if (ranked.length === 0) {
    return "Nothing safe to use matched. You can still check the price before making a clip.";
  }
  const fine = ranked.filter((hit) => hit.asset.claimSafe);
  const held = ranked.filter((hit) => !hit.asset.claimSafe);
  const heldText =
    held.length === 0 ? "0 were held back." : `${held.length} were held back: ${held.map((hit) => hit.asset.title).join(", ")}.`;
  return `${fine.length} clips are fine to use in an ad. ${heldText}`;
}

export function priceSentence(estimate: CostEstimate): string {
  const parts = [
    `About ${money(estimate.estimatedCostUsd)} for ${estimate.seconds} seconds. ${money(estimate.usedUsd)} of ${money(estimate.capUsd)} is spent. Nothing was charged.`,
  ];
  if (estimate.warn80) parts.push("You have used 80% of the budget.");
  if (estimate.hardStop || estimate.wouldExceedCap) {
    parts.push("Making a clip will stop, because this would pass the budget.");
  }
  return parts.join(" ");
}

export function successSentence(
  step: StepId,
  ctx: {
    brandName: string;
    footage?: string;
    assets?: AssetRecord[];
    estimate?: CostEstimate;
    countQuote?: boolean;
    spentUsd?: number;
    capUsd?: number;
  },
): string {
  if (step === "set-up") return `The library for ${ctx.brandName} is ready.`;
  if (step === "add-notes") return "Notes added.";
  if (step === "find-footage") return footageSentence(ctx.assets ?? [], ctx.footage ?? "");
  if (step === "write-script") return "The script is written. The claims check passed. It is not approved yet.";
  if (step === "approve-script") return "Approved. Making a clip still needs a confirmation.";
  if (step === "check-price") {
    if (!ctx.estimate) return "Stopped. Something on this step is not valid.";
    return priceSentence(ctx.estimate);
  }
  if (step === "make-clip") {
    return ctx.countQuote
      ? "Practice clip is ready. The quote was counted against the budget."
      : "Practice clip is ready. $0 was spent.";
  }
  if (step === "rough-cut") return "Rough cut is ready for the editor. The ad was not posted.";
  if (step === "spending") return `Spent ${money(ctx.spentUsd ?? 0)} of ${money(ctx.capUsd ?? 0)}.`;
  return "Practice run finished. A clip request without confirmation stopped on purpose, then practice clips were made. Nothing was posted.";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --no-warnings --import tsx --test tests/desk-sentences.test.ts`

Expected: PASS. 4 tests. The fresh RunPod quote is `0.17 * 1.2 = 0.204`, printed by `money()` as `$0.2040`.

- [ ] **Step 5: Commit**

```bash
git add src/desk/types.ts src/desk/sentences.ts tests/desk-sentences.test.ts
git commit -m "Add desk headlines for stops, footage, and price."
```

---

### Task 3: Argv builder

**Files:**
- Create: `src/desk/argv.ts`
- Test: `tests/desk-argv.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildArgs } from "../src/desk/argv.ts";

test("make-clip adds --confirm only when the sheet confirmed", () => {
  const stopped = buildArgs({
    step: "make-clip",
    brand: "aether-wellness",
    seconds: 5,
    backend: "runpod-h3",
    resolution: "768P",
  });
  assert.equal(stopped.ok, true);
  if (!stopped.ok) return;
  assert.deepEqual(stopped.args, [
    "generate",
    "--client",
    "aether-wellness",
    "--seconds",
    "5",
    "--backend",
    "runpod-h3",
    "--resolution",
    "768P",
  ]);
  assert.equal(stopped.args.includes("--confirm"), false);
  assert.equal(stopped.passDataDir, true);

  const confirmed = buildArgs({
    step: "make-clip",
    brand: "aether-wellness",
    seconds: 5,
    backend: "runpod-h3",
    resolution: "768P",
    confirm: true,
    countQuote: true,
  });
  assert.equal(confirmed.ok, true);
  if (!confirmed.ok) return;
  assert.equal(confirmed.args.includes("--confirm"), true);
  assert.equal(confirmed.args.includes("--simulate-spend"), true);
});

test("confirm on any other step is rejected", () => {
  const sneaked = buildArgs({ step: "write-script", brand: "aether-wellness", confirm: true });
  assert.equal(sneaked.ok, false);
  if (sneaked.ok) return;
  assert.equal(sneaked.sentence, "Stopped. Something on this step is not valid.");
});

test("unknown steps and practice", () => {
  const unknown = buildArgs({ step: "publish", brand: "aether-wellness" });
  assert.equal(unknown.ok, false);
  const practice = buildArgs({ step: "practice", brand: "aether-wellness" });
  assert.equal(practice.ok, true);
  if (!practice.ok) return;
  assert.deepEqual(practice.args, ["demo", "--client", "aether-wellness"]);
  assert.equal(practice.passDataDir, false);
});

test("the other steps map to the CLI", () => {
  const notes = buildArgs({
    step: "add-notes",
    brand: "aether-wellness",
    notesPath: "fixtures/briefs/aether-morning.md",
  });
  assert.equal(notes.ok, true);
  if (!notes.ok) return;
  assert.deepEqual(notes.args, [
    "brief",
    "--client",
    "aether-wellness",
    "--file",
    "fixtures/briefs/aether-morning.md",
  ]);
  const footage = buildArgs({ step: "find-footage", brand: "aether-wellness", footage: "morning kitchen" });
  assert.equal(footage.ok, true);
  if (!footage.ok) return;
  assert.deepEqual(footage.args.at(-1), "morning kitchen");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --no-warnings --import tsx --test tests/desk-argv.test.ts`

Expected: FAIL. Node cannot find `../src/desk/argv.ts`.

- [ ] **Step 3: Write the builder**

Create `src/desk/argv.ts`:

```ts
import { STEPS, type RunBody, type StepId } from "./types.ts";

export type ArgvResult =
  | { ok: true; args: string[]; passDataDir: boolean }
  | { ok: false; sentence: string };

const INVALID = "Stopped. Something on this step is not valid.";
const BACKENDS = new Set(["runpod-h3", "fal-ai", "minimax-h3-api"]);

function isStep(step: string): step is StepId {
  return (STEPS as readonly string[]).includes(step);
}

export function buildArgs(body: RunBody): ArgvResult {
  if (!body.brand || !isStep(body.step)) return { ok: false, sentence: INVALID };
  if (body.confirm && body.step !== "make-clip") return { ok: false, sentence: INVALID };
  if (body.countQuote && !(body.step === "make-clip" && body.confirm)) return { ok: false, sentence: INVALID };

  const client = ["--client", body.brand];
  if (body.step === "set-up") return { ok: true, args: ["init", ...client], passDataDir: true };
  if (body.step === "add-notes") {
    if (!body.notesPath) return { ok: false, sentence: INVALID };
    return { ok: true, args: ["brief", ...client, "--file", body.notesPath], passDataDir: true };
  }
  if (body.step === "find-footage") {
    if (!body.footage) return { ok: false, sentence: INVALID };
    return { ok: true, args: ["search-broll", ...client, "--query", body.footage], passDataDir: true };
  }
  if (body.step === "write-script") return { ok: true, args: ["script", ...client], passDataDir: true };
  if (body.step === "approve-script") return { ok: true, args: ["script", ...client, "--approve"], passDataDir: true };
  if (body.step === "rough-cut") return { ok: true, args: ["assemble", ...client], passDataDir: true };
  if (body.step === "spending") return { ok: true, args: ["cost", ...client], passDataDir: true };
  if (body.step === "practice") return { ok: true, args: ["demo", ...client], passDataDir: false };

  const seconds = body.seconds ?? 5;
  const resolution = body.resolution ?? "768P";
  const backend = body.backend ?? "runpod-h3";
  if (!Number.isFinite(seconds) || seconds <= 0) return { ok: false, sentence: INVALID };
  if (resolution !== "768P" && resolution !== "2K") return { ok: false, sentence: INVALID };
  if (!BACKENDS.has(backend)) return { ok: false, sentence: INVALID };
  const shared = [
    ...client,
    "--seconds",
    String(seconds),
    "--backend",
    backend,
    "--resolution",
    resolution,
  ];
  if (body.step === "check-price") return { ok: true, args: ["estimate", ...shared], passDataDir: true };
  const args = ["generate", ...shared];
  if (body.confirm) args.push("--confirm");
  if (body.confirm && body.countQuote) args.push("--simulate-spend");
  return { ok: true, args, passDataDir: true };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --no-warnings --import tsx --test tests/desk-argv.test.ts`

Expected: PASS. 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/desk/argv.ts tests/desk-argv.test.ts
git commit -m "Add the desk command allowlist."
```

---

### Task 4: State reader

**Files:**
- Create: `src/desk/read-db.ts`
- Create: `src/desk/state.ts`
- Test: `tests/desk-state.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { cmdBrief } from "../src/commands/brief.ts";
import { findProjectRoot } from "../src/lib/paths.ts";
import { readState } from "../src/desk/state.ts";

test("a missing library is empty and no sqlite file is created", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-state-"));
  const state = readState("aether-wellness", dataDir);
  assert.equal(existsSync(join(dataDir, "jeremai.sqlite")), false);
  assert.equal(state.brand?.name, "Aether Wellness");
  assert.equal(state.brand?.product, "Aether Daily Mineral");
  assert.equal(state.brand?.budget.capUsd, 25);
  assert.equal(state.brand?.budget.spentUsd, 0);
  assert.equal(state.brand?.budget.warn80, false);
  assert.equal(state.brand?.notes, null);
  assert.equal(state.brand?.library.fine, 0);
  assert.equal(state.brand?.library.heldBack, 0);
  assert.equal(state.brand?.notesPrefill, "fixtures/briefs/aether-morning.md");
});

test("after notes are added, the snapshot counts the seeded library", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-state-seed-"));
  const brief = join(findProjectRoot(), "fixtures", "briefs", "aether-morning.md");
  assert.equal(cmdBrief({ client: "aether-wellness", file: brief, dataDir }), 0);
  const state = readState("aether-wellness", dataDir);
  assert.equal(state.brand?.notes?.title.length ? true : false, true);
  assert.equal(state.brand?.library.fine, 4);
  assert.equal(state.brand?.library.heldBack, 1);
  assert.ok(state.brands.some((brand) => brand.name === "Aether Wellness"));
});

test("an unknown brand has no brand block", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-state-miss-"));
  const state = readState("not-a-brand", dataDir);
  assert.equal(state.brand, null);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --no-warnings --import tsx --test tests/desk-state.test.ts`

Expected: FAIL. Node cannot find `../src/desk/state.ts`.

- [ ] **Step 3: Write the reader**

Create `src/desk/read-db.ts`:

```ts
import { existsSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export function openReadOnly(dataDir: string): DatabaseSync | null {
  const file = join(dataDir, "jeremai.sqlite");
  if (!existsSync(file)) return null;
  return new DatabaseSync(file, { readOnly: true });
}
```

Create `src/desk/state.ts`:

```ts
import { existsSync } from "node:fs";
import { join } from "node:path";
import { billedUsd } from "../lib/budget.ts";
import { listClients, loadClient } from "../lib/config.ts";
import { latestBrief, latestJob, latestScript, listAssets } from "../lib/db.ts";
import { findProjectRoot } from "../lib/paths.ts";
import { openReadOnly } from "./read-db.ts";

export interface DeskState {
  brands: { id: string; name: string; product: string; preferredBackend: string }[];
  brand: {
    id: string;
    name: string;
    product: string;
    preferredBackend: string;
    budget: {
      capUsd: number;
      spentUsd: number;
      remainingUsd: number;
      usedPct: number;
      warn80: boolean;
      hardStop: boolean;
    };
    notes: { title: string } | null;
    notesPrefill: string | null;
    library: { fine: number; heldBack: number };
    script: { id: string; lintPass: boolean; approved: boolean; body: string } | null;
    clip: { id: string; quotedUsd: number; spentUsd: number; dryRun: boolean } | null;
  } | null;
}

export function readState(brandId: string, dataDir: string): DeskState {
  const brands = listClients().map((id) => {
    const client = loadClient(id);
    return { id, name: client.name, product: client.product, preferredBackend: client.preferredBackend };
  });
  const known = brands.find((brand) => brand.id === brandId);
  if (!known) return { brands, brand: null };
  const client = loadClient(brandId);
  const prefillPath = join(findProjectRoot(), "fixtures", "briefs", "aether-morning.md");
  const notesPrefill = existsSync(prefillPath) ? "fixtures/briefs/aether-morning.md" : null;
  const db = openReadOnly(dataDir);
  const spentUsd = db ? billedUsd(db, brandId) : 0;
  const assets = db ? listAssets(db, brandId) : [];
  const notes = db ? latestBrief(db, brandId) : null;
  const script = db ? latestScript(db, brandId) : null;
  const clip = db ? latestJob(db, brandId) : null;
  db?.close();
  const capUsd = client.budgetCapUsd;
  const usedPct = capUsd <= 0 ? 100 : (spentUsd / capUsd) * 100;
  return {
    brands,
    brand: {
      id: client.id,
      name: client.name,
      product: client.product,
      preferredBackend: client.preferredBackend,
      budget: {
        capUsd,
        spentUsd,
        remainingUsd: capUsd - spentUsd,
        usedPct,
        warn80: usedPct >= 80,
        hardStop: spentUsd >= capUsd - 1e-9,
      },
      notes: notes ? { title: notes.title } : null,
      notesPrefill,
      library: {
        fine: assets.filter((asset) => asset.claimSafe).length,
        heldBack: assets.filter((asset) => !asset.claimSafe).length,
      },
      script: script
        ? { id: script.id, lintPass: script.lintOk, approved: script.approved, body: script.body }
        : null,
      clip: clip
        ? { id: clip.id, quotedUsd: clip.estimatedCostUsd, spentUsd: clip.actualCostUsd, dryRun: clip.dryRun }
        : null,
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --no-warnings --import tsx --test tests/desk-state.test.ts`

Expected: PASS. 3 tests. The first test leaves no `jeremai.sqlite` in the temp directory.

- [ ] **Step 5: Commit**

```bash
git add src/desk/read-db.ts src/desk/state.ts tests/desk-state.test.ts
git commit -m "Add the read-only desk snapshot."
```

---

### Task 5: Runner

**Files:**
- Create: `src/desk/run.ts`
- Test: `tests/desk-run.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createRunner, type SpawnFn } from "../src/desk/run.ts";

function hold(): { spawn: SpawnFn; release: () => void } {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const spawn: SpawnFn = async () => {
    await gate;
    return { code: 0, stdout: "", stderr: "" };
  };
  return { spawn, release };
}

test("a second run does not start while the first is still going", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-run-"));
  const runner = createRunner();
  const held = hold();
  const first = runner.runStep(
    { step: "spending", brand: "aether-wellness" },
    { dataDir, spawn: held.spawn },
  );
  const second = await runner.runStep(
    { step: "spending", brand: "aether-wellness" },
    { dataDir, spawn: held.spawn },
  );
  assert.equal("busy" in second && second.busy, true);
  if ("busy" in second) assert.equal(second.sentence, "Still working on the last step.");
  held.release();
  const done = await first;
  assert.equal("exitCode" in done, true);
});

test("an unknown step never spawns", async () => {
  let calls = 0;
  const spawn: SpawnFn = async () => {
    calls += 1;
    return { code: 0, stdout: "", stderr: "" };
  };
  const result = await createRunner().runStep(
    { step: "publish", brand: "aether-wellness" },
    { dataDir: mkdtempSync(join(tmpdir(), "jeremai-run-nope-")), spawn },
  );
  assert.equal(calls, 0);
  assert.equal("exitCode" in result && result.exitCode, 1);
  if ("exitCode" in result) assert.equal(result.sentence, "Stopped. Something on this step is not valid.");
});

test("exit 2 keeps the stop headline and does not send --confirm", async () => {
  let args: string[] = [];
  const spawn: SpawnFn = async (argv) => {
    args = argv;
    return { code: 2, stdout: "", stderr: "refused" };
  };
  const result = await createRunner().runStep(
    {
      step: "make-clip",
      brand: "aether-wellness",
      seconds: 5,
      backend: "runpod-h3",
      resolution: "768P",
    },
    { dataDir: mkdtempSync(join(tmpdir(), "jeremai-run-stop-")), spawn },
  );
  assert.equal(args.includes("--confirm"), false);
  if ("exitCode" in result) {
    assert.equal(result.exitCode, 2);
    assert.equal(result.sentence, "Stopped on purpose. Making a clip needs a confirmation. Nothing was spent.");
    assert.equal(result.stderr, "refused");
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --no-warnings --import tsx --test tests/desk-run.test.ts`

Expected: FAIL. Node cannot find `../src/desk/run.ts`.

- [ ] **Step 3: Write the runner**

Create `src/desk/run.ts`:

```ts
import { spawn } from "node:child_process";
import { join } from "node:path";
import { buildEstimate, billedUsd } from "../lib/budget.ts";
import { loadClient } from "../lib/config.ts";
import { listAssets } from "../lib/db.ts";
import { findProjectRoot } from "../lib/paths.ts";
import { buildArgs } from "./argv.ts";
import { openReadOnly } from "./read-db.ts";
import { stopSentence, successSentence } from "./sentences.ts";
import { STEPS, type RunBody, type RunResult, type StepId } from "./types.ts";

export interface SpawnResult {
  code: number;
  stdout: string;
  stderr: string;
}

export type SpawnFn = (args: string[], dataDir: string | undefined) => Promise<SpawnResult>;

export function createSpawn(): SpawnFn {
  const cli = join(findProjectRoot(), "src/cli.ts");
  return (args, dataDir) =>
    new Promise((resolve) => {
      const full = dataDir ? [...args, "--data-dir", dataDir] : args;
      const child = spawn(process.execPath, ["--no-warnings", "--import", "tsx", cli, ...full], {
        cwd: findProjectRoot(),
      });
      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    });
}

function isStep(step: string): step is StepId {
  return (STEPS as readonly string[]).includes(step);
}

export function createRunner(): {
  runStep: (body: RunBody, opts: { dataDir: string; spawn?: SpawnFn }) => Promise<RunResult | { busy: true; sentence: string }>;
} {
  let inFlight = false;
  return {
    async runStep(body, opts) {
  if (inFlight) return { busy: true, sentence: "Still working on the last step." };
  const built = buildArgs(body);
  if (!built.ok) return { exitCode: 1, stdout: "", stderr: "", sentence: built.sentence };
  let brandName = body.brand;
  try {
    brandName = loadClient(body.brand).name;
  } catch {
    return { exitCode: 1, stdout: "", stderr: "", sentence: "That brand is not on this computer." };
  }
  inFlight = true;
  try {
    const spawnFn = opts.spawn ?? createSpawn();
    const dataDir = built.passDataDir ? opts.dataDir : undefined;
    const result = await spawnFn(built.args, dataDir);
    if (result.code !== 0) {
      return {
        exitCode: result.code,
        stdout: result.stdout,
        stderr: result.stderr,
        sentence: stopSentence(result.code) ?? "Stopped. Something on this step is not valid.",
      };
    }
    const step = body.step as StepId;
    const db = isStep(step) && built.passDataDir ? openReadOnly(opts.dataDir) : null;
    const client = loadClient(body.brand);
    const estimate =
      step === "check-price" && db
        ? buildEstimate(db, client, {
            seconds: body.seconds ?? 5,
            backend: body.backend ?? client.preferredBackend,
            resolution: body.resolution ?? "768P",
          })
        : undefined;
    const assets = step === "find-footage" && db ? listAssets(db, body.brand) : undefined;
    const spentUsd = db ? billedUsd(db, body.brand) : 0;
    db?.close();
    return {
      exitCode: 0,
      stdout: result.stdout,
      stderr: result.stderr,
      sentence: successSentence(step, {
        brandName,
        footage: body.footage,
        assets,
        estimate,
        countQuote: body.countQuote,
        spentUsd,
        capUsd: client.budgetCapUsd,
      }),
    };
  } finally {
    inFlight = false;
  }
    },
  };
}
```

Each `createRunner()` has its own lock. Tests that share a runner see the busy sentence. Two desks do not share a lock.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --no-warnings --import tsx --test tests/desk-run.test.ts`

Expected: PASS. 3 tests. The second call returns the busy sentence before `release()` runs.

- [ ] **Step 5: Commit**

```bash
git add src/desk/run.ts tests/desk-run.test.ts
git commit -m "Add the desk runner and its one-at-a-time lock."
```

---

### Task 6: HTTP server

**Files:**
- Create: `src/desk/server.ts`
- Modify: `package.json` scripts
- Test: `tests/desk-server.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { startDesk } from "../src/desk/server.ts";

test("the desk binds this computer and an unconfirmed clip stops", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-desk-"));
  const desk = await startDesk({ port: 0, dataDir });
  assert.equal(desk.host, "127.0.0.1");
  try {
    const stopped = await fetch(`http://127.0.0.1:${desk.port}/api/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        step: "make-clip",
        brand: "aether-wellness",
        seconds: 5,
        backend: "runpod-h3",
        resolution: "768P",
      }),
    });
    const body = (await stopped.json()) as { exitCode: number; sentence: string };
    assert.equal(stopped.status, 200);
    assert.equal(body.exitCode, 2);
    assert.equal(body.sentence, "Stopped on purpose. Making a clip needs a confirmation. Nothing was spent.");

    let calls = 0;
    const guarded = await startDesk({
      port: 0,
      dataDir,
      spawn: async () => {
        calls += 1;
        return { code: 0, stdout: "", stderr: "" };
      },
    });
    try {
      const rejected = await fetch(`http://127.0.0.1:${guarded.port}/api/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step: "publish", brand: "aether-wellness" }),
      });
      const rejectedBody = (await rejected.json()) as { sentence: string };
      assert.equal(rejected.status, 400);
      assert.equal(rejectedBody.sentence, "Stopped. Something on this step is not valid.");
      assert.equal(calls, 0);
    } finally {
      await guarded.close();
    }

    const state = await fetch(`http://127.0.0.1:${desk.port}/api/state?brand=aether-wellness`);
    const snapshot = (await state.json()) as { brand: { name: string } };
    assert.equal(state.status, 200);
    assert.equal(snapshot.brand.name, "Aether Wellness");

    const missing = await fetch(`http://127.0.0.1:${desk.port}/api/state?brand=not-a-brand`);
    const missingBody = (await missing.json()) as { sentence: string };
    assert.equal(missing.status, 404);
    assert.equal(missingBody.sentence, "That brand is not on this computer.");
  } finally {
    await desk.close();
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --no-warnings --import tsx --test tests/desk-server.test.ts`

Expected: FAIL. Node cannot find `../src/desk/server.ts`.

- [ ] **Step 3: Write the server and the package script**

Create `src/desk/server.ts`:

```ts
import { createReadStream } from "node:fs";
import { createServer, type Server } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRunner, type SpawnFn } from "./run.ts";
import { readState } from "./state.ts";
import type { RunBody } from "./types.ts";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "public");
const FILES: Record<string, { file: string; type: string }> = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/index.html": { file: "index.html", type: "text/html; charset=utf-8" },
  "/desk.css": { file: "desk.css", type: "text/css; charset=utf-8" },
  "/desk.js": { file: "desk.js", type: "text/javascript; charset=utf-8" },
  "/instructions.js": { file: "instructions.js", type: "text/javascript; charset=utf-8" },
};

export interface DeskHandle {
  port: number;
  host: string;
  close: () => Promise<void>;
}

export function startDesk(opts: { port?: number; dataDir: string; spawn?: SpawnFn }): Promise<DeskHandle> {
  const host = "127.0.0.1";
  const runner = createRunner();
  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/api/state") {
      const brand = url.searchParams.get("brand") ?? "";
      const state = readState(brand, opts.dataDir);
      if (!state.brand) {
        res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ sentence: "That brand is not on this computer." }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(state));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/run") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      let body: RunBody;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as RunBody;
      } catch {
        res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ sentence: "Stopped. Something on this step is not valid." }));
        return;
      }
      const result = await runner.runStep(body, { dataDir: opts.dataDir, spawn: opts.spawn });
      if ("busy" in result) {
        res.writeHead(409, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ sentence: result.sentence }));
        return;
      }
      const status = result.exitCode === 1 && result.stdout === "" && result.stderr === "" ? 400 : 200;
      res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(result));
      return;
    }
    const file = FILES[url.pathname];
    if (req.method === "GET" && file) {
      res.writeHead(200, { "content-type": file.type });
      createReadStream(join(publicDir, file.file)).pipe(res);
      return;
    }
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(opts.port ?? 0, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        port,
        host,
        close: () => new Promise((done, fail) => server.close((err) => (err ? fail(err) : done()))),
      });
    });
  });
}

const entry = process.argv[1];
if (entry && fileURLToPath(import.meta.url) === entry) {
  const { resolveDataDir } = await import("../lib/paths.ts");
  startDesk({ port: 4173, dataDir: resolveDataDir(undefined) })
    .then((desk) => {
      console.log(`Desk at http://${desk.host}:${desk.port}`);
    })
    .catch((err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error("The desk is not running on this computer.");
        process.exit(1);
      }
      throw err;
    });
}
```

`resolveDataDir` creates `.data` the first time the desk starts. That directory is the CLI’s own directory. The state reader still does not create `jeremai.sqlite`. Top-level `await` is allowed because `package.json` has `"type": "module"`.

In `package.json`, add this script next to `"demo"`:

```json
"desk": "node --no-warnings --import tsx src/desk/server.ts"
```

Create an empty `src/desk/public/index.html` with the single line `<!doctype html><title>JeremAI</title>` so a missing file does not crash this task’s server. Task 7 replaces it.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --no-warnings --import tsx --test tests/desk-server.test.ts`

Expected: PASS. The unconfirmed `generate` child exits 2. `publish` does not call the injected spawn.

- [ ] **Step 5: Commit**

```bash
git add src/desk/server.ts src/desk/public/index.html package.json tests/desk-server.test.ts
git commit -m "Serve the local desk on this computer."
```

---

### Task 7: The page

**Files:**
- Create: `src/desk/public/desk.css`
- Create: `src/desk/public/desk.js`
- Modify: `src/desk/public/index.html`
- Modify: `tests/desk-server.test.ts` (add one assertion; do not duplicate the server)

- [ ] **Step 1: Write the failing assertion**

Add this inside the existing server test, before `desk.close()`:

```ts
const page = await fetch(`http://127.0.0.1:${desk.port}/`);
const html = await page.text();
assert.equal(page.status, 200);
assert.match(html, /Aether Wellness/);
assert.match(html, /What footage do you need\?/);
assert.doesNotMatch(html, /<label[^>]*>\s*Client/);
assert.doesNotMatch(html, /<label[^>]*>\s*Query/);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --no-warnings --import tsx --test tests/desk-server.test.ts`

Expected: FAIL. The stub page does not contain `What footage do you need?`.

- [ ] **Step 3: Write the page**

Replace `src/desk/public/index.html` with:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>JeremAI</title>
  <link rel="stylesheet" href="/desk.css">
</head>
<body>
  <header class="top">
    <div>
      <p class="eyebrow">Working on</p>
      <h1 id="brand-name">Aether Wellness</h1>
      <p id="product">Aether Daily Mineral</p>
    </div>
    <label class="switch">Switch brand
      <select id="brand"></select>
    </label>
    <div class="budget" id="budget">
      <span>Budget $25.00</span>
      <span>Spent $0.00</span>
      <span>Nothing spent yet</span>
    </div>
  </header>
  <div class="layout">
    <nav id="steps" aria-label="Steps"></nav>
    <main>
      <h2 id="step-title">Find footage you already have</h2>
      <p id="step-help">Look through this brand’s library before making a new clip.</p>
      <form id="form">
        <label id="notes-label">Notes file on this computer
          <input id="notes" name="notes" value="fixtures/briefs/aether-morning.md">
        </label>
        <label id="footage-label">What footage do you need?
          <input id="footage" name="footage" value="morning kitchen, scooping powder, mug by the window">
          <span class="hint">Everyday words. The search matches them to clips already on file.</span>
        </label>
        <label id="seconds-label">Clip length (seconds)
          <input id="seconds" name="seconds" type="number" min="1" value="5">
        </label>
        <label id="backend-label">How it would be made
          <select id="backend">
            <option value="runpod-h3">RunPod, self-hosted</option>
            <option value="fal-ai">fal.ai</option>
            <option value="minimax-h3-api">MiniMax API</option>
          </select>
        </label>
        <label id="size-label">Picture size
          <select id="size">
            <option value="768P">Standard</option>
            <option value="2K">High</option>
          </select>
        </label>
      </form>
      <div class="actions">
        <button id="run" type="button">Search the library</button>
        <button id="try-stop" type="button" hidden>Try it — it should stop</button>
        <button id="open-sheet" type="button" hidden>Confirm and make the clip</button>
        <button id="copy" type="button">Copy instructions</button>
      </div>
      <p id="sentence"></p>
      <pre id="script" hidden></pre>
      <button id="toggle-terminal" type="button">Show the terminal output</button>
      <pre id="terminal" hidden></pre>
    </main>
    <aside>
      <p class="eyebrow">Instructions to paste</p>
      <pre id="instruction"></pre>
    </aside>
  </div>
  <dialog id="sheet">
    <p id="sheet-sentence"></p>
    <p>This practice clip records $0.</p>
    <label><input id="count-quote" type="checkbox"> Count this quote against the budget (still no real charge).</label>
    <div class="actions">
      <button id="sheet-confirm" type="button">Confirm</button>
      <button id="sheet-copy" type="button">Copy instructions</button>
      <button id="sheet-close" type="button">Close</button>
    </div>
  </dialog>
  <script type="module" src="/desk.js"></script>
</body>
</html>
```

Create `src/desk/public/desk.css`:

```css
:root {
  color-scheme: light;
  --paper: #f4f0e6;
  --ink: #1c1915;
  --muted: #5e584e;
  --line: #ddd4c4;
  --card: #fffdf8;
  --pine: #1f6b4a;
  --pine-ink: #f4fff8;
  --warn: #8a4b12;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font: 16px/1.45 "Iowan Old Style", Palatino, Georgia, serif;
  background: var(--paper);
  color: var(--ink);
}
button, input, select { font: inherit; }
.top {
  display: flex;
  gap: 24px;
  align-items: end;
  padding: 20px 24px;
  border-bottom: 1px solid var(--line);
  background: var(--card);
}
.eyebrow { margin: 0; color: var(--muted); font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; }
h1 { margin: 0; font-size: 28px; }
#product { margin: 2px 0 0; color: var(--muted); }
.switch { margin-left: auto; color: var(--muted); font-size: 14px; }
.budget { display: flex; gap: 16px; font-variant-numeric: tabular-nums; }
.budget .warn { color: var(--warn); }
.layout { display: grid; grid-template-columns: 220px 1fr 320px; min-height: calc(100vh - 92px); }
nav { padding: 12px; border-right: 1px solid var(--line); }
nav button {
  display: block;
  width: 100%;
  text-align: left;
  margin: 4px 0;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: inherit;
}
nav button[aria-current="true"] { background: #e7f3ec; border-color: var(--pine); }
nav .apart { margin-top: 20px; }
main, aside { padding: 20px 22px; }
aside { border-left: 1px solid var(--line); background: var(--card); }
label { display: block; margin: 12px 0; }
input, select { width: 100%; margin-top: 4px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; background: white; }
.hint { display: block; margin-top: 4px; color: var(--muted); font-size: 14px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.actions button, #toggle-terminal {
  border: 0;
  border-radius: 999px;
  padding: 8px 14px;
  background: var(--pine);
  color: var(--pine-ink);
}
.actions button.quiet, #toggle-terminal, #sheet-close, #copy, #sheet-copy {
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--line);
}
pre {
  white-space: pre-wrap;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px;
}
#sentence { font-size: 18px; }
dialog {
  border: 0;
  border-radius: 16px;
  padding: 20px;
  max-width: 440px;
  box-shadow: 0 16px 50px rgba(28, 25, 21, 0.18);
}
dialog::backdrop { background: rgba(28, 25, 21, 0.35); }
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .top { flex-wrap: wrap; }
  nav { display: flex; gap: 6px; overflow: auto; border-right: 0; border-bottom: 1px solid var(--line); }
  nav button { width: auto; white-space: nowrap; }
}
```

Create `src/desk/public/desk.js`:

```js
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --no-warnings --import tsx --test tests/desk-server.test.ts`

Expected: PASS. The served HTML contains `Aether Wellness` and `What footage do you need?`.

- [ ] **Step 5: Commit**

```bash
git add src/desk/public/index.html src/desk/public/desk.css src/desk/public/desk.js tests/desk-server.test.ts
git commit -m "Add the local desk page."
```

---

### Task 8: Docs and the full check

**Files:**
- Modify: `AGENTS.md` (the line that forbids a web UI, and the opening “not a web app” sentence)
- Modify: `skills/userguide.md` (the “What NOT to do” bullet)
- Modify: `README.md` (add a short local-desk section)
- Modify: `package.json` only if Task 6’s script is missing

- [ ] **Step 1: Update the three docs**

In `AGENTS.md`, after the sentence `You are driving an **ops CLI**, not a web app. Nutra ads. Confirm-before-spend. Never auto-publish.` add:

```md
`pnpm desk` serves a local page at `http://127.0.0.1:4173`. It runs the CLI on this computer. It is not deployed and it does not publish.
```

Replace hard rule 7:

```md
7. Never add a deployed web UI. `pnpm desk` is the local desk and binds `127.0.0.1` only. Never wire media-buying. Never deploy the desk.
```

In `skills/userguide.md`, replace the bullet `- Build a web UI or wire media-buying` with:

```md
- Build a deployed web UI, or wire media-buying. `pnpm desk` is the local desk on this computer.
```

Leave the Comfy row `Do not invent a UI` as it is. That row is about Comfy graphs.

In `README.md`, after the user-guide paragraph, add:

```md
## Local desk

`pnpm desk` serves http://127.0.0.1:4173 on this computer. Buttons run the CLI. Copy puts a finished instruction on the clipboard for a terminal agent. The desk is not deployed and it does not publish.
```

- [ ] **Step 2: Run the full check**

Run: `pnpm test`

Expected: PASS, including the existing pipeline tests and every `tests/desk-*.test.ts` file.

Run: `pnpm typecheck`

Expected: PASS. `src/desk/public/*.js` is outside `tsconfig.json` `include`, so the page is not typechecked. The `.ts` desk files are.

- [ ] **Step 3: Look at the page**

Run: `pnpm desk`

Expected stdout: `Desk at http://127.0.0.1:4173`

Open http://127.0.0.1:4173

Confirm all of these:

1. The header reads Aether Wellness and Aether Daily Mineral. The budget reads Budget $25.00, Spent $0.00, Nothing spent yet.
2. Find footage shows the label `What footage do you need?`. No field label reads Client or Query.
3. Search for `bathroom scale`. The sentence names `Bathroom scale before/after wall` as held back.
4. Search for `morning kitchen`. The sentence does not name the bathroom scale.
5. Copy instructions leaves the find-footage text in the right column, including the footage words and `Do not write a script, make a clip, or publish.`
6. Make the clip, then **Try it — it should stop**. The sentence is `Stopped on purpose. Making a clip needs a confirmation. Nothing was spent.`
7. **Show the terminal output** reveals the CLI text.
8. Stop the server with Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md skills/userguide.md README.md
git commit -m "Document the local desk exception."
```

---

## Spec coverage

| Spec requirement | Task |
| --- | --- |
| Plain-language steps, buttons, and blanks | Task 7 |
| Fill once, run or copy | Tasks 1 and 7 |
| `--confirm` only from the sheet | Tasks 3, 5, and 7 |
| Stop headlines and footage/price sentences | Task 2 |
| Read-only snapshot, no new table | Task 4 |
| One run at a time | Task 5 |
| Bind `127.0.0.1:4173`, unknown step never spawns | Task 6 |
| Practice run does not use the working `--data-dir` | Task 3 (`passDataDir: false`) |
| Page words and existing tests | Tasks 7 and 8 |
| Agents.md and userguide exception | Task 8 |
| No publish, no cloud, no new dependency | Every task |
