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
