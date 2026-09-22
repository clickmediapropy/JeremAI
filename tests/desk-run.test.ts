import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createRunner, type SpawnFn } from "../src/desk/run.ts";

function hold(): { spawn: SpawnFn; release: () => void } {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const spawn: SpawnFn = async () => {
    await gate;
    return { code: 0, stdout: "", stderr: "" };
  };
  return { spawn, release };
}

test("a second run does not start while the first is still going", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-run-"));
  const runner = createRunner();
  const held = hold();
  const first = runner.runStep(
    { step: "spending", brand: "aether-wellness" },
    { dataDir, spawn: held.spawn },
  );
  const second = await runner.runStep(
    { step: "spending", brand: "aether-wellness" },
    { dataDir, spawn: held.spawn },
  );
  assert.equal("busy" in second && second.busy, true);
  if ("busy" in second) assert.equal(second.sentence, "Still working on the last step.");
  held.release();
  const done = await first;
  assert.equal("exitCode" in done, true);
});

test("an unknown step never spawns", async () => {
  let calls = 0;
  const spawn: SpawnFn = async () => {
    calls += 1;
    return { code: 0, stdout: "", stderr: "" };
  };
  const result = await createRunner().runStep(
    { step: "publish", brand: "aether-wellness" },
    { dataDir: mkdtempSync(join(tmpdir(), "jeremai-run-nope-")), spawn },
  );
  assert.equal(calls, 0);
  assert.equal("exitCode" in result && result.exitCode, 1);
  if ("exitCode" in result) assert.equal(result.sentence, "Stopped. Something on this step is not valid.");
});

test("exit 2 keeps the stop headline and does not send --confirm", async () => {
  let args: string[] = [];
  const spawn: SpawnFn = async (argv) => {
    args = argv;
    return { code: 2, stdout: "", stderr: "refused" };
  };
  const result = await createRunner().runStep(
    {
      step: "make-clip",
      brand: "aether-wellness",
      seconds: 5,
      backend: "runpod-h3",
      resolution: "768P",
    },
    { dataDir: mkdtempSync(join(tmpdir(), "jeremai-run-stop-")), spawn },
  );
  assert.equal(args.includes("--confirm"), false);
  if ("exitCode" in result) {
    assert.equal(result.exitCode, 2);
    assert.equal(result.sentence, "Stopped on purpose. Making a clip needs a confirmation. Nothing was spent.");
    assert.equal(result.stderr, "refused");
  }
});
