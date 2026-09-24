import { createReadStream } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findProjectRoot } from "../lib/paths.ts";
import { createBrand } from "./create-brand.ts";
import { fillStep, selectedModel } from "./fill.ts";
import { clearKey, readEnvValue, readKeys, saveKey, saveModel } from "./keys.ts";
import { listVisionModels } from "./openrouter.ts";
import { createRunner, type SpawnFn } from "./run.ts";
import { readState } from "./state.ts";
import type { RunBody } from "./types.ts";

const INVALID = "Stopped. Something on this step is not valid.";

async function readJson(req: IncomingMessage, res: ServerResponse): Promise<unknown | null> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (parsed === null || typeof parsed !== "object") {
      res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ sentence: INVALID }));
      return null;
    }
    return parsed;
  } catch {
    res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ sentence: INVALID }));
    return null;
  }
}

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "public");
const FILES: Record<string, { file: string; type: string }> = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/index.html": { file: "index.html", type: "text/html; charset=utf-8" },
  "/desk.css": { file: "desk.css", type: "text/css; charset=utf-8" },
  "/desk.js": { file: "desk.js", type: "text/javascript; charset=utf-8" },
  "/instructions.js": { file: "instructions.js", type: "text/javascript; charset=utf-8" },
};

export interface DeskHandle {
  port: number;
  host: string;
  close: () => Promise<void>;
}

export function startDesk(opts: {
  port?: number;
  dataDir: string;
  clientsRoot?: string;
  envPath?: string;
  fetchImpl?: typeof fetch;
  spawn?: SpawnFn;
}): Promise<DeskHandle> {
  const envPath = opts.envPath ?? join(findProjectRoot(), ".env");
  const fetchImpl = opts.fetchImpl ?? fetch;
  const host = "127.0.0.1";
  const runner = createRunner();
  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/api/state") {
      const brand = url.searchParams.get("brand") ?? "";
      const state = readState(brand, opts.dataDir, opts.clientsRoot);
      if (!state.brand) {
        res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ sentence: "That brand is not on this computer." }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(state));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/keys") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ keys: readKeys(envPath) }));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/keys") {
      const parsed = await readJson(req, res);
      if (!parsed) return;
      const body = parsed as { env?: unknown; value?: unknown; clear?: unknown };
      const env = typeof body.env === "string" ? body.env : "";
      const result = body.clear === true
        ? clearKey(envPath, env)
        : saveKey(envPath, env, typeof body.value === "string" ? body.value : "");
      res.writeHead(result.ok ? 200 : 400, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ sentence: result.sentence, keys: readKeys(envPath) }));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/models") {
      if (!readEnvValue(envPath, "OPENROUTER_API_KEY")) {
        res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ models: [], selected: "" }));
        return;
      }
      try {
        const models = await listVisionModels(fetchImpl);
        res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ models, selected: selectedModel(envPath, models) }));
      } catch {
        res.writeHead(502, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ sentence: "The model list did not load." }));
      }
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/model") {
      const parsed = await readJson(req, res);
      if (!parsed) return;
      const id = typeof (parsed as { id?: unknown }).id === "string" ? (parsed as { id: string }).id : "";
      const models = readEnvValue(envPath, "OPENROUTER_API_KEY") ? await listVisionModels(fetchImpl).catch(() => []) : [];
      if (!models.some((model) => model.id === id)) {
        res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ sentence: "Pick one of the listed models." }));
        return;
      }
      saveModel(envPath, id);
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ selected: id }));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/fill") {
      const parsed = await readJson(req, res);
      if (!parsed) return;
      const body = parsed as { brand?: unknown; step?: unknown; model?: unknown };
      const models = readEnvValue(envPath, "OPENROUTER_API_KEY") ? await listVisionModels(fetchImpl).catch(() => []) : [];
      const result = await fillStep({
        step: typeof body.step === "string" ? body.step : "",
        brand: typeof body.brand === "string" ? body.brand : "",
        model: typeof body.model === "string" ? body.model : "",
        models,
        dataDir: opts.dataDir,
        clientsRoot: opts.clientsRoot,
        envPath,
        fetchImpl,
      });
      if (!result.ok) {
        res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ sentence: result.sentence }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(result.fill));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/brands") {
      const parsed = await readJson(req, res);
      if (!parsed) return;
      const body = parsed as {
        name?: unknown;
        product?: unknown;
        budgetCapUsd?: unknown;
        allowedClaims?: unknown;
      };
      const allowedClaims = Array.isArray(body.allowedClaims)
        ? body.allowedClaims.filter((line): line is string => typeof line === "string")
        : [];
      const created = createBrand(
        {
          name: typeof body.name === "string" ? body.name : "",
          product: typeof body.product === "string" ? body.product : "",
          budgetCapUsd: typeof body.budgetCapUsd === "number" ? body.budgetCapUsd : Number.NaN,
          allowedClaims,
        },
        opts.clientsRoot,
      );
      if (!created.ok) {
        res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ sentence: created.sentence }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ id: created.id, sentence: created.sentence }));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/run") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      let body: RunBody;
      try {
        const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (parsed === null || typeof parsed !== "object") {
          res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ sentence: "Stopped. Something on this step is not valid." }));
          return;
        }
        body = parsed as RunBody;
      } catch {
        res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ sentence: "Stopped. Something on this step is not valid." }));
        return;
      }
      const result = await runner.runStep(body, { dataDir: opts.dataDir, spawn: opts.spawn });
      if ("busy" in result) {
        res.writeHead(409, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ sentence: result.sentence }));
        return;
      }
      const status = result.exitCode === 1 && result.stdout === "" && result.stderr === "" ? 400 : 200;
      res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(result));
      return;
    }
    const file = FILES[url.pathname];
    if (req.method === "GET" && file) {
      const stream = createReadStream(join(publicDir, file.file));
      stream.on("error", () => {
        if (!res.headersSent) {
          res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
          res.end("Not found");
          return;
        }
        res.destroy();
      });
      stream.once("open", () => {
        res.writeHead(200, { "content-type": file.type });
        stream.pipe(res);
      });
      return;
    }
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(opts.port ?? 0, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        port,
        host,
        close: () => new Promise((done, fail) => server.close((err) => (err ? fail(err) : done()))),
      });
    });
  });
}

const entry = process.argv[1];
if (entry && fileURLToPath(import.meta.url) === entry) {
  const { resolveDataDir } = await import("../lib/paths.ts");
  startDesk({ port: 4173, dataDir: resolveDataDir(undefined) })
    .then((desk) => {
      console.log(`Desk at http://${desk.host}:${desk.port}`);
    })
    .catch((err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error("The desk is not running on this computer.");
        process.exit(1);
      }
      throw err;
    });
}
