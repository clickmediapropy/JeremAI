import { billedUsd } from "../lib/budget.ts";
import { loadClient } from "../lib/config.ts";
import { listJobs, listLedger, openDb } from "../lib/db.ts";
import { hr, info, kv, money, pct, warn } from "../lib/print.ts";
import { seedClientLibrary } from "../lib/seed.ts";

export function cmdCost(opts: { client: string; dataDir?: string }): number {
  const client = loadClient(opts.client);
  const { db } = openDb(opts.dataDir);
  seedClientLibrary(db, client.id);
  const used = billedUsd(db, client.id);
  const remaining = client.budgetCapUsd - used;
  const usedPct = (used / client.budgetCapUsd) * 100;
  const jobs = listJobs(db, client.id);
  const ledger = listLedger(db, client.id);
  const dryEstimates = ledger.filter((e) => e.kind === "estimate").reduce((s, e) => s + e.amountUsd, 0);

  hr("cost  (per-client ledger)");
  kv("client", `${client.name} (${client.id})`);
  kv("cap", money(client.budgetCapUsd));
  kv("billed live", money(used));
  kv("remaining", money(remaining));
  kv("used", pct(usedPct));
  kv("dry-run quotes", money(dryEstimates));
  kv("jobs", jobs.length);

  if (usedPct >= 100) warn("HARD STOP — cap exhausted. generate is blocked.");
  else if (usedPct >= 80) warn("Soft warn — 80% of cap billed.");

  if (ledger.length === 0) {
    info("Ledger empty. Run estimate / generate --confirm first.");
    return 0;
  }

  console.log("");
  console.log("  When                 Kind      Amount      Dry  Note");
  console.log("  " + "─".repeat(72));
  for (const e of ledger) {
    const when = e.createdAt.replace("T", " ").slice(0, 19);
    const kind = e.kind.padEnd(9);
    const amt = money(e.amountUsd).padStart(10);
    const dry = e.dryRun ? "yes" : "LIVE";
    console.log(`  ${when}  ${kind} ${amt}  ${dry.padEnd(4)}  ${e.note.slice(0, 48)}`);
  }
  console.log("");
  info("Live actuals count against the cap. Dry-run quotes do not.");
  info("Success metric: $0 API spend over cap. This MVP never places a paid cloud call.");
  return 0;
}
