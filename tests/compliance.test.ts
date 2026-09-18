import assert from "node:assert/strict";
import { test } from "node:test";
import { loadClaimsPolicy, loadClient } from "../src/lib/config.ts";
import { lintScript } from "../src/lib/compliance.ts";
import { draftScript } from "../src/lib/scriptgen.ts";

const client = loadClient("aether-wellness");
const policy = loadClaimsPolicy(client);

test("stock draft script passes lint and uses allowlisted claims", () => {
  const draft = draftScript(client, {
    id: "brief_test",
    clientId: client.id,
    title: "unit",
    notes: "keep it ritual",
    sourcePath: null,
    createdAt: new Date().toISOString(),
  }, policy);
  const report = lintScript(draft.body, policy);
  assert.equal(report.ok, true, JSON.stringify(report.hits, null, 2));
  assert.ok(report.usedClaims.length >= 1);
});

test("disease / treat language fails", () => {
  const text = [
    `VO: Aether Daily Mineral treats diabetes overnight.`,
    `SUPER: ${policy.disclaimer}`,
  ].join("\n");
  const report = lintScript(text, policy);
  assert.equal(report.ok, false);
  const ids = report.hits.map((h) => h.id);
  assert.ok(ids.includes("treat-language") || ids.includes("term:diabetes"));
});

test("unlisted claim-like VO fails even without banned words", () => {
  const text = [
    `VO: This powder boosts your metabolism in seven days.`,
    `SUPER: ${policy.disclaimer}`,
  ].join("\n");
  const report = lintScript(text, policy);
  assert.equal(report.ok, false);
  assert.ok(report.hits.some((h) => h.id === "unlisted-claim"));
});

test("missing disclaimer fails", () => {
  const report = lintScript("VO: supports daily energy", policy);
  assert.equal(report.ok, false);
  assert.ok(report.hits.some((h) => h.id === "missing-disclaimer"));
});
