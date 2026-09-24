import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import { BACKENDS, type ClaimsPolicy, type ClientConfig } from "../types.ts";
import { clientDir, clientsRoot } from "./paths.ts";

const clientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  product: z.string().min(1),
  vertical: z.string().min(1),
  budget_cap_usd: z.number().positive(),
  claims_policy: z.string().min(1),
  brand: z.string().min(1),
  policies: z.string().min(1),
  drive_uri: z.string().min(1),
  r2_uri: z.string().min(1),
  preferred_backend: z.enum(BACKENDS),
  retries_buffer: z.number().min(1).max(3).default(1.2),
});

const claimsSchema = z.object({
  product: z.string(),
  disclaimer: z.string(),
  allowed_claims: z.array(z.string()),
  banned_patterns: z.array(
    z.object({
      id: z.string(),
      pattern: z.string(),
      reason: z.string(),
      severity: z.enum(["fail", "warn"]).default("fail"),
    }),
  ),
  banned_terms: z.array(z.object({ term: z.string(), reason: z.string() })),
});

export function listClients(root?: string): string[] {
  const dir = clientsRoot(root);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, "config.yaml")))
    .map((d) => d.name)
    .sort();
}

export function loadClient(clientId: string, root?: string): ClientConfig {
  const dir = clientDir(clientId, root);
  const path = join(dir, "config.yaml");
  if (!existsSync(path)) {
    const known = listClients(root);
    throw new Error(
      `Unknown client "${clientId}". Known: ${known.length ? known.join(", ") : "(none)"}.`,
    );
  }
  const raw = yaml.load(readFileSync(path, "utf8"));
  const parsed = clientSchema.parse(raw);
  return {
    id: parsed.id,
    name: parsed.name,
    product: parsed.product,
    vertical: parsed.vertical,
    budgetCapUsd: parsed.budget_cap_usd,
    claimsPolicyPath: join(dir, parsed.claims_policy),
    brandPath: join(dir, parsed.brand),
    policiesPath: join(dir, parsed.policies),
    driveUri: parsed.drive_uri,
    r2Uri: parsed.r2_uri,
    preferredBackend: parsed.preferred_backend,
    retriesBuffer: parsed.retries_buffer,
  };
}

export function loadClaimsPolicy(client: ClientConfig): ClaimsPolicy {
  if (!existsSync(client.claimsPolicyPath)) {
    throw new Error(`Claims policy missing: ${client.claimsPolicyPath}`);
  }
  const raw = yaml.load(readFileSync(client.claimsPolicyPath, "utf8"));
  const parsed = claimsSchema.parse(raw);
  return {
    product: parsed.product,
    disclaimer: parsed.disclaimer,
    allowedClaims: parsed.allowed_claims,
    bannedPatterns: parsed.banned_patterns,
    bannedTerms: parsed.banned_terms,
  };
}

export function loadBrand(client: ClientConfig): string {
  return existsSync(client.brandPath) ? readFileSync(client.brandPath, "utf8") : "";
}
