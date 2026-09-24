import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildEstimate } from "../src/lib/budget.ts";
import { loadClient } from "../src/lib/config.ts";
import { listAssets, openDb } from "../src/lib/db.ts";
import { seedClientLibrary } from "../src/lib/seed.ts";
import { footageSentence, priceSentence, stopSentence, successSentence } from "../src/desk/sentences.ts";

test("stop headlines match the exit codes", () => {
  assert.equal(
    stopSentence(2),
    "Stopped on purpose. Making a clip needs a confirmation. Nothing was spent.",
  );
  assert.equal(stopSentence(3), "Stopped. This would pass the brand’s budget.");
  assert.equal(
    stopSentence(4),
    "Stopped. The script is not approved, or it says something this brand is not allowed to say.",
  );
  assert.equal(stopSentence(5), "Stopped. Add the notes, write the script, or make the clip first.");
  assert.equal(stopSentence(1), "Stopped. Something on this step is not valid.");
  assert.equal(stopSentence(0), null);
});

test("bathroom scale is held back only when the footage words match it", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-sentence-"));
  const { db } = openDb(dataDir);
  seedClientLibrary(db, "aether-wellness");
  const assets = listAssets(db, "aether-wellness");
  const scale = footageSentence(assets, "bathroom scale");
  assert.match(scale, /Bathroom scale before\/after wall/);
  const morning = footageSentence(assets, "morning kitchen");
  assert.equal(morning.includes("Bathroom scale"), false);
  assert.match(morning, /clips are fine to use in an ad/);
  const blank = footageSentence(assets, "");
  assert.equal(blank.includes("Bathroom scale"), false);
});

test("empty library and a price quote", () => {
  assert.equal(
    footageSentence([], "morning kitchen"),
    "This brand has no clips yet. You can still check the price before making a clip.",
  );
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-price-"));
  const { db } = openDb(dataDir);
  const client = loadClient("aether-wellness");
  const estimate = buildEstimate(db, client, { seconds: 5, backend: "runpod-h3", resolution: "768P" });
  assert.equal(
    priceSentence(estimate),
    "About $0.2040 for 5 seconds. $0.0000 of $25.0000 is spent. Nothing was charged.",
  );
});

test("success headlines for the steps that do not search", () => {
  assert.equal(
    successSentence("set-up", { brandName: "Aether Wellness" }),
    "The library for Aether Wellness is ready.",
  );
  assert.equal(successSentence("add-notes", { brandName: "Aether Wellness" }), "Notes added.");
  assert.equal(
    successSentence("make-clip", { brandName: "Aether Wellness", countQuote: false }),
    "Practice clip is ready. $0 was spent.",
  );
  assert.equal(
    successSentence("make-clip", { brandName: "Aether Wellness", countQuote: true }),
    "Practice clip is ready. The quote was counted against the budget.",
  );
  assert.equal(
    successSentence("rough-cut", { brandName: "Aether Wellness" }),
    "Rough cut is ready for the editor. The ad was not posted.",
  );
  assert.equal(
    successSentence("spending", { brandName: "Aether Wellness", spentUsd: 0, capUsd: 25 }),
    "Spent $0.0000 of $25.0000.",
  );
  assert.equal(
    successSentence("practice", { brandName: "Aether Wellness" }),
    "Practice run finished. A clip request without confirmation stopped on purpose, then practice clips were made. Nothing was posted.",
  );
});
