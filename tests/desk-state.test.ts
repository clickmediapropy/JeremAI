import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { cmdBrief } from "../src/commands/brief.ts";
import { findProjectRoot } from "../src/lib/paths.ts";
import { readState } from "../src/desk/state.ts";

test("a missing library is empty and no sqlite file is created", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-state-"));
  const state = readState("aether-wellness", dataDir);
  assert.equal(existsSync(join(dataDir, "jeremai.sqlite")), false);
  assert.equal(state.brand?.name, "Aether Wellness");
  assert.equal(state.brand?.product, "Aether Daily Mineral");
  assert.equal(state.brand?.budget.capUsd, 25);
  assert.equal(state.brand?.budget.spentUsd, 0);
  assert.equal(state.brand?.budget.warn80, false);
  assert.equal(state.brand?.notes, null);
  assert.equal(state.brand?.library.fine, 0);
  assert.equal(state.brand?.library.heldBack, 0);
  assert.equal(state.brand?.notesPrefill, "fixtures/briefs/aether-morning.md");
});

test("after notes are added, the snapshot counts the seeded library", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-state-seed-"));
  const brief = join(findProjectRoot(), "fixtures", "briefs", "aether-morning.md");
  assert.equal(cmdBrief({ client: "aether-wellness", file: brief, dataDir }), 0);
  const state = readState("aether-wellness", dataDir);
  assert.equal(state.brand?.notes?.title.length ? true : false, true);
  assert.equal(state.brand?.library.fine, 4);
  assert.equal(state.brand?.library.heldBack, 1);
  assert.ok(state.brands.some((brand) => brand.name === "Aether Wellness"));
});

test("an unknown brand has no brand block", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-state-miss-"));
  const state = readState("not-a-brand", dataDir);
  assert.equal(state.brand, null);
});
