import { backendFlagHelp, describeBackends, parseBackend } from "../lib/backends/registry.ts";
import { buildEstimate } from "../lib/budget.ts";
import { loadClient } from "../lib/config.ts";
import { openDb } from "../lib/db.ts";
import { err, hr, info, kv, money, pct, warn } from "../lib/print.ts";
import { seedClientLibrary } from "../lib/seed.ts";
import { EXIT, type Resolution } from "../types.ts";

export function cmdEstimate(opts: {
  client: string;
  seconds?: number;
  backend?: string;
  resolution?: string;
  dataDir?: string;
}): number {
  const client = loadClient(opts.client);
  const { db } = openDb(opts.dataDir);
  seedClientLibrary(db, client.id);
  const seconds = opts.seconds ?? 5;
  let backend = client.preferredBackend;
  try {
    backend = parseBackend(opts.backend, client.preferredBackend);
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
    info(backendFlagHelp());
    return EXIT.usage;
  }
  const estimate = buildEstimate(db, client, {
    seconds,
    backend,
    resolution: (opts.resolution as Resolution | undefined) ?? "768P",
  });

  hr("estimate  (no spend · confirm is a later command)");
  kv("client", `${client.name} (${client.id})`);
  kv("backend / model", estimate.model);
  kv("seconds", estimate.seconds);
  kv("resolution", estimate.resolution);
  kv("unit", estimate.unitLabel);
  kv("base", money(estimate.baseCostUsd));
  kv("retries buffer", `${estimate.retriesBuffer}×`);
  kv("estimated", money(estimate.estimatedCostUsd));
  kv("billed (live)", `${money(estimate.usedUsd)} / ${money(estimate.capUsd)}  (${pct(estimate.usedPct)})`);
  kv("remaining", money(estimate.remainingBudgetUsd));
  console.log("");
  info(estimate.note);
  console.log("");
  info("Backends:");
  for (const line of describeBackends().split("\n")) info(line);

  if (estimate.hardStop || estimate.wouldExceedCap) {
    warn(
      estimate.hardStop
        ? "HARD STOP — cap already reached. generate will refuse."
        : "HARD STOP — this job would exceed the cap. generate will refuse.",
    );
  } else if (estimate.warn80) {
    warn("Soft warn — projected spend ≥ 80% of client cap.");
  }
  info(
    `Next: jeremai generate --client ${client.id} --backend ${estimate.backend} --confirm   (still dry-run by default)`,
  );
  return 0;
}
