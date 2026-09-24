import { loadClaimsPolicy, loadClient } from "../lib/config.ts";
import { readEnvValue } from "./keys.ts";
import type { ListedModel } from "./openrouter.ts";
import { AGENT_RUNNABLE, AGENT_STEPS, AGENT_TOOL_NAMES, AGENT_TOOLS, STEP_CATALOG } from "./public/agent-tools.js";
import { readState } from "./state.ts";

const HISTORY = 20;
const BACKENDS = new Set(["runpod-h3", "fal-ai", "minimax-h3-api"]);

export interface AgentMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
}

export interface AgentToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface AgentReply {
  content: string;
  toolCalls: AgentToolCall[];
}

export interface AgentScreen {
  step?: string;
  blanks?: Record<string, unknown>;
  lastSentence?: string;
  lastExitCode?: number | null;
}

const NO_KEY = "Add an OpenRouter key on the Keys tab.";

export async function agentTurn(opts: {
  brand: string;
  model: string;
  models: ListedModel[];
  messages: unknown;
  screen?: AgentScreen;
  dataDir: string;
  clientsRoot?: string;
  envPath: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; reply: AgentReply } | { ok: false; sentence: string }> {
  const key = readEnvValue(opts.envPath, "OPENROUTER_API_KEY");
  if (!key) return { ok: false, sentence: NO_KEY };
  if (!opts.models.some((model) => model.id === opts.model)) {
    return { ok: false, sentence: "Pick one of the listed models." };
  }
  const history = cleanHistory(opts.messages);
  if (history.length === 0) return { ok: false, sentence: "Type a question for the agent." };
  const state = readState(opts.brand, opts.dataDir, opts.clientsRoot);
  if (!state.brand) return { ok: false, sentence: "That brand is not on this computer." };
  let claims: string[] = [];
  try {
    claims = loadClaimsPolicy(loadClient(opts.brand, opts.clientsRoot)).allowedClaims;
  } catch {
    claims = [];
  }
  const system = systemPrompt(state.brand, claims, opts.screen);
  const fetchImpl = opts.fetchImpl ?? fetch;
  let body: {
    choices?: { message?: { content?: string | null; tool_calls?: unknown } }[];
  };
  try {
    const res = await fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: opts.model,
        messages: [{ role: "system", content: system }, ...history],
        tools: AGENT_TOOLS,
        tool_choice: "auto",
      }),
    });
    if (!res.ok) return { ok: false, sentence: "The agent did not answer." };
    body = (await res.json()) as typeof body;
  } catch {
    return { ok: false, sentence: "The agent did not answer." };
  }
  const message = body.choices?.[0]?.message;
  const content = typeof message?.content === "string" ? message.content : "";
  const toolCalls = filterToolCalls(message?.tool_calls);
  if (!content && toolCalls.length === 0) return { ok: false, sentence: "The agent did not answer." };
  return { ok: true, reply: { content, toolCalls } };
}

export function filterToolCalls(raw: unknown): AgentToolCall[] {
  if (!Array.isArray(raw)) return [];
  const kept: AgentToolCall[] = [];
  for (const item of raw) {
    const call = item as { id?: unknown; function?: { name?: unknown; arguments?: unknown } };
    const name = typeof call.function?.name === "string" ? call.function.name : "";
    if (!AGENT_TOOL_NAMES.includes(name)) continue;
    let args: Record<string, unknown> = {};
    if (typeof call.function?.arguments === "string" && call.function.arguments.trim()) {
      try {
        const parsed: unknown = JSON.parse(call.function.arguments);
        if (parsed && typeof parsed === "object") args = parsed as Record<string, unknown>;
      } catch {
        continue;
      }
    } else if (call.function?.arguments && typeof call.function.arguments === "object") {
      args = call.function.arguments as Record<string, unknown>;
    }
    if (name === "go_to_step" && !AGENT_STEPS.includes(String(args.step))) continue;
    if (name === "run_step" && !AGENT_RUNNABLE.includes(String(args.step))) continue;
    if (name === "fill_blanks") {
      const clean: Record<string, unknown> = {};
      if (typeof args.notesPath === "string") clean.notesPath = args.notesPath;
      if (typeof args.footage === "string") clean.footage = args.footage;
      if (typeof args.seconds === "number" && args.seconds > 0) clean.seconds = Math.round(args.seconds);
      if (typeof args.backend === "string" && BACKENDS.has(args.backend)) clean.backend = args.backend;
      if (args.resolution === "768P" || args.resolution === "2K") clean.resolution = args.resolution;
      if (Object.keys(clean).length === 0) continue;
      args = clean;
    }
    kept.push({ id: typeof call.id === "string" ? call.id : `call_${kept.length}`, name, args });
  }
  return kept;
}

function cleanHistory(raw: unknown): AgentMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: AgentMessage[] = [];
  for (const item of raw) {
    const msg = item as Partial<AgentMessage>;
    if (msg.role !== "user" && msg.role !== "assistant" && msg.role !== "tool") continue;
    const content = typeof msg.content === "string" ? msg.content : "";
    const clean: AgentMessage = { role: msg.role, content };
    if (msg.role === "tool" && typeof msg.tool_call_id === "string") clean.tool_call_id = msg.tool_call_id;
    if (msg.role === "assistant" && Array.isArray(msg.tool_calls)) {
      clean.tool_calls = msg.tool_calls
        .filter(
          (call) =>
            call &&
            typeof call.id === "string" &&
            typeof call.function?.name === "string" &&
            typeof call.function?.arguments === "string",
        )
        .map((call) => ({
          id: call.id,
          type: "function" as const,
          function: { name: call.function.name, arguments: call.function.arguments },
        }));
      if (clean.tool_calls.length === 0) delete clean.tool_calls;
    }
    if (!clean.content && !clean.tool_calls && msg.role !== "tool") continue;
    out.push(clean);
  }
  // Keep the tail, but never start on a tool result without its call.
  let tail = out.slice(-HISTORY);
  while (tail.length && tail[0]?.role === "tool") tail = tail.slice(1);
  return tail;
}

function systemPrompt(
  brand: NonNullable<ReturnType<typeof readState>["brand"]>,
  claims: string[],
  screen?: AgentScreen,
): string {
  const catalog = STEP_CATALOG.map(
    (step) =>
      `- ${step.id} ("${step.label}", CLI ${step.cli || "none"}): ${step.purpose} ${step.runnable ? "You may run it." : "You may open it but never run it."}`,
  ).join("\n");
  const money = (n: number) => `$${n.toFixed(2)}`;
  const facts = [
    `Brand: ${brand.name} (${brand.id}). Product: ${brand.product}. Preferred backend: ${brand.preferredBackend}.`,
    `Budget: cap ${money(brand.budget.capUsd)}, spent ${money(brand.budget.spentUsd)} (${brand.budget.usedPct.toFixed(1)}%). ${brand.budget.hardStop ? "The cap is reached; clips stop." : brand.budget.warn80 ? "Past 80%." : "Under 80%."}`,
    `Library: ${brand.library.fine} clips fine to use, ${brand.library.heldBack} held back.`,
    `Notes: ${brand.notes ? `on file ("${brand.notes.title}")` : "none yet"}.`,
    `Script: ${brand.script ? `written, claims check ${brand.script.lintPass ? "passed" : "failed"}, ${brand.script.approved ? "approved" : "not approved"}` : "none yet"}.`,
    `Last clip: ${brand.clip ? `quoted ${money(brand.clip.quotedUsd)}, spent ${money(brand.clip.spentUsd)}, ${brand.clip.dryRun ? "practice" : "real"}` : "none yet"}.`,
  ];
  if (screen?.step) facts.push(`Open step: ${screen.step}.`);
  if (screen?.blanks) facts.push(`Blanks on screen: ${JSON.stringify(screen.blanks)}.`);
  if (screen?.lastSentence) {
    facts.push(`Last result: "${screen.lastSentence}"${typeof screen.lastExitCode === "number" ? ` (exit ${screen.lastExitCode})` : ""}.`);
  }
  return [
    "You are the desk agent for JeremAI, a local tool that makes practice video ads for a supplement brand.",
    "You help the person use the desk: explain steps, say what to do next, fill blanks, open steps, and press keys that spend nothing.",
    "Rules that never bend:",
    "- Never make a clip, never approve a script, never run the practice job. Those are human gates. Point to the key and stop.",
    "- Never tell the person to add --confirm, and never say an ad was posted. Nothing here posts an ad or calls RunPod, fal, or MiniMax.",
    "- The claims allowlist is law. Do not suggest disease, cure, treat, prevent, before/after, or weight-loss language.",
    "- Exit codes: 0 done, 1 not valid, 2 stopped on purpose (a clip needs confirmation), 3 budget, 4 claims or approval, 5 something missing.",
    "- Be short. One or two sentences unless asked for more. Name steps by their on-screen label.",
    "- Use tools when the person asks you to do something; say what you did in words after.",
    "",
    "Steps on the desk, in order:",
    catalog,
    "",
    `Allowed claims for this brand: ${claims.length ? claims.join(" | ") : "(none listed)"}`,
    "",
    "Current state:",
    ...facts,
  ].join("\n");
}
