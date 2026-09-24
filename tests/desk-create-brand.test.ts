import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadClaimsPolicy, loadClient } from "../src/lib/config.ts";
import { startDesk } from "../src/desk/server.ts";

function deskWithTempClients() {
  const clientsRoot = mkdtempSync(join(tmpdir(), "jeremai-brands-"));
  const dataDir = mkdtempSync(join(tmpdir(), "jeremai-desk-"));
  return startDesk({ port: 0, dataDir, clientsRoot }).then((desk) => ({ desk, clientsRoot }));
}

async function postBrand(
  port: number,
  body: Record<string, unknown>,
): Promise<{ status: number; sentence: string; id?: string }> {
  const res = await fetch(`http://127.0.0.1:${port}/api/brands`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { sentence: string; id?: string };
  return { status: res.status, sentence: json.sentence, id: json.id };
}

const northstar = {
  name: "Northstar Labs",
  product: "Northstar Daily",
  budgetCapUsd: 40,
  allowedClaims: ["supports a daily routine", ""],
};

test("a new brand is written and listed", async () => {
  const { desk, clientsRoot } = await deskWithTempClients();
  try {
    const created = await postBrand(desk.port, northstar);
    assert.equal(created.status, 200);
    assert.equal(created.id, "northstar-labs");
    assert.equal(created.sentence, "Northstar Labs is ready.");

    const client = loadClient("northstar-labs", clientsRoot);
    assert.equal(client.name, "Northstar Labs");
    assert.equal(client.product, "Northstar Daily");
    assert.equal(client.budgetCapUsd, 40);
    assert.equal(client.preferredBackend, "runpod-h3");
    const claims = loadClaimsPolicy(client);
    assert.deepEqual(claims.allowedClaims, ["supports a daily routine"]);
    assert.ok(claims.bannedPatterns.some((pattern) => pattern.id === "cure-language"));

    const state = await fetch(`http://127.0.0.1:${desk.port}/api/state?brand=northstar-labs`);
    const snapshot = (await state.json()) as { brands: { id: string; name: string }[]; brand: { name: string } };
    assert.equal(state.status, 200);
    assert.equal(snapshot.brand.name, "Northstar Labs");
    assert.ok(snapshot.brands.some((brand) => brand.id === "northstar-labs"));
  } finally {
    await desk.close();
  }
});

test("a duplicate name, empty claims, and a bad budget write nothing", async () => {
  const { desk, clientsRoot } = await deskWithTempClients();
  try {
    const first = await postBrand(desk.port, northstar);
    assert.equal(first.status, 200);

    const duplicate = await postBrand(desk.port, { ...northstar, product: "Other Product" });
    assert.equal(duplicate.status, 400);
    assert.equal(duplicate.sentence, "That name is already a brand.");
    assert.equal(loadClient("northstar-labs", clientsRoot).product, "Northstar Daily");

    const emptyClaims = await postBrand(desk.port, {
      name: "Empty Claims",
      product: "Nothing",
      budgetCapUsd: 10,
      allowedClaims: ["  "],
    });
    assert.equal(emptyClaims.status, 400);
    assert.equal(emptyClaims.sentence, "Add at least one claim.");
    assert.equal(existsSync(join(clientsRoot, "empty-claims")), false);

    const badBudget = await postBrand(desk.port, {
      name: "Zero Budget",
      product: "Nothing",
      budgetCapUsd: 0,
      allowedClaims: ["supports a daily routine"],
    });
    assert.equal(badBudget.status, 400);
    assert.equal(badBudget.sentence, "The budget has to be more than zero.");
    assert.equal(existsSync(join(clientsRoot, "zero-budget")), false);

    const folders = readdirSync(clientsRoot);
    assert.deepEqual(folders, ["northstar-labs"]);
  } finally {
    await desk.close();
  }
});
