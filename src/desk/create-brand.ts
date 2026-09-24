import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { clientsRoot } from "../lib/paths.ts";

const DISCLAIMER =
  "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.";

const BANNED_PATTERNS = [
  { id: "cure-language", pattern: "\\bcure[sd]?\\b", reason: "Disease-treatment language. FTC + FDA risk.", severity: "fail" },
  { id: "treat-language", pattern: "\\btreat(s|ment|ing)?\\b", reason: "Treatment claim. Not a structure/function statement.", severity: "fail" },
  { id: "prevent-disease", pattern: "\\bprevent(s|ing|ion)?\\b", reason: "Prevention claims need drug-level substantiation.", severity: "fail" },
  { id: "diagnose", pattern: "\\bdiagnos(e|es|ed|ing|is)\\b", reason: "Diagnostic claim.", severity: "fail" },
  { id: "before-after", pattern: "before\\s*[/&-]?\\s*after", reason: "Meta Health & Wellness frequently rejects before/after in this category.", severity: "fail" },
  { id: "guaranteed", pattern: "\\bguarantee[ds]?\\b", reason: "Outcome guarantee.", severity: "fail" },
  { id: "miracle", pattern: "\\bmiracle\\b", reason: "Hype / typicality risk.", severity: "fail" },
  { id: "pounds", pattern: "lose\\s+\\d+\\s*(lb|lbs|pounds|kgs?)", reason: "Specific weight-loss claim.", severity: "fail" },
  { id: "fda-approved", pattern: "fda\\s+approved", reason: "False regulatory endorsement unless the specific claim is substantiated and allowlisted.", severity: "fail" },
  { id: "doctor-recommended", pattern: "doctors?\\s+recommend", reason: "Expert endorsement needs substantiation + typicality.", severity: "warn" },
];

const BANNED_TERMS = [
  { term: "cancer", reason: "Disease claim." },
  { term: "diabetes", reason: "Disease claim." },
  { term: "alzheimer", reason: "Disease claim." },
  { term: "covid", reason: "Disease claim." },
  { term: "erectile", reason: "High-risk sexual-health claim for a wellness pilot." },
  { term: "anxiety", reason: "Mental-health disease-adjacent; not on this client's allowlist." },
  { term: "depression", reason: "Mental-health disease-adjacent; not on this client's allowlist." },
];

export interface NewBrandInput {
  name: string;
  product: string;
  budgetCapUsd: number;
  allowedClaims: string[];
}

export type CreateBrandResult =
  | { ok: true; id: string; sentence: string }
  | { ok: false; sentence: string };

export function slugBrand(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createBrand(input: NewBrandInput, root?: string): CreateBrandResult {
  const name = input.name.trim();
  const product = input.product.trim();
  const claims = input.allowedClaims.map((line) => line.trim()).filter(Boolean);
  const id = slugBrand(name);
  if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    return { ok: false, sentence: "Add a brand name." };
  }
  if (!product) return { ok: false, sentence: "Add a product." };
  if (!Number.isFinite(input.budgetCapUsd) || input.budgetCapUsd <= 0) {
    return { ok: false, sentence: "The budget has to be more than zero." };
  }
  if (claims.length === 0) return { ok: false, sentence: "Add at least one claim." };

  const dir = join(clientsRoot(root), id);
  if (existsSync(dir)) return { ok: false, sentence: "That name is already a brand." };

  mkdirSync(dir, { recursive: true });
  const config = {
    id,
    name,
    product,
    vertical: "general-wellness",
    budget_cap_usd: input.budgetCapUsd,
    claims_policy: "claims-allowlist.yaml",
    brand: "brand.md",
    policies: "policies.md",
    drive_uri: `gdrive://${id}/Creative/Footage`,
    r2_uri: `r2://${id}-cache/working`,
    preferred_backend: "runpod-h3",
    retries_buffer: 1.2,
  };
  writeFileSync(join(dir, "config.yaml"), yaml.dump(config, { lineWidth: 100 }));
  writeFileSync(
    join(dir, "claims-allowlist.yaml"),
    yaml.dump(
      {
        product,
        disclaimer: DISCLAIMER,
        allowed_claims: claims,
        banned_patterns: BANNED_PATTERNS,
        banned_terms: BANNED_TERMS,
      },
      { lineWidth: 120 },
    ),
  );
  writeFileSync(
    join(dir, "brand.md"),
    `# ${name} — brand kit\n\nProduct: ${product}.\n\nThe script may only use claims on \`claims-allowlist.yaml\`.\n`,
  );
  writeFileSync(join(dir, "policies.md"), policies(name));
  return { ok: true, id, sentence: `${name} is ready.` };
}

function policies(name: string): string {
  return `# ${name} — spend & publish policies

1. **Search B-roll first.** Drive vault + R2 working set + SQLite index. Do not generate a shot that already exists and is claim-safe.
2. **Claims lint is blocking.** Deterministic allowlist. No model override.
3. **Human approve script** before any render job is created.
4. **Confirm-before-spend.** \`estimate\` then \`generate --confirm\`. Soft-warn 80%, hard-stop 100% of \`budget_cap_usd\`.
5. **Dry-run by default.** Stubs only in this MVP. No MiniMax paygo. No RunPod GPU rental.
6. **Never auto-publish.** Assemble writes a Premiere/CapCut handoff. A human posts to Meta/Google after account review.
7. **Substantiation lives outside the model.** If a claim is not on the allowlist, it does not ship — even if a winning ad used stronger language.
`;
}
