import { loadClient } from "../lib/config.ts";
import { listAssets, openDb } from "../lib/db.ts";
import { hr, info, kv, ok, warn } from "../lib/print.ts";
import { searchBroll } from "../lib/search.ts";
import { seedClientLibrary } from "../lib/seed.ts";

export function cmdSearchBroll(opts: {
  client: string;
  query?: string;
  seconds?: number;
  dataDir?: string;
}): number {
  const client = loadClient(opts.client);
  const { db } = openDb(opts.dataDir);
  const seeded = seedClientLibrary(db, client.id);
  const assets = listAssets(db, client.id);
  const query = opts.query ?? "";
  const ranked = searchBroll(assets, query);

  hr("search-broll  (library BEFORE generate)");
  kv("client", `${client.name} (${client.id})`);
  kv("drive", client.driveUri);
  kv("r2", client.r2Uri);
  kv("indexed", `${assets.length} clips${seeded ? ` (seeded ${seeded})` : ""}`);
  kv("query", query || "(all)");
  if (opts.seconds) kv("target seconds", opts.seconds);

  if (assets.length === 0) {
    warn("Index empty. Add Drive/R2 hashes before you pay for generation.");
    return 0;
  }

  console.log("");
  for (const [i, hit] of ranked.slice(0, 8).entries()) {
    const a = hit.asset;
    const flag = a.claimSafe ? "SAFE" : "UNSAFE";
    console.log(
      `  ${String(i + 1).padStart(2)}. [${flag}] ${a.title}  ${a.durationS}s  ${a.source}  score=${hit.score.toFixed(1)}`,
    );
    info(`${a.uri}  ·  ${a.hash}  ·  ${a.tags.join(", ")}`);
    if (!a.claimSafe) warn("Do not use this clip in a claim-bearing Nutra cut without legal review.");
  }

  const reusable = ranked.filter((h) => h.asset.claimSafe && h.score > 0);
  const seconds = reusable.reduce((s, h) => s + h.asset.durationS, 0);
  console.log("");
  ok(
    reusable.length
      ? `${reusable.length} claim-safe hits · ~${seconds.toFixed(0)}s reusable. Prefer these over H3 regen.`
      : "No strong claim-safe match. You may generate — but estimate + --confirm first.",
  );
  return 0;
}
