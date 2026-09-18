import { join } from "node:path";
import { budgetGate, buildEstimate } from "../lib/budget.ts";
import { loadClaimsPolicy, loadClient } from "../lib/config.ts";
import {
  approveScript,
  insertAsset,
  insertJob,
  insertLedger,
  latestScript,
  listAssets,
  openDb,
} from "../lib/db.ts";
import { writeStubClip } from "../lib/ffmpeg.ts";
import { nowIso, sha256Short, shortId } from "../lib/ids.ts";
import { err, hr, info, kv, money, ok, warn } from "../lib/print.ts";
import { searchBroll } from "../lib/search.ts";
import { seedClientLibrary } from "../lib/seed.ts";
import { EXIT, type BackendId, type Resolution } from "../types.ts";

export function cmdGenerate(opts: {
  client: string;
  confirm?: boolean;
  seconds?: number;
  backend?: string;
  resolution?: string;
  approveScript?: boolean;
  simulateSpend?: boolean;
  dataDir?: string;
}): number {
  const client = loadClient(opts.client);
  const policy = loadClaimsPolicy(client);
  const { db, dataDir } = openDb(opts.dataDir);
  seedClientLibrary(db, client.id);

  if (!opts.confirm) {
    err("generate refused: pass --confirm (or type the documented yes-path).");
    info("Spend tools are dangerous. Flow is estimate → --confirm → execute → ledger.");
    info("This build still dry-runs backends; --confirm is required anyway so the gate is real.");
    return EXIT.needsConfirm;
  }

  const script = latestScript(db, client.id);
  if (!script) {
    err("No script on file. Run `jeremai script` first.");
    return EXIT.notFound;
  }
  if (!script.lintOk) {
    err(`Script ${script.id} failed claims lint. Will not render.`);
    return EXIT.compliance;
  }
  if (!script.approved) {
    if (opts.approveScript) {
      approveScript(db, script.id, nowIso());
      ok(`Recorded human approve on ${script.id} via --approve-script.`);
    } else {
      err(`Script ${script.id} is not human-approved. Re-run script --approve, or generate --confirm --approve-script.`);
      return EXIT.compliance;
    }
  }

  const seconds = opts.seconds ?? 5;
  const estimate = buildEstimate(db, client, {
    seconds,
    backend: (opts.backend as BackendId | undefined) ?? client.preferredBackend,
    resolution: (opts.resolution as Resolution | undefined) ?? "768P",
  });
  const gate = budgetGate(estimate);
  if (!gate.ok) {
    err(gate.message);
    return EXIT.budget;
  }
  if (estimate.warn80) {
    warn(`Soft warn: projected billed+job ≥ 80% of $${estimate.capUsd.toFixed(2)} cap.`);
  }

  const reuse = searchBroll(listAssets(db, client.id), script.hooks.join(" ") + " kitchen ritual scoop")
    .filter((h) => h.asset.claimSafe)
    .slice(0, 3);

  hr("generate  (confirmed · dry-run stub · no GPU · no MiniMax call)");
  kv("script", script.id);
  kv("disclaimer present", script.body.includes(policy.disclaimer) ? "yes" : "NO");
  kv("backend", estimate.model);
  kv("seconds", estimate.seconds);
  kv("estimated", money(estimate.estimatedCostUsd));
  kv("allow spend env", process.env.JEREMAI_ALLOW_SPEND === "1" ? "1 (still stubbed)" : "0 (forced dry-run)");
  kv("simulate vs cap", opts.simulateSpend ? "YES — will debit estimate as live actual" : "no (actual $0)");

  if (reuse.length) {
    console.log("");
    info("Reuse candidates (do not regenerate these):");
    for (const h of reuse) info(`· ${h.asset.title} (${h.asset.durationS}s) ${h.asset.uri}`);
  }

  const jobId = shortId("job");
  const outPath = join(dataDir, "clips", `${jobId}.mp4`);
  writeStubClip({
    outPath,
    seconds,
    label: `DRY RUN ${estimate.backend} ${seconds}s`,
    color: estimate.backend === "runpod-h3" ? "0x14261c" : "0x1a2030",
  });

  const dryRun = !opts.simulateSpend;
  const actual = dryRun ? 0 : estimate.estimatedCostUsd;
  const at = nowIso();

  insertJob(db, {
    id: jobId,
    clientId: client.id,
    scriptId: script.id,
    backend: estimate.backend,
    seconds,
    resolution: estimate.resolution,
    estimatedCostUsd: estimate.estimatedCostUsd,
    actualCostUsd: actual,
    dryRun,
    confirmed: true,
    status: "dry_run",
    outputUri: outPath,
    reuseAssetIds: reuse.map((h) => h.asset.id),
    createdAt: at,
  });
  insertLedger(db, {
    id: shortId("led"),
    clientId: client.id,
    jobId,
    kind: "estimate",
    amountUsd: estimate.estimatedCostUsd,
    note: `${estimate.backend} ${seconds}s ${estimate.resolution} quote`,
    dryRun: true,
    createdAt: at,
  });
  insertLedger(db, {
    id: shortId("led"),
    clientId: client.id,
    jobId,
    kind: "actual",
    amountUsd: actual,
    note: dryRun
      ? "dry-run stub — $0 billed. Adapter did not call MiniMax or RunPod."
      : "SIMULATED live debit for meter rehearsal (still no cloud spend).",
    dryRun,
    createdAt: at,
  });
  insertAsset(db, {
    id: shortId("gen"),
    clientId: client.id,
    title: `Generated stub ${jobId}`,
    description: `Dry-run ${estimate.backend} clip from script ${script.id}`,
    tags: ["generated", "stub", estimate.backend, "hook"],
    durationS: seconds,
    claimSafe: true,
    hash: sha256Short(jobId),
    uri: outPath,
    source: "generated",
    createdAt: at,
  });

  console.log("");
  ok(`Job ${jobId} written. Clip stub: ${outPath}`);
  kv("actual billed", money(actual));
  info("Next: jeremai assemble --client " + client.id);
  return 0;
}
