import type { BackendId, BackendQuote, Resolution } from "../../types.ts";

/**
 * Pricing (research brief, Sep 2026 — do not treat as live quotes):
 * - MiniMax H3 API: $0.08/s @768P, $0.13/s @2K  → 5s = $0.40 / $0.65 (CEILING)
 * - RunPod self-host H3 hypothesis: ~$0.17 per ~5s clip (UNMEASURED)
 * Both adapters are dry-run stubs. No GPU rental. No paid API calls.
 */
const MINIMAX_API: Record<Resolution, number> = {
  "768P": 0.08,
  "2K": 0.13,
};
const RUNPOD_H3_PER_5S = 0.17;

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
  ].join("\n");
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
