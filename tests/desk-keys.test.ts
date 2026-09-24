import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { startDesk } from "../src/desk/server.ts";

test("keys are saved without being sent back", async () => {
  const dir = mkdtempSync(join(tmpdir(), "jeremai-keys-"));
  const envPath = join(dir, ".env");
  writeFileSync(envPath, "# keep me\nJEREMAI_ALLOW_SPEND=0\n");
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-desk-"));
  const desk = await startDesk({ port: 0, dataDir, envPath });
  try {
    const saved = await fetch(`http://127.0.0.1:${desk.port}/api/keys`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ env: "FAL_KEY", value: "fal-secret-value" }),
    });
    const body = (await saved.json()) as { sentence: string; keys: { env: string; set: boolean }[] };
    assert.equal(saved.status, 200);
    assert.equal(body.sentence, "fal.ai key saved on this computer.");
    assert.equal(JSON.stringify(body).includes("fal-secret-value"), false);
    assert.equal(body.keys.find((key) => key.env === "FAL_KEY")?.set, true);
    assert.equal(body.keys.find((key) => key.env === "RUNPOD_API_KEY")?.set, false);

    const file = readFileSync(envPath, "utf8");
    assert.match(file, /# keep me/);
    assert.match(file, /JEREMAI_ALLOW_SPEND=0/);
    assert.match(file, /FAL_KEY=fal-secret-value/);

    const listed = await fetch(`http://127.0.0.1:${desk.port}/api/keys`);
    const listedBody = await listed.text();
    assert.equal(listedBody.includes("fal-secret-value"), false);

    const empty = await fetch(`http://127.0.0.1:${desk.port}/api/keys`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ env: "RUNPOD_API_KEY", value: "  " }),
    });
    assert.equal(empty.status, 400);
    assert.equal(readFileSync(envPath, "utf8").includes("RUNPOD_API_KEY"), false);

    const page = await fetch(`http://127.0.0.1:${desk.port}/`);
    const html = await page.text();
    assert.match(html, /npx skills add runpod\/runpod-plugins-official/);
    assert.match(html, /brew install runpod\/runpodctl\/runpodctl/);
    assert.match(html, /curl -sSL https:\/\/cli\.runpod\.net \| bash/);
    assert.match(html, /curl https:\/\/genmedia\.sh\/install -fsS \| bash/);
    assert.match(html, /genmedia init/);
    assert.match(html, /pip install fal/);
  } finally {
    await desk.close();
  }
});
