import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import yaml from "js-yaml";
import { z } from "zod";
import type { AssetRecord } from "../types.ts";
import { insertAsset, listAssets } from "./db.ts";
import { nowIso, sha256Short } from "./ids.ts";
import { findProjectRoot } from "./paths.ts";

const seedSchema = z.object({
  assets: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      tags: z.array(z.string()),
      duration_s: z.number(),
      claim_safe: z.boolean(),
      uri: z.string(),
      source: z.enum(["drive", "r2", "local", "generated"]),
    }),
  ),
});

export function seedClientLibrary(db: DatabaseSync, clientId: string): number {
  const existing = listAssets(db, clientId);
  if (existing.length > 0) return 0;
  const path = join(findProjectRoot(), "fixtures", "broll", `${clientId}.yaml`);
  if (!existsSync(path)) return 0;
  const parsed = seedSchema.parse(yaml.load(readFileSync(path, "utf8")));
  const at = nowIso();
  for (const a of parsed.assets) {
    const row: AssetRecord = {
      id: a.id,
      clientId,
      title: a.title,
      description: a.description,
      tags: a.tags,
      durationS: a.duration_s,
      claimSafe: a.claim_safe,
      hash: sha256Short(`${a.id}:${a.uri}`),
      uri: a.uri,
      source: a.source,
      createdAt: at,
    };
    insertAsset(db, row);
  }
  return parsed.assets.length;
}
