import { createReadStream } from "node:fs";
import { createServer, type Server } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRunner, type SpawnFn } from "./run.ts";
import { readState } from "./state.ts";
import type { RunBody } from "./types.ts";

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

export function startDesk(opts: { port?: number; dataDir: string; spawn?: SpawnFn }): Promise<DeskHandle> {
  const host = "127.0.0.1";
  const runner = createRunner();
  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/api/state") {
      const brand = url.searchParams.get("brand") ?? "";
      const state = readState(brand, opts.dataDir);
      if (!state.brand) {
        res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ sentence: "That brand is not on this computer." }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(state));
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
