import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadClaimsPolicy, loadClient } from "../lib/config.ts";
import { lintScript } from "../lib/compliance.ts";
import { insertScript, latestBrief, openDb } from "../lib/db.ts";
import { nowIso, shortId } from "../lib/ids.ts";
import { completeJson, type ListedModel } from "./openrouter.ts";
import { readEnvValue, MODEL_ENV } from "./keys.ts";

const BACKENDS = new Set(["runpod-h3", "fal-ai", "minimax-h3-api"]);
const EMPTY = new Set(["set-up", "approve-script", "rough-cut", "spending", "practice", "keys"]);

export interface FillResult {
  sentence: string;
  footage?: string;
  notesPath?: string;
  seconds?: number;
  backend?: string;
  resolution?: "768P" | "2K";
  script?: string;
  saved?: boolean;
}

export async function fillStep(opts: {
  step: string;
  brand: string;
  model: string;
  models: ListedModel[];
  dataDir: string;
  clientsRoot?: string;
  envPath: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; fill: FillResult } | { ok: false; sentence: string }> {
  if (!opts.models.some((model) => model.id === opts.model)) {
    return { ok: false, sentence: "Pick one of the listed models." };
  }
  if (EMPTY.has(opts.step)) {
    return { ok: true, fill: { sentence: "Nothing to type on this step." } };
  }
  const key = readEnvValue(opts.envPath, "OPENROUTER_API_KEY");
  if (!key) return { ok: false, sentence: "Add an OpenRouter key on the Keys tab." };
  let client;
  try {
    client = loadClient(opts.brand, opts.clientsRoot);
  } catch {
    return { ok: false, sentence: "That brand is not on this computer." };
  }
  const policy = loadClaimsPolicy(client);
  const system =
    "You draft Nutra ad inputs. Reply with one JSON object and no other text. " +
    "Use only the allowed claims. Do not use disease, cure, treat, prevent, before/after, or weight-loss language.";
  const user = [
    `Brand: ${client.name}`,
    `Product: ${client.product}`,
    `Allowed claims: ${policy.allowedClaims.join(" | ")}`,
    `Disclaimer: ${policy.disclaimer}`,
    `Step: ${opts.step}`,
    stepAsk(opts.step),
  ].join("\n");
  let parsed: unknown;
  try {
    parsed = await completeJson(key, opts.model, system, user, opts.fetchImpl);
  } catch {
    return { ok: false, sentence: "The model did not return a draft." };
  }
  const obj = parsed !== null && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  if (opts.step === "add-notes") return notesFill(obj, opts.dataDir, opts.brand, client.name);
  if (opts.step === "find-footage") return footageFill(obj);
  if (opts.step === "write-script") return scriptFill(obj, client.id, policy, opts.dataDir);
  if (opts.step === "check-price" || opts.step === "make-clip") return priceFill(obj, client.preferredBackend);
  return { ok: false, sentence: "Nothing to type on this step." };
}

function stepAsk(step: string): string {
  if (step === "add-notes") return 'Return {"notes":"a short markdown brief with a # title"}';
  if (step === "find-footage") return 'Return {"footage":"everyday words for clips already on file"}';
  if (step === "write-script") {
    return 'Return {"script":"HOOK, VO, B-ROLL, CTA, and a SUPER line that copies the disclaimer exactly"}';
  }
  return 'Return {"seconds":5,"backend":"runpod-h3","resolution":"768P"} using only runpod-h3, fal-ai, or minimax-h3-api and 768P or 2K.';
}

function notesFill(
  obj: Record<string, unknown>,
  dataDir: string,
  brand: string,
  name: string,
): { ok: true; fill: FillResult } | { ok: false; sentence: string } {
  const notes = typeof obj.notes === "string" ? obj.notes.trim() : "";
  if (!notes) return { ok: false, sentence: "The model did not return a draft." };
  const dir = join(dataDir, "briefs");
  mkdirSync(dir, { recursive: true });
  const notesPath = join(dir, `${brand}-ai.md`);
  const body = notes.startsWith("#") ? notes : `# ${name}\n\n${notes}`;
  writeFileSync(notesPath, `${body}\n`);
  return { ok: true, fill: { sentence: "Notes drafted. Add them when they look right.", notesPath } };
}

function footageFill(obj: Record<string, unknown>): { ok: true; fill: FillResult } | { ok: false; sentence: string } {
  const footage = typeof obj.footage === "string" ? obj.footage.trim() : "";
  if (!footage) return { ok: false, sentence: "The model did not return a draft." };
  return { ok: true, fill: { sentence: "Footage words are filled in.", footage } };
}

function priceFill(
  obj: Record<string, unknown>,
  preferred: string,
): { ok: true; fill: FillResult } {
  const seconds = typeof obj.seconds === "number" && obj.seconds > 0 ? obj.seconds : 5;
  const backend = typeof obj.backend === "string" && BACKENDS.has(obj.backend) ? obj.backend : preferred;
  const resolution = obj.resolution === "2K" ? "2K" : "768P";
  return {
    ok: true,
    fill: { sentence: "Price settings are filled in.", seconds, backend, resolution },
  };
}

function scriptFill(
  obj: Record<string, unknown>,
  clientId: string,
  policy: ReturnType<typeof loadClaimsPolicy>,
  dataDir: string,
): { ok: true; fill: FillResult } | { ok: false; sentence: string } {
  const script = typeof obj.script === "string" ? obj.script.trim() : "";
  if (!script) return { ok: false, sentence: "The model did not return a draft." };
  const lint = lintScript(script, policy);
  if (!lint.ok) {
    return {
      ok: true,
      fill: { sentence: "The draft says something this brand is not allowed to say. It was not saved.", script },
    };
  }
  const { db } = openDb(dataDir);
  const brief = latestBrief(db, clientId);
  if (!brief) {
    db.close();
    return { ok: true, fill: { sentence: "Draft is ready. Add notes before it can be saved.", script } };
  }
  insertScript(db, {
    id: shortId("script"),
    briefId: brief.id,
    clientId,
    body: script,
    hooks: [],
    lint,
    lintOk: true,
    approved: false,
    approvedAt: null,
    createdAt: nowIso(),
  });
  db.close();
  return { ok: true, fill: { sentence: "Script drafted. It is not approved.", script, saved: true } };
}

export function selectedModel(envPath: string, models: ListedModel[]): string {
  const saved = readEnvValue(envPath, MODEL_ENV);
  if (models.some((model) => model.id === saved)) return saved;
  return models[0]?.id ?? "";
}
