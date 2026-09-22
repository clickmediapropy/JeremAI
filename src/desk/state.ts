import { existsSync } from "node:fs";
import { join } from "node:path";
import { billedUsd } from "../lib/budget.ts";
import { listClients, loadClient } from "../lib/config.ts";
import { latestBrief, latestJob, latestScript, listAssets } from "../lib/db.ts";
import { findProjectRoot } from "../lib/paths.ts";
import { openReadOnly } from "./read-db.ts";

export interface DeskState {
  brands: { id: string; name: string; product: string; preferredBackend: string }[];
  brand: {
    id: string;
    name: string;
    product: string;
    preferredBackend: string;
    budget: {
      capUsd: number;
      spentUsd: number;
      remainingUsd: number;
      usedPct: number;
      warn80: boolean;
      hardStop: boolean;
    };
    notes: { title: string } | null;
    notesPrefill: string | null;
    library: { fine: number; heldBack: number };
    script: { id: string; lintPass: boolean; approved: boolean; body: string } | null;
    clip: { id: string; quotedUsd: number; spentUsd: number; dryRun: boolean } | null;
  } | null;
}

export function readState(brandId: string, dataDir: string): DeskState {
  const brands = listClients().map((id) => {
    const client = loadClient(id);
    return { id, name: client.name, product: client.product, preferredBackend: client.preferredBackend };
  });
  const known = brands.find((brand) => brand.id === brandId);
  if (!known) return { brands, brand: null };
  const client = loadClient(brandId);
  const prefillPath = join(findProjectRoot(), "fixtures", "briefs", "aether-morning.md");
  const notesPrefill = existsSync(prefillPath) ? "fixtures/briefs/aether-morning.md" : null;
  const db = openReadOnly(dataDir);
  const spentUsd = db ? billedUsd(db, brandId) : 0;
  const assets = db ? listAssets(db, brandId) : [];
  const notes = db ? latestBrief(db, brandId) : null;
  const script = db ? latestScript(db, brandId) : null;
  const clip = db ? latestJob(db, brandId) : null;
  db?.close();
  const capUsd = client.budgetCapUsd;
  const usedPct = capUsd <= 0 ? 100 : (spentUsd / capUsd) * 100;
  return {
    brands,
    brand: {
      id: client.id,
      name: client.name,
      product: client.product,
      preferredBackend: client.preferredBackend,
      budget: {
        capUsd,
        spentUsd,
        remainingUsd: capUsd - spentUsd,
        usedPct,
        warn80: usedPct >= 80,
        hardStop: spentUsd >= capUsd - 1e-9,
      },
      notes: notes ? { title: notes.title } : null,
      notesPrefill,
      library: {
        fine: assets.filter((asset) => asset.claimSafe).length,
        heldBack: assets.filter((asset) => !asset.claimSafe).length,
      },
      script: script
        ? { id: script.id, lintPass: script.lintOk, approved: script.approved, body: script.body }
        : null,
      clip: clip
        ? { id: clip.id, quotedUsd: clip.estimatedCostUsd, spentUsd: clip.actualCostUsd, dryRun: clip.dryRun }
        : null,
    },
  };
}
