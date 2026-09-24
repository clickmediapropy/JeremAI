import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { filterToolCalls } from "../src/desk/agent.ts";
import { AGENT_RUNNABLE, AGENT_TOOLS } from "../src/desk/public/agent-tools.js";
import { startDesk } from "../src/desk/server.ts";

test("the agent may only press keys that spend nothing", () => {
  for (const gate of ["make-clip", "approve-script", "practice", "keys"]) {
    assert.equal(AGENT_RUNNABLE.includes(gate), false, `${gate} must stay a human key`);
  }
  assert.deepEqual(AGENT_RUNNABLE, ["set-up", "add-notes", "find-footage", "write-script", "check-price", "rough-cut", "spending"]);
  const runStep = AGENT_TOOLS.find((tool) => tool.function.name === "run_step");
  const props = runStep?.function.parameters.properties as { step: { enum: string[] } };
  assert.deepEqual(props.step.enum, AGENT_RUNNABLE);
});

test("tool calls outside the schema are dropped", () => {
  const kept = filterToolCalls([
    { id: "a", function: { name: "run_step", arguments: '{"step":"make-clip"}' } },
    { id: "b", function: { name: "run_step", arguments: '{"step":"check-price"}' } },
    { id: "c", function: { name: "publish", arguments: "{}" } },
    { id: "d", function: { name: "go_to_step", arguments: '{"step":"nowhere"}' } },
    { id: "e", function: { name: "fill_blanks", arguments: '{"backend":"openai","seconds":7,"resolution":"4K"}' } },
    { id: "f", function: { name: "fill_blanks", arguments: "not json" } },
  ]);
  assert.deepEqual(
    kept.map((call) => [call.id, call.name, call.args]),
    [
      ["b", "run_step", { step: "check-price" }],
      ["e", "fill_blanks", { seconds: 7 }],
    ],
  );
});

test("the agent endpoint uses the saved key, returns tool calls, and never leaks the key", async () => {
  const dir = mkdtempSync(join(tmpdir(), "jeremai-agent-"));
  const envPath = join(dir, ".env");
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-desk-"));
  writeFileSync(envPath, "OPENROUTER_API_KEY=sk-agent-secret\n");
  let upstream: unknown = null;
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/models")) {
      return Response.json({
        data: [{ id: "x-ai/grok-4.7", name: "Grok", created: 700, architecture: { input_modalities: ["text", "image"], output_modalities: ["text"] } }],
      });
    }
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("authorization"), "Bearer sk-agent-secret");
    upstream = JSON.parse(String(init?.body));
    return Response.json({
      choices: [
        {
          message: {
            content: "Opening the price step.",
            tool_calls: [
              { id: "t1", type: "function", function: { name: "go_to_step", arguments: '{"step":"check-price"}' } },
              { id: "t2", type: "function", function: { name: "run_step", arguments: '{"step":"make-clip"}' } },
            ],
          },
        },
      ],
    });
  };
  const desk = await startDesk({ port: 0, dataDir, envPath, fetchImpl });
  try {
    const res = await fetch(`http://127.0.0.1:${desk.port}/api/agent`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        brand: "aether-wellness",
        model: "x-ai/grok-4.7",
        messages: [{ role: "user", content: "What does it cost?" }],
        screen: { step: "find-footage", blanks: { footage: "morning kitchen" }, lastSentence: "Nothing run yet", lastExitCode: null },
      }),
    });
    const body = (await res.json()) as { content: string; toolCalls: { name: string; args: { step: string } }[] };
    assert.equal(res.status, 200);
    assert.equal(body.content, "Opening the price step.");
    assert.deepEqual(body.toolCalls.map((call) => [call.name, call.args.step]), [["go_to_step", "check-price"]]);
    const text = JSON.stringify(body);
    assert.equal(text.includes("sk-agent-secret"), false);
    assert.equal(text.includes(envPath), false);
    const sent = upstream as { messages: { role: string; content: string }[]; tools: unknown[] };
    assert.equal(sent.messages[0]?.role, "system");
    assert.match(sent.messages[0]?.content ?? "", /Aether Wellness/);
    assert.match(sent.messages[0]?.content ?? "", /Never make a clip/);
    assert.match(sent.messages[0]?.content ?? "", /Open step: find-footage/);
    assert.equal(Array.isArray(sent.tools), true);

    const tools = await fetch(`http://127.0.0.1:${desk.port}/agent-tools.js`);
    assert.equal(tools.status, 200);
  } finally {
    await desk.close();
  }
});

test("without a key the agent says where to add one", async () => {
  const dir = mkdtempSync(join(tmpdir(), "jeremai-agent-"));
  const envPath = join(dir, ".env");
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-desk-"));
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return Response.json({ data: [] });
  };
  const desk = await startDesk({ port: 0, dataDir, envPath, fetchImpl });
  try {
    const res = await fetch(`http://127.0.0.1:${desk.port}/api/agent`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brand: "aether-wellness", model: "x-ai/grok-4.7", messages: [{ role: "user", content: "hi" }] }),
    });
    const body = (await res.json()) as { sentence: string };
    assert.equal(res.status, 400);
    assert.equal(body.sentence, "Add an OpenRouter key on the Keys tab.");
    assert.equal(calls, 0);
  } finally {
    await desk.close();
  }
});
