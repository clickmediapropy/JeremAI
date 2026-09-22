import assert from "node:assert/strict";
import { test } from "node:test";
import { fillInstruction } from "../src/desk/public/instructions.js";

const brand = { brand: "aether-wellness", brandName: "Aether Wellness" };

test("find-footage instruction keeps the footage words and the stop line", () => {
  const text = fillInstruction("find-footage", { ...brand, footage: "morning kitchen" });
  assert.match(text, /Aether Wellness \(aether-wellness\)/);
  assert.match(text, /Look for: morning kitchen/);
  assert.match(text, /pnpm jeremai search-broll --client aether-wellness --query "morning kitchen"/);
  assert.match(text, /Do not write a script, make a clip, or publish\./);
  assert.equal(text.includes("--confirm"), false);
  assert.equal(text.includes("--approve"), false);
});

test("write-script instruction does not approve", () => {
  const text = fillInstruction("write-script", brand);
  assert.match(text, /pnpm jeremai script --client aether-wellness/);
  assert.equal(text.includes("--approve"), false);
  assert.match(text, /Do not approve\./);
});

test("approve-script instruction says the person already read a passing script", () => {
  const text = fillInstruction("approve-script", brand);
  assert.match(text, /The person has already read a script that passed the claims check\./);
  assert.match(text, /pnpm jeremai script --client aether-wellness --approve/);
  assert.match(text, /Do not make a clip\./);
});

test("unconfirmed clip instruction has no confirm flag", () => {
  const text = fillInstruction("make-clip", {
    ...brand,
    seconds: 5,
    backend: "runpod-h3",
    resolution: "768P",
  });
  assert.match(text, /pnpm jeremai generate --client aether-wellness --seconds 5 --backend runpod-h3 --resolution 768P/);
  assert.doesNotMatch(text, /generate --client[^\n]*--confirm/);
  assert.match(text, /Do not pass `--confirm`\./);
});

test("confirmed clip instruction is the only one with --confirm", () => {
  const text = fillInstruction("make-clip", {
    ...brand,
    seconds: 5,
    backend: "fal-ai",
    resolution: "2K",
    confirm: true,
    countQuote: true,
  });
  assert.match(text, /--confirm/);
  assert.match(text, /--simulate-spend/);
  assert.match(text, /--backend fal-ai --resolution 2K/);
  const plain = fillInstruction("make-clip", {
    ...brand,
    seconds: 5,
    backend: "fal-ai",
    resolution: "2K",
    confirm: true,
    countQuote: false,
  });
  assert.equal(plain.includes("--simulate-spend"), false);
});
