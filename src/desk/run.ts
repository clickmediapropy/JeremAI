import { spawn } from "node:child_process";
import { join } from "node:path";
import { buildEstimate, billedUsd } from "../lib/budget.ts";
import { loadClient } from "../lib/config.ts";
import { listAssets } from "../lib/db.ts";
import { findProjectRoot } from "../lib/paths.ts";
import { buildArgs } from "./argv.ts";
import { openReadOnly } from "./read-db.ts";
import { stopSentence, successSentence } from "./sentences.ts";
import { STEPS, type RunBody, type RunResult, type StepId } from "./types.ts";

export interface SpawnResult {
  code: number;
  stdout: string;
  stderr: string;
}

export type SpawnFn = (args: string[], dataDir: string | undefined) => Promise<SpawnResult>;

export function createSpawn(): SpawnFn {
  const cli = join(findProjectRoot(), "src/cli.ts");
  return (args, dataDir) =>
    new Promise((resolve) => {
      const full = dataDir ? [...args, "--data-dir", dataDir] : args;
      const child = spawn(process.execPath, ["--no-warnings", "--import", "tsx", cli, ...full], {
        cwd: findProjectRoot(),
      });
      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    });
}

function isStep(step: string): step is StepId {
  return (STEPS as readonly string[]).includes(step);
}

export function createRunner(): {
  runStep: (
    body: RunBody,
    opts: { dataDir: string; spawn?: SpawnFn },
  ) => Promise<RunResult | { busy: true; sentence: string }>;
} {
  let inFlight = false;
  return {
    async runStep(body, opts) {
      if (inFlight) return { busy: true, sentence: "Still working on the last step." };
      const built = buildArgs(body);
      if (!built.ok) return { exitCode: 1, stdout: "", stderr: "", sentence: built.sentence };
      let brandName = body.brand;
      try {
        brandName = loadClient(body.brand).name;
      } catch {
        return { exitCode: 1, stdout: "", stderr: "", sentence: "That brand is not on this computer." };
      }
      inFlight = true;
      try {
        const spawnFn = opts.spawn ?? createSpawn();
        const dataDir = built.passDataDir ? opts.dataDir : undefined;
        const result = await spawnFn(built.args, dataDir);
        if (result.code !== 0) {
          return {
            exitCode: result.code,
            stdout: result.stdout,
            stderr: result.stderr,
            sentence: stopSentence(result.code) ?? "Stopped. Something on this step is not valid.",
          };
        }
        const step = body.step as StepId;
        const db = isStep(step) && built.passDataDir ? openReadOnly(opts.dataDir) : null;
        const client = loadClient(body.brand);
        const estimate =
          step === "check-price" && db
            ? buildEstimate(db, client, {
                seconds: body.seconds ?? 5,
                backend: body.backend ?? client.preferredBackend,
                resolution: body.resolution ?? "768P",
              })
            : undefined;
        const assets = step === "find-footage" && db ? listAssets(db, body.brand) : undefined;
        const spentUsd = db ? billedUsd(db, body.brand) : 0;
        db?.close();
        return {
          exitCode: 0,
          stdout: result.stdout,
          stderr: result.stderr,
          sentence: successSentence(step, {
            brandName,
            footage: body.footage,
            assets,
            estimate,
            countQuote: body.countQuote,
            spentUsd,
            capUsd: client.budgetCapUsd,
          }),
        };
      } finally {
        inFlight = false;
      }
    },
  };
}
