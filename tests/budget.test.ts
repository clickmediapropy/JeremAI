import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { parseBackend } from "../src/lib/backends/registry.ts";
import { budgetGate, billedUsd, buildEstimate } from "../src/lib/budget.ts";
import { loadClient } from "../src/lib/config.ts";
import { insertLedger, openDb } from "../src/lib/db.ts";

function scratch() {
  return mkdtempSync(join(tmpdir(), "jeremai-"));
}

test("parseBackend accepts fal alias and rejects junk", () => {
  assert.equal(parseBackend("fal"), "fal-ai");
  assert.equal(parseBackend("FAL-AI"), "fal-ai");
  assert.throws(() => parseBackend("kling"), /Unknown backend/);
});

test("runpod 5s quote is $0.17 before retries buffer", () => {
  const { db } = openDb(scratch());
  const client = loadClient("aether-wellness");
  const est = buildEstimate(db, { ...client, retriesBuffer: 1 }, { seconds: 5, backend: "runpod-h3" });
  assert.equal(est.baseCostUsd, 0.17);
  assert.equal(est.estimatedCostUsd, 0.17);
});

test("fal-ai alias quotes H3 Max Turbo $0.20 / 5s @768P", () => {
  const { db } = openDb(scratch());
  const client = loadClient("aether-wellness");
  const est = buildEstimate(db, { ...client, retriesBuffer: 1 }, {
    seconds: 5,
    backend: "fal",
    resolution: "768P",
  });
  assert.equal(est.backend, "fal-ai");
  assert.equal(est.baseCostUsd, 0.2);
  assert.equal(est.estimatedCostUsd, 0.2);
  assert.match(est.model, /h3-max-turbo/);
});

test("minimax API 5s 768P quote is the $0.40 ceiling", () => {
  const { db } = openDb(scratch());
  const client = loadClient("aether-wellness");
  const est = buildEstimate(db, { ...client, retriesBuffer: 1 }, {
    seconds: 5,
    backend: "minimax-h3-api",
    resolution: "768P",
  });
  assert.equal(est.baseCostUsd, 0.4);
});

test("soft-warn at 80% and hard-stop at 100%", () => {
  const { db } = openDb(scratch());
  const client = { ...loadClient("aether-wellness"), budgetCapUsd: 10, retriesBuffer: 1 };
  insertLedger(db, {
    id: "led_80",
    clientId: client.id,
    jobId: null,
    kind: "actual",
    amountUsd: 8,
    note: "sim",
    dryRun: false,
    createdAt: new Date().toISOString(),
  });
  const warn = buildEstimate(db, client, { seconds: 5, backend: "runpod-h3" });
  assert.equal(warn.warn80, true);
  assert.equal(warn.hardStop, false);
  assert.equal(budgetGate(warn).ok, true);

  insertLedger(db, {
    id: "led_100",
    clientId: client.id,
    jobId: null,
    kind: "actual",
    amountUsd: 2,
    note: "sim",
    dryRun: false,
    createdAt: new Date().toISOString(),
  });
  assert.equal(billedUsd(db, client.id), 10);
  const stop = buildEstimate(db, client, { seconds: 5, backend: "runpod-h3" });
  assert.equal(stop.hardStop, true);
  assert.equal(budgetGate(stop).ok, false);
});

test("dry-run actuals do not consume the cap", () => {
  const { db } = openDb(scratch());
  const client = loadClient("aether-wellness");
  insertLedger(db, {
    id: "led_dry",
    clientId: client.id,
    jobId: null,
    kind: "actual",
    amountUsd: 25,
    note: "dry",
    dryRun: true,
    createdAt: new Date().toISOString(),
  });
  assert.equal(billedUsd(db, client.id), 0);
});
