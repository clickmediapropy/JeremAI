export const BACKENDS = ["runpod-h3", "minimax-h3-api"] as const;
export type BackendId = (typeof BACKENDS)[number];

export const RESOLUTIONS = ["768P", "2K"] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

export interface ClientConfig {
  id: string;
  name: string;
  product: string;
  vertical: string;
  budgetCapUsd: number;
  claimsPolicyPath: string;
  brandPath: string;
  policiesPath: string;
  driveUri: string;
  r2Uri: string;
  preferredBackend: BackendId;
  retriesBuffer: number;
}

export interface ClaimsPolicy {
  product: string;
  disclaimer: string;
  allowedClaims: string[];
  bannedPatterns: { id: string; pattern: string; reason: string; severity: "fail" | "warn" }[];
  bannedTerms: { term: string; reason: string }[];
}

export interface BriefRecord {
  id: string;
  clientId: string;
  title: string;
  notes: string;
  sourcePath: string | null;
  createdAt: string;
}

export interface ScriptRecord {
  id: string;
  briefId: string;
  clientId: string;
  body: string;
  hooks: string[];
  lint: LintReport;
  lintOk: boolean;
  approved: boolean;
  approvedAt: string | null;
  createdAt: string;
}

export interface AssetRecord {
  id: string;
  clientId: string;
  title: string;
  description: string;
  tags: string[];
  durationS: number;
  claimSafe: boolean;
  hash: string;
  uri: string;
  source: "drive" | "r2" | "local" | "generated";
  createdAt: string;
}

export interface JobRecord {
  id: string;
  clientId: string;
  scriptId: string | null;
  backend: BackendId;
  seconds: number;
  resolution: Resolution;
  estimatedCostUsd: number;
  actualCostUsd: number;
  dryRun: boolean;
  confirmed: boolean;
  status: "estimated" | "refused" | "dry_run" | "assembled" | "failed";
  outputUri: string | null;
  reuseAssetIds: string[];
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  clientId: string;
  jobId: string | null;
  kind: "estimate" | "actual" | "hold";
  amountUsd: number;
  note: string;
  dryRun: boolean;
  createdAt: string;
}

export interface LintHit {
  id: string;
  severity: "fail" | "warn";
  excerpt: string;
  reason: string;
}

export interface LintReport {
  ok: boolean;
  hits: LintHit[];
  usedClaims: string[];
  unknownClaimLines: string[];
}

export interface CostEstimate {
  backend: BackendId;
  model: string;
  seconds: number;
  resolution: Resolution;
  unitRateUsd: number;
  unitLabel: string;
  baseCostUsd: number;
  retriesBuffer: number;
  estimatedCostUsd: number;
  remainingBudgetUsd: number;
  capUsd: number;
  usedUsd: number;
  usedPct: number;
  warn80: boolean;
  hardStop: boolean;
  wouldExceedCap: boolean;
  note: string;
}

export interface BackendQuote {
  backend: BackendId;
  model: string;
  resolution: Resolution;
  seconds: number;
  unitRateUsd: number;
  unitLabel: string;
  baseCostUsd: number;
  ceilingNote: string;
}

export const EXIT = {
  ok: 0,
  usage: 1,
  needsConfirm: 2,
  budget: 3,
  compliance: 4,
  notFound: 5,
} as const;
