import { loadClaimsPolicy, loadClient } from "../lib/config.ts";
import { lintScript } from "../lib/compliance.ts";
import { approveScript, getBrief, insertScript, latestBrief, latestScript, openDb } from "../lib/db.ts";
import { nowIso, shortId } from "../lib/ids.ts";
import { err, hr, info, kv, ok, warn } from "../lib/print.ts";
import { draftScript } from "../lib/scriptgen.ts";
import { seedClientLibrary } from "../lib/seed.ts";
import { EXIT } from "../types.ts";

export function cmdScript(opts: {
  client: string;
  brief?: string;
  approve?: boolean;
  dataDir?: string;
}): number {
  const client = loadClient(opts.client);
  const policy = loadClaimsPolicy(client);
  const { db } = openDb(opts.dataDir);
  seedClientLibrary(db, client.id);

  const brief = opts.brief ? getBrief(db, opts.brief) : latestBrief(db, client.id);
  if (!brief) {
    err("No brief found. Run `jeremai brief --client <id> --file <path>` first.");
    return EXIT.notFound;
  }

  const draft = draftScript(client, brief, policy);
  const lint = lintScript(draft.body, policy);
  const row = {
    id: shortId("script"),
    briefId: brief.id,
    clientId: client.id,
    body: draft.body,
    hooks: draft.hooks,
    lint,
    lintOk: lint.ok,
    approved: false,
    approvedAt: null,
    createdAt: nowIso(),
  };
  insertScript(db, row);

  hr("script  (AI ~90% draft · human must approve)");
  kv("id", row.id);
  kv("brief", `${brief.id} · ${brief.title}`);
  kv("lint", lint.ok ? "PASS" : "FAIL");
  kv("used claims", lint.usedClaims.join(" | ") || "(none matched)");
  console.log("");
  console.log(draft.body);
  console.log("");

  if (!lint.ok) {
    warn("Deterministic lint failed. Hits:");
    for (const hit of lint.hits.filter((h) => h.severity === "fail")) {
      info(`[${hit.id}] ${hit.reason}`);
      info(`    "${hit.excerpt}"`);
    }
    err("Will not approve a failing script. Fix claims, then re-run script.");
    return EXIT.compliance;
  }

  if (opts.approve) {
    approveScript(db, row.id, nowIso());
    ok(`Human approve recorded on ${row.id}. Generate is now allowed (still needs --confirm).`);
  } else {
    warn("Lint passed but script is NOT approved. Re-run with --approve after a human reads it.");
    info("Never auto-publish Nutra ads. Approval is a product gate, not a courtesy.");
  }

  const latest = latestScript(db, client.id);
  if (latest) kv("latest script", `${latest.id} approved=${latest.approved}`);
  return 0;
}
