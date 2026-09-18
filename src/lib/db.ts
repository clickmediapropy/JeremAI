import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import type {
  AssetRecord,
  BriefRecord,
  JobRecord,
  LedgerEntry,
  ScriptRecord,
} from "../types.ts";
import { resolveDataDir } from "./paths.ts";

export interface AppContext {
  db: DatabaseSync;
  dataDir: string;
}

export function openDb(dataDir?: string): AppContext {
  const dir = resolveDataDir(dataDir);
  const db = new DatabaseSync(join(dir, "jeremai.sqlite"));
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
  return { db, dataDir: dir };
}

function migrate(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS briefs (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT NOT NULL,
      source_path TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scripts (
      id TEXT PRIMARY KEY,
      brief_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      body TEXT NOT NULL,
      hooks_json TEXT NOT NULL,
      lint_json TEXT NOT NULL,
      lint_ok INTEGER NOT NULL,
      approved INTEGER NOT NULL DEFAULT 0,
      approved_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      duration_s REAL NOT NULL,
      claim_safe INTEGER NOT NULL,
      hash TEXT NOT NULL,
      uri TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      script_id TEXT,
      backend TEXT NOT NULL,
      seconds REAL NOT NULL,
      resolution TEXT NOT NULL,
      estimated_cost REAL NOT NULL,
      actual_cost REAL NOT NULL DEFAULT 0,
      dry_run INTEGER NOT NULL DEFAULT 1,
      confirmed INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      output_uri TEXT,
      reuse_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ledger (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      job_id TEXT,
      kind TEXT NOT NULL,
      amount_usd REAL NOT NULL,
      note TEXT NOT NULL,
      dry_run INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_assets_client ON assets(client_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_client ON ledger(client_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs(client_id);
  `);
}

export function insertBrief(db: DatabaseSync, row: BriefRecord): void {
  db.prepare(
    `INSERT INTO briefs (id, client_id, title, notes, source_path, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(row.id, row.clientId, row.title, row.notes, row.sourcePath, row.createdAt);
}

export function latestBrief(db: DatabaseSync, clientId: string): BriefRecord | null {
  const row = db
    .prepare(`SELECT * FROM briefs WHERE client_id = ? ORDER BY created_at DESC LIMIT 1`)
    .get(clientId) as Record<string, unknown> | undefined;
  return row ? mapBrief(row) : null;
}

export function getBrief(db: DatabaseSync, id: string): BriefRecord | null {
  const row = db.prepare(`SELECT * FROM briefs WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? mapBrief(row) : null;
}

export function insertScript(db: DatabaseSync, row: ScriptRecord): void {
  db.prepare(
    `INSERT INTO scripts (id, brief_id, client_id, body, hooks_json, lint_json, lint_ok, approved, approved_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    row.id,
    row.briefId,
    row.clientId,
    row.body,
    JSON.stringify(row.hooks),
    JSON.stringify(row.lint),
    row.lintOk ? 1 : 0,
    row.approved ? 1 : 0,
    row.approvedAt,
    row.createdAt,
  );
}

export function approveScript(db: DatabaseSync, id: string, at: string): void {
  db.prepare(`UPDATE scripts SET approved = 1, approved_at = ? WHERE id = ?`).run(at, id);
}

export function latestScript(db: DatabaseSync, clientId: string): ScriptRecord | null {
  const row = db
    .prepare(`SELECT * FROM scripts WHERE client_id = ? ORDER BY created_at DESC LIMIT 1`)
    .get(clientId) as Record<string, unknown> | undefined;
  return row ? mapScript(row) : null;
}

export function getScript(db: DatabaseSync, id: string): ScriptRecord | null {
  const row = db.prepare(`SELECT * FROM scripts WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? mapScript(row) : null;
}

export function insertAsset(db: DatabaseSync, row: AssetRecord): void {
  db.prepare(
    `INSERT OR REPLACE INTO assets
     (id, client_id, title, description, tags_json, duration_s, claim_safe, hash, uri, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    row.id,
    row.clientId,
    row.title,
    row.description,
    JSON.stringify(row.tags),
    row.durationS,
    row.claimSafe ? 1 : 0,
    row.hash,
    row.uri,
    row.source,
    row.createdAt,
  );
}

export function listAssets(db: DatabaseSync, clientId: string): AssetRecord[] {
  const rows = db.prepare(`SELECT * FROM assets WHERE client_id = ?`).all(clientId) as Record<
    string,
    unknown
  >[];
  return rows.map(mapAsset);
}

export function insertJob(db: DatabaseSync, row: JobRecord): void {
  db.prepare(
    `INSERT INTO jobs
     (id, client_id, script_id, backend, seconds, resolution, estimated_cost, actual_cost, dry_run, confirmed, status, output_uri, reuse_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    row.id,
    row.clientId,
    row.scriptId,
    row.backend,
    row.seconds,
    row.resolution,
    row.estimatedCostUsd,
    row.actualCostUsd,
    row.dryRun ? 1 : 0,
    row.confirmed ? 1 : 0,
    row.status,
    row.outputUri,
    JSON.stringify(row.reuseAssetIds),
    row.createdAt,
  );
}

export function updateJob(
  db: DatabaseSync,
  id: string,
  patch: Partial<Pick<JobRecord, "status" | "actualCostUsd" | "outputUri">>,
): void {
  const current = getJob(db, id);
  if (!current) throw new Error(`Job not found: ${id}`);
  db.prepare(`UPDATE jobs SET status = ?, actual_cost = ?, output_uri = ? WHERE id = ?`).run(
    patch.status ?? current.status,
    patch.actualCostUsd ?? current.actualCostUsd,
    patch.outputUri === undefined ? current.outputUri : patch.outputUri,
    id,
  );
}

export function latestJob(db: DatabaseSync, clientId: string): JobRecord | null {
  const row = db
    .prepare(`SELECT * FROM jobs WHERE client_id = ? ORDER BY created_at DESC LIMIT 1`)
    .get(clientId) as Record<string, unknown> | undefined;
  return row ? mapJob(row) : null;
}

export function getJob(db: DatabaseSync, id: string): JobRecord | null {
  const row = db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? mapJob(row) : null;
}

export function listJobs(db: DatabaseSync, clientId: string): JobRecord[] {
  const rows = db
    .prepare(`SELECT * FROM jobs WHERE client_id = ? ORDER BY created_at ASC`)
    .all(clientId) as Record<string, unknown>[];
  return rows.map(mapJob);
}

export function insertLedger(db: DatabaseSync, row: LedgerEntry): void {
  db.prepare(
    `INSERT INTO ledger (id, client_id, job_id, kind, amount_usd, note, dry_run, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(row.id, row.clientId, row.jobId, row.kind, row.amountUsd, row.note, row.dryRun ? 1 : 0, row.createdAt);
}

export function listLedger(db: DatabaseSync, clientId: string): LedgerEntry[] {
  const rows = db
    .prepare(`SELECT * FROM ledger WHERE client_id = ? ORDER BY created_at ASC`)
    .all(clientId) as Record<string, unknown>[];
  return rows.map(mapLedger);
}

function mapBrief(row: Record<string, unknown>): BriefRecord {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    title: String(row.title),
    notes: String(row.notes),
    sourcePath: row.source_path == null ? null : String(row.source_path),
    createdAt: String(row.created_at),
  };
}

function mapScript(row: Record<string, unknown>): ScriptRecord {
  return {
    id: String(row.id),
    briefId: String(row.brief_id),
    clientId: String(row.client_id),
    body: String(row.body),
    hooks: JSON.parse(String(row.hooks_json)) as string[],
    lint: JSON.parse(String(row.lint_json)),
    lintOk: Boolean(row.lint_ok),
    approved: Boolean(row.approved),
    approvedAt: row.approved_at == null ? null : String(row.approved_at),
    createdAt: String(row.created_at),
  };
}

function mapAsset(row: Record<string, unknown>): AssetRecord {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    title: String(row.title),
    description: String(row.description),
    tags: JSON.parse(String(row.tags_json)) as string[],
    durationS: Number(row.duration_s),
    claimSafe: Boolean(row.claim_safe),
    hash: String(row.hash),
    uri: String(row.uri),
    source: row.source as AssetRecord["source"],
    createdAt: String(row.created_at),
  };
}

function mapJob(row: Record<string, unknown>): JobRecord {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    scriptId: row.script_id == null ? null : String(row.script_id),
    backend: row.backend as JobRecord["backend"],
    seconds: Number(row.seconds),
    resolution: row.resolution as JobRecord["resolution"],
    estimatedCostUsd: Number(row.estimated_cost),
    actualCostUsd: Number(row.actual_cost),
    dryRun: Boolean(row.dry_run),
    confirmed: Boolean(row.confirmed),
    status: row.status as JobRecord["status"],
    outputUri: row.output_uri == null ? null : String(row.output_uri),
    reuseAssetIds: JSON.parse(String(row.reuse_json ?? "[]")) as string[],
    createdAt: String(row.created_at),
  };
}

function mapLedger(row: Record<string, unknown>): LedgerEntry {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    jobId: row.job_id == null ? null : String(row.job_id),
    kind: row.kind as LedgerEntry["kind"],
    amountUsd: Number(row.amount_usd),
    note: String(row.note),
    dryRun: Boolean(row.dry_run),
    createdAt: String(row.created_at),
  };
}
