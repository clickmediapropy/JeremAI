import { BACKENDS, type BackendId, type BackendQuote, type Resolution } from "../../types.ts";

/**
 * Pricing (research brief + fal public pages, 2026 — do not treat as live quotes):
 * - MiniMax H3 API: $0.08/s @768P, $0.13/s @2K  → 5s = $0.40 / $0.65 (CEILING)
 * - RunPod self-host H3 hypothesis: ~$0.17 per ~5s clip (UNMEASURED)
 * - fal.ai H3 Max Turbo (default closed-API alt): $0.04/s @768P, $0.08/s @1080p
 *   → 5s = $0.20 / $0.40. Endpoint: fal-ai/minimax/h3-max-turbo/text-to-video
 * All adapters are dry-run stubs. No GPU rental. No paid API calls.
 */
const MINIMAX_API: Record<Resolution, number> = {
  "768P": 0.08,
  "2K": 0.13,
};
const RUNPOD_H3_PER_5S = 0.17;

/** Default fal endpoint for short ad clips (5s, 768P, T2V). Override with FAL_VIDEO_MODEL. */
export const FAL_DEFAULT_MODEL = "fal-ai/minimax/h3-max-turbo/text-to-video";

const FAL_RATES: Record<string, Record<Resolution, number>> = {
  "fal-ai/minimax/h3-max-turbo/text-to-video": { "768P": 0.04, "2K": 0.08 },
  "minimax/h3-max-turbo/text-to-video": { "768P": 0.04, "2K": 0.08 },
  "fal-ai/minimax/h3/text-to-video": { "768P": 0.08, "2K": 0.13 },
  "minimax/h3/text-to-video": { "768P": 0.08, "2K": 0.13 },
  "fal-ai/wan-25/text-to-video": { "768P": 0.05, "2K": 0.05 },
};

const BACKEND_ALIASES: Record<string, BackendId> = {
  fal: "fal-ai",
  "fal-ai": "fal-ai",
  "fal.ai": "fal-ai",
  "runpod-h3": "runpod-h3",
  runpod: "runpod-h3",
  "minimax-h3-api": "minimax-h3-api",
  minimax: "minimax-h3-api",
};

export function parseBackend(raw: string | undefined, fallback?: BackendId): BackendId {
  if (!raw || !raw.trim()) {
    if (fallback) return fallback;
    throw new Error(`Backend required. Known: ${BACKENDS.join(", ")} (alias: fal).`);
  }
  const key = raw.trim().toLowerCase();
  if ((BACKENDS as readonly string[]).includes(key)) return key as BackendId;
  const id = BACKEND_ALIASES[key];
  if (!id) {
    throw new Error(`Unknown backend "${raw}". Known: ${BACKENDS.join(", ")} (alias: fal).`);
  }
  return id;
}

export function falModelId(): string {
  return process.env.FAL_VIDEO_MODEL?.trim() || FAL_DEFAULT_MODEL;
}

export function quote(backend: BackendId, seconds: number, resolution: Resolution): BackendQuote {
  if (seconds <= 0) throw new Error("seconds must be > 0");
  if (backend === "minimax-h3-api") {
    const rate = MINIMAX_API[resolution];
    return {
      backend,
      model: `MiniMax H3 API ${resolution} (STUB — paygo ceiling)`,
      resolution,
      seconds,
      unitRateUsd: rate,
      unitLabel: `$${rate.toFixed(2)}/s official paygo`,
      baseCostUsd: round4(rate * seconds),
      ceilingNote:
        "API is the comparison ceiling only. Official 5s: $0.40 @768P / $0.65 @2K. This adapter never calls MiniMax.",
    };
  }
  if (backend === "fal-ai") {
    const model = falModelId();
    const rates = FAL_RATES[model] ?? FAL_RATES[FAL_DEFAULT_MODEL]!;
    const rate = rates[resolution];
    const known = Boolean(FAL_RATES[model]);
    return {
      backend,
      model: `fal.ai ${model} ${resolution} (STUB — closed API alt)`,
      resolution,
      seconds,
      unitRateUsd: rate,
      unitLabel: `$${rate.toFixed(2)}/s fal catalog${known ? "" : " (default H3 Max Turbo rates)"}`,
      baseCostUsd: round4(rate * seconds),
      ceilingNote: known
        ? `fal is the fast closed-API alternative (not OSS/self-host). Default H3 Max Turbo 5s: $0.20 @768P / $0.40 @1080p-mapped-2K. Never calls fal.`
        : `FAL_VIDEO_MODEL=${model} is not in the stub catalog; quoting H3 Max Turbo rates. Re-check the fal model page before any live spend. Adapter never calls fal.`,
    };
  }
  if (backend !== "runpod-h3") {
    const _exhaustive: never = backend;
    throw new Error(`Unhandled backend: ${_exhaustive}`);
  }
  const perSecond = RUNPOD_H3_PER_5S / 5;
  return {
    backend,
    model: "MiniMax H3 self-host on RunPod (STUB — $0.17/5s hypothesis)",
    resolution,
    seconds,
    unitRateUsd: perSecond,
    unitLabel: `~$${RUNPOD_H3_PER_5S.toFixed(2)} per ~5s (unverified)`,
    baseCostUsd: round4(perSecond * seconds),
    ceilingNote:
      "Call claim ~$0.17/5s is a self-host hypothesis, not official H3 API pricing. Adapter never rents GPUs.",
  };
}

export function describeBackends(): string {
  return [
    "runpod-h3        $0.17 / ~5s  (self-host hypothesis, dry-run stub, default)",
    "minimax-h3-api   $0.08/s 768P · $0.13/s 2K  (official paygo ceiling, dry-run stub)",
    "fal-ai (fal)     $0.04/s 768P H3 Max Turbo  → $0.20 / 5s  (closed API alt, dry-run stub)",
  ].join("\n");
}

export function backendFlagHelp(): string {
  return "runpod-h3 | minimax-h3-api | fal-ai (alias: fal)";
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
