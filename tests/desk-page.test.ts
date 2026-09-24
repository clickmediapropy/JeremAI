import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src/desk/public/desk.css"), "utf8");
const js = readFileSync(join(root, "src/desk/public/desk.js"), "utf8");

test("inactive fields stay hidden and confirm is bound to the priced settings", () => {
  assert.match(css, /\[hidden\]/);
  assert.match(css, /display:\s*none\s*!important/);
  assert.match(css, /input:not\(\[type="checkbox"\]\),\s*select/);
  assert.match(js, /confirm:\s*true/);
  assert.match(js, /state\.priced/);
  assert.equal(js.includes('if (body) $("sheet").close()'), true);
  assert.match(js, /The price is for different settings\. Check the price again\./);
  assert.match(js, /body\.exitCode !== 0/);
  assert.match(js, /state\.confirming/);
  const copyHandler = js.slice(js.indexOf('$("sheet-copy")'));
  assert.match(copyHandler, /const priced = state\.priced/);
  assert.match(copyHandler, /if \(!priced\)/);
  assert.match(copyHandler, /The price is for different settings\. Check the price again\./);
  assert.match(copyHandler, /seconds: priced\.seconds/);
  assert.match(copyHandler, /backend: priced\.backend/);
  assert.match(copyHandler, /resolution: priced\.resolution/);
  assert.match(copyHandler, /confirm: true/);
});

test("the transport keys carry a live status and the result readout names the exit", () => {
  const html = readFileSync(join(root, "src/desk/public/index.html"), "utf8");
  assert.match(js, /button\.setAttribute\("aria-current", current \? "true" : "false"\)/);
  assert.match(js, /button\.dataset\.status = info\.lamp/);
  assert.match(js, /\$\("result"\)\.dataset\.state = view\.state/);
  assert.match(js, /exitCode === 2\) return \{ state: "stopped-on-purpose"/);
  assert.match(js, /exitCode === 0\) return \{ state: "ok"/);
  assert.match(html, /id="result" data-state="idle"/);
  assert.match(html, /id="gauge-needle"/);
  assert.match(html, /id="open-sheet" class="key gate"/);
  assert.match(css, /\.result\[data-state="stopped-on-purpose"\]/);
  assert.match(css, /\.tkey\[aria-current="true"\]/);
});

test("the agent widget checks the allowlist before pressing a key and renders text only", () => {
  const html = readFileSync(join(root, "src/desk/public/index.html"), "utf8");
  const runTool = js.slice(js.indexOf('if (call.name === "run_step")'), js.indexOf('if (call.name === "read_state")'));
  assert.match(runTool, /if \(!AGENT_RUNNABLE\.includes\(args\.step\)\)/);
  assert.ok(runTool.indexOf("AGENT_RUNNABLE.includes") < runTool.indexOf("await run(args.step)"));
  const line = js.slice(js.indexOf("function agentLine"), js.indexOf("function agentStatus"));
  assert.match(line, /p\.textContent = text/);
  assert.doesNotMatch(line, /innerHTML/);
  assert.match(html, /id="agent-open"/);
  assert.match(html, /id="agent-model"/);
  assert.match(html, /Add an OpenRouter key on the Keys tab\./);
  assert.match(css, /@media \(max-width: 1366px\)/);
  assert.match(css, /@media \(max-height: 760px\)/);
});
