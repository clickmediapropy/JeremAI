import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const KEY_FIELDS = [
  { id: "runpod", label: "RunPod", env: "RUNPOD_API_KEY" },
  { id: "fal", label: "fal.ai", env: "FAL_KEY" },
  { id: "minimax", label: "MiniMax", env: "MINIMAX_API_KEY" },
  { id: "openrouter", label: "OpenRouter", env: "OPENROUTER_API_KEY" },
] as const;

export const MODEL_ENV = "OPENROUTER_MODEL";

const ALLOWED = new Set<string>(KEY_FIELDS.map((field) => field.env));

export interface KeyStatus {
  id: string;
  label: string;
  env: string;
  set: boolean;
}

export function saveModel(envPath: string, model: string): { ok: true } | { ok: false; sentence: string } {
  if (!/^[a-z0-9.-]+\/[a-z0-9._-]+$/i.test(model)) {
    return { ok: false, sentence: "Pick one of the listed models." };
  }
  upsertEnvLine(envPath, MODEL_ENV, model);
  return { ok: true };
}

export function readEnvValue(envPath: string, env: string): string {
  return readEnv(envPath).get(env) ?? "";
}

export function readKeys(envPath: string): KeyStatus[] {
  const values = readEnv(envPath);
  return KEY_FIELDS.map((field) => ({
    ...field,
    set: Boolean(values.get(field.env)),
  }));
}

export function saveKey(
  envPath: string,
  env: string,
  value: string,
): { ok: true; sentence: string } | { ok: false; sentence: string } {
  if (!ALLOWED.has(env)) return { ok: false, sentence: "That key is not one this desk stores." };
  const secret = value.trim();
  if (!secret || secret.includes("\n") || secret.includes("\r")) {
    return { ok: false, sentence: "Paste the key." };
  }
  upsertEnvLine(envPath, env, secret);
  const label = KEY_FIELDS.find((field) => field.env === env)?.label ?? env;
  return { ok: true, sentence: `${label} key saved on this computer.` };
}

export function clearKey(
  envPath: string,
  env: string,
): { ok: true; sentence: string } | { ok: false; sentence: string } {
  if (!ALLOWED.has(env)) return { ok: false, sentence: "That key is not one this desk stores." };
  removeEnvLine(envPath, env);
  const label = KEY_FIELDS.find((field) => field.env === env)?.label ?? env;
  return { ok: true, sentence: `${label} key removed from this computer.` };
}

function readEnv(envPath: string): Map<string, string> {
  const values = new Map<string, string>();
  if (!existsSync(envPath)) return values;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let raw = trimmed.slice(eq + 1).trim();
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      raw = raw.slice(1, -1);
    }
    values.set(key, raw);
  }
  return values;
}

function upsertEnvLine(envPath: string, env: string, value: string): void {
  const line = `${env}=${quote(value)}`;
  const text = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const lines = text.length ? text.split("\n") : [];
  const index = lines.findIndex((row) => row.trim().startsWith(`${env}=`) || row.trim().startsWith(`${env} =`));
  if (index >= 0) lines[index] = line;
  else {
    if (lines.length && lines[lines.length - 1] === "") lines.pop();
    lines.push(line);
  }
  writeFileSync(envPath, `${lines.filter((row, i) => row !== "" || i < lines.length - 1).join("\n")}\n`);
}

function removeEnvLine(envPath: string, env: string): void {
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf8")
    .split("\n")
    .filter((row) => {
      const trimmed = row.trim();
      return !(trimmed.startsWith(`${env}=`) || trimmed.startsWith(`${env} =`));
    });
  const body = lines.join("\n").replace(/\n+$/, "");
  writeFileSync(envPath, body ? `${body}\n` : "");
}

function quote(value: string): string {
  if (/[\s#"'\\]/.test(value)) return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return value;
}
