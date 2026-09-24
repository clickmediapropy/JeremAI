import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { pickVisionModels } from "../src/desk/openrouter.ts";
import { startDesk } from "../src/desk/server.ts";

test("vision list keeps the ten newest frontier text-and-image models", () => {
  const models = [
    model("stealth/space-bunny-alpha", 900),
    model("openai/gpt-6-sol:batch", 800),
    model("x-ai/grok-4.7", 700),
    model("openai/gpt-6-luna", 690),
    model("anthropic/claude-opus-5.5", 680),
    model("google/gemini-3.8-flash", 670),
    model("x-ai/grok-4.6", 660),
    model("openai/gpt-5.6-sol", 650),
    model("anthropic/claude-opus-5", 640),
    model("google/gemini-3.7-flash", 630),
    model("openai/gpt-5.5", 620),
    model("google/gemini-3.5-flash", 610),
    model("anthropic/claude-sonnet-4", 20, ["text"]),
  ];
  const picked = pickVisionModels(models);
  assert.equal(picked.length, 10);
  assert.equal(picked[0]?.id, "x-ai/grok-4.7");
  assert.equal(picked.some((item) => item.id.includes("space-bunny")), false);
  assert.equal(picked.some((item) => item.id.endsWith(":batch")), false);
  assert.equal(picked.some((item) => item.id === "anthropic/claude-sonnet-4"), false);
});

test("fill with ai writes footage words and does not reveal the key", async () => {
  const dir = mkdtempSync(join(tmpdir(), "jeremai-fill-"));
  const envPath = join(dir, ".env");
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-desk-"));
  writeFileSync(envPath, "OPENROUTER_API_KEY=sk-test-secret\n");
  const catalog = {
    data: [
      model("x-ai/grok-4.7", 700),
      model("openai/gpt-6-luna", 690),
    ],
  };
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/models")) return Response.json(catalog);
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("authorization"), "Bearer sk-test-secret");
    return Response.json({
      choices: [{ message: { content: '{"footage":"morning kitchen scoop"}' } }],
    });
  };
  const desk = await startDesk({ port: 0, dataDir, envPath, fetchImpl });
  try {
    const models = await fetch(`http://127.0.0.1:${desk.port}/api/models`);
    const listed = (await models.json()) as { models: { id: string }[]; selected: string };
    assert.equal(listed.selected, "x-ai/grok-4.7");
    assert.equal(JSON.stringify(listed).includes("sk-test-secret"), false);

    const filled = await fetch(`http://127.0.0.1:${desk.port}/api/fill`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brand: "aether-wellness", step: "find-footage", model: "x-ai/grok-4.7" }),
    });
    const body = (await filled.json()) as { sentence: string; footage: string };
    assert.equal(filled.status, 200);
    assert.equal(body.footage, "morning kitchen scoop");
    assert.equal(JSON.stringify(body).includes("sk-test-secret"), false);

    const idle = await fetch(`http://127.0.0.1:${desk.port}/api/fill`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brand: "aether-wellness", step: "set-up", model: "x-ai/grok-4.7" }),
    });
    const idleBody = (await idle.json()) as { sentence: string };
    assert.equal(idleBody.sentence, "Nothing to type on this step.");
  } finally {
    await desk.close();
  }
});

function model(id: string, created: number, input: string[] = ["text", "image"]) {
  return {
    id,
    name: id,
    created,
    architecture: { input_modalities: input, output_modalities: ["text"] },
  };
}
