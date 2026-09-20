import type { DatabaseSync } from "node:sqlite";
import type { BackendId, ClientConfig, CostEstimate } from "../types.ts";
import { parseBackend, quote } from "./backends/registry.ts";
import { listLedger } from "./db.ts";

export function billedUsd(db: DatabaseSync, clientId: string): number {
  return listLedger(db, clientId)
    .filter((e) => e.kind === "actual" && !e.dryRun)
    .reduce((sum, e) => sum + e.amountUsd, 0);
}

export function buildEstimate(
  db: DatabaseSync,
  client: ClientConfig,
  opts: { backend?: string; seconds: number; resolution?: "768P" | "2K" },
): CostEstimate {
  const backend: BackendId = parseBackend(opts.backend, client.preferredBackend);
  const q = quote(backend, opts.seconds, opts.resolution ?? "768P");
  const estimatedCostUsd = round4(q.baseCostUsd * client.retriesBuffer);
  const usedUsd = billedUsd(db, client.id);
  const remainingBudgetUsd = round4(client.budgetCapUsd - usedUsd);
  const usedPct = client.budgetCapUsd <= 0 ? 100 : (usedUsd / client.budgetCapUsd) * 100;
  const hardStop = usedUsd >= client.budgetCapUsd - 1e-9;
  const wouldExceedCap = usedUsd + estimatedCostUsd > client.budgetCapUsd + 1e-9;
  return {
    backend: q.backend,
    model: q.model,
    seconds: q.seconds,
    resolution: q.resolution,
    unitRateUsd: q.unitRateUsd,
    unitLabel: q.unitLabel,
    baseCostUsd: q.baseCostUsd,
    retriesBuffer: client.retriesBuffer,
    estimatedCostUsd,
    remainingBudgetUsd,
    capUsd: client.budgetCapUsd,
    usedUsd,
    usedPct,
    warn80: usedPct >= 80 || (usedUsd + estimatedCostUsd) / client.budgetCapUsd >= 0.8,
    hardStop,
    wouldExceedCap,
    note: q.ceilingNote,
  };
}

export function budgetGate(estimate: CostEstimate): { ok: boolean; code: "ok" | "hard" | "exceed"; message: string } {
  if (estimate.hardStop) {
    return {
      ok: false,
      code: "hard",
      message: `Hard stop: ${estimate.usedPct.toFixed(1)}% of $${estimate.capUsd.toFixed(2)} cap already billed. Refusing generate.`,
    };
  }
  if (estimate.wouldExceedCap) {
    return {
      ok: false,
      code: "exceed",
      message: `Hard stop: this job (${money(estimate.estimatedCostUsd)}) would take billed spend past the $${estimate.capUsd.toFixed(2)} cap.`,
    };
  }
  return { ok: true, code: "ok", message: "" };
}

function money(n: number): string {
  return `$${n.toFixed(4)}`;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
