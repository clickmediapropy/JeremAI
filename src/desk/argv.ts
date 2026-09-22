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
