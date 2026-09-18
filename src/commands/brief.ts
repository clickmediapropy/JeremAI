import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadClient } from "../lib/config.ts";
import { insertBrief, openDb } from "../lib/db.ts";
import { nowIso, shortId } from "../lib/ids.ts";
import { hr, kv, ok } from "../lib/print.ts";
import { seedClientLibrary } from "../lib/seed.ts";

export function cmdBrief(opts: { client: string; file: string; title?: string; dataDir?: string }): number {
  const client = loadClient(opts.client);
  const { db } = openDb(opts.dataDir);
  seedClientLibrary(db, client.id);
  const abs = resolve(opts.file);
  const notes = readFileSync(abs, "utf8");
  const title = opts.title || firstHeading(notes) || `${client.name} brief`;
  const row = {
    id: shortId("brief"),
    clientId: client.id,
    title,
    notes,
    sourcePath: abs,
    createdAt: nowIso(),
  };
  insertBrief(db, row);
  hr("brief ingested");
  kv("id", row.id);
  kv("client", `${client.name} (${client.id})`);
  kv("title", title);
  kv("source", abs);
  kv("chars", notes.length);
  ok("Human 10–15% input captured. Next: search-broll, then script.");
  return 0;
}

function firstHeading(text: string): string | null {
  const m = text.match(/^#\s+(.+)$/m);
  return m?.[1]?.trim() || null;
}
