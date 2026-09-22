import assert from "node:assert/strict";
import { test } from "node:test";
import { buildArgs } from "../src/desk/argv.ts";

test("make-clip adds --confirm only when the sheet confirmed", () => {
  const stopped = buildArgs({
    step: "make-clip",
    brand: "aether-wellness",
    seconds: 5,
    backend: "runpod-h3",
    resolution: "768P",
  });
  assert.equal(stopped.ok, true);
  if (!stopped.ok) return;
  assert.deepEqual(stopped.args, [
    "generate",
    "--client",
    "aether-wellness",
    "--seconds",
    "5",
    "--backend",
    "runpod-h3",
    "--resolution",
    "768P",
  ]);
  assert.equal(stopped.args.includes("--confirm"), false);
  assert.equal(stopped.passDataDir, true);

  const confirmed = buildArgs({
    step: "make-clip",
    brand: "aether-wellness",
    seconds: 5,
    backend: "runpod-h3",
    resolution: "768P",
    confirm: true,
    countQuote: true,
  });
  assert.equal(confirmed.ok, true);
  if (!confirmed.ok) return;
  assert.equal(confirmed.args.includes("--confirm"), true);
  assert.equal(confirmed.args.includes("--simulate-spend"), true);
});

test("confirm on any other step is rejected", () => {
  const sneaked = buildArgs({ step: "write-script", brand: "aether-wellness", confirm: true });
  assert.equal(sneaked.ok, false);
  if (sneaked.ok) return;
  assert.equal(sneaked.sentence, "Stopped. Something on this step is not valid.");
});

test("unknown steps and practice", () => {
  const unknown = buildArgs({ step: "publish", brand: "aether-wellness" });
  assert.equal(unknown.ok, false);
  const practice = buildArgs({ step: "practice", brand: "aether-wellness" });
  assert.equal(practice.ok, true);
  if (!practice.ok) return;
  assert.deepEqual(practice.args, ["demo", "--client", "aether-wellness"]);
  assert.equal(practice.passDataDir, false);
});

test("the other steps map to the CLI", () => {
  const notes = buildArgs({
    step: "add-notes",
    brand: "aether-wellness",
    notesPath: "fixtures/briefs/aether-morning.md",
  });
  assert.equal(notes.ok, true);
  if (!notes.ok) return;
  assert.deepEqual(notes.args, [
    "brief",
    "--client",
    "aether-wellness",
    "--file",
    "fixtures/briefs/aether-morning.md",
  ]);
  const footage = buildArgs({ step: "find-footage", brand: "aether-wellness", footage: "morning kitchen" });
  assert.equal(footage.ok, true);
  if (!footage.ok) return;
  assert.deepEqual(footage.args.at(-1), "morning kitchen");
});
