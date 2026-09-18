import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { cmdAssemble } from "../src/commands/assemble.ts";
import { cmdBrief } from "../src/commands/brief.ts";
import { cmdCost } from "../src/commands/cost.ts";
import { cmdEstimate } from "../src/commands/estimate.ts";
import { cmdGenerate } from "../src/commands/generate.ts";
import { cmdScript } from "../src/commands/script.ts";
import { cmdSearchBroll } from "../src/commands/search-broll.ts";
import { findProjectRoot } from "../src/lib/paths.ts";
import { EXIT } from "../src/types.ts";

test("confirm gate, then dry generate + assemble", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-pipe-"));
  const brief = join(findProjectRoot(), "fixtures", "briefs", "aether-morning.md");
  const client = "aether-wellness";

  assert.equal(cmdBrief({ client, file: brief, dataDir }), 0);
  assert.equal(cmdSearchBroll({ client, query: "kitchen scoop", dataDir }), 0);
  assert.equal(cmdScript({ client, approve: true, dataDir }), 0);
  assert.equal(cmdEstimate({ client, seconds: 5, backend: "runpod-h3", dataDir }), 0);

  assert.equal(cmdGenerate({ client, seconds: 5, dataDir }), EXIT.needsConfirm);

  assert.equal(cmdGenerate({ client, seconds: 5, confirm: true, dataDir }), 0);
  assert.equal(cmdAssemble({ client, dataDir }), 0);
  assert.equal(cmdCost({ client, dataDir }), 0);
});

test("generate refuses an unapproved script even with --confirm", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-unapp-"));
  const brief = join(findProjectRoot(), "fixtures", "briefs", "aether-morning.md");
  const client = "aether-wellness";
  assert.equal(cmdBrief({ client, file: brief, dataDir }), 0);
  assert.equal(cmdScript({ client, approve: false, dataDir }), 0);
  assert.equal(cmdGenerate({ client, confirm: true, dataDir }), EXIT.compliance);
});
