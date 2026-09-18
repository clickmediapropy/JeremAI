import type { AssetRecord } from "../types.ts";

export interface RankedAsset {
  asset: AssetRecord;
  score: number;
  reasons: string[];
}

export function searchBroll(assets: AssetRecord[], query: string, opts?: { preferSafe?: boolean }): RankedAsset[] {
  const tokens = tokenize(query);
  const ranked = assets
    .map((asset) => scoreAsset(asset, tokens, opts?.preferSafe ?? true))
    .filter((r) => r.score > 0 || tokens.length === 0)
    .sort((a, b) => b.score - a.score);
  if (tokens.length === 0) {
    return assets
      .map((asset) => scoreAsset(asset, [], opts?.preferSafe ?? true))
      .sort((a, b) => b.score - a.score);
  }
  return ranked;
}

function scoreAsset(asset: AssetRecord, tokens: string[], preferSafe: boolean): RankedAsset {
  const hay = tokenize([asset.title, asset.description, ...asset.tags].join(" "));
  const reasons: string[] = [];
  let score = 0;
  for (const t of tokens) {
    if (hay.includes(t)) {
      score += 3;
      reasons.push(`tag/text:${t}`);
    }
  }
  if (asset.claimSafe) {
    score += preferSafe ? 2 : 0.5;
    reasons.push("claim-safe");
  } else {
    score -= preferSafe ? 4 : 0;
    reasons.push("NOT claim-safe");
  }
  if (asset.source === "local" || asset.source === "drive" || asset.source === "r2") {
    score += 1;
    reasons.push("library (reuse before gen)");
  }
  return { asset, score, reasons };
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}
