import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { startDesk } from "../src/desk/server.ts";

test("the desk binds this computer and an unconfirmed clip stops", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-desk-"));
  const desk = await startDesk({ port: 0, dataDir });
  assert.equal(desk.host, "127.0.0.1");
  try {
    const stopped = await fetch(`http://127.0.0.1:${desk.port}/api/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        step: "make-clip",
        brand: "aether-wellness",
        seconds: 5,
        backend: "runpod-h3",
        resolution: "768P",
      }),
    });
    const body = (await stopped.json()) as { exitCode: number; sentence: string };
    assert.equal(stopped.status, 200);
    assert.equal(body.exitCode, 2);
    assert.equal(body.sentence, "Stopped on purpose. Making a clip needs a confirmation. Nothing was spent.");

    let calls = 0;
    const guarded = await startDesk({
      port: 0,
      dataDir,
      spawn: async () => {
        calls += 1;
        return { code: 0, stdout: "", stderr: "" };
      },
    });
    try {
      const rejected = await fetch(`http://127.0.0.1:${guarded.port}/api/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step: "publish", brand: "aether-wellness" }),
      });
      const rejectedBody = (await rejected.json()) as { sentence: string };
      assert.equal(rejected.status, 400);
      assert.equal(rejectedBody.sentence, "Stopped. Something on this step is not valid.");
      assert.equal(calls, 0);
    } finally {
      await guarded.close();
    }

    const state = await fetch(`http://127.0.0.1:${desk.port}/api/state?brand=aether-wellness`);
    const snapshot = (await state.json()) as { brand: { name: string } };
    assert.equal(state.status, 200);
    assert.equal(snapshot.brand.name, "Aether Wellness");

    const missing = await fetch(`http://127.0.0.1:${desk.port}/api/state?brand=not-a-brand`);
    const missingBody = (await missing.json()) as { sentence: string };
    assert.equal(missing.status, 404);
    assert.equal(missingBody.sentence, "That brand is not on this computer.");
  } finally {
    await desk.close();
  }
});
