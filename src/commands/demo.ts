import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { findProjectRoot } from "../lib/paths.ts";
import { err, hr, info, ok } from "../lib/print.ts";

function run(args: string[], dataDir: string): { code: number; out: string } {
  const cli = join(findProjectRoot(), "src/cli.ts");
  const r = spawnSync(process.execPath, ["--no-warnings", "--import", "tsx", cli, ...args, "--data-dir", dataDir], {
    encoding: "utf8",
    env: process.env,
  });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  process.stdout.write(r.stdout ?? "");
  process.stderr.write(r.stderr ?? "");
  return { code: r.status ?? 1, out };
}

export function cmdDemo(opts: { client?: string; dataDir?: string }): number {
  const client = opts.client ?? "aether-wellness";
  const root = findProjectRoot();
  const dataDir = opts.dataDir ?? join(root, ".data", "demo");
  const brief = join(root, "fixtures", "briefs", "aether-morning.md");

  hr("JeremAI dry-run demo");
  info("Pipeline: brief → search-broll → script --approve → estimate → generate (refuse) → generate --confirm → assemble → cost");
  info(`client=${client}  data=${dataDir}`);
  console.log("");

  const steps: { name: string; args: string[]; expect?: number }[] = [
    { name: "brief", args: ["brief", "--client", client, "--file", brief] },
    { name: "search-broll", args: ["search-broll", "--client", client, "--query", "morning kitchen ritual scoop"] },
    { name: "script --approve", args: ["script", "--client", client, "--approve"] },
    { name: "estimate", args: ["estimate", "--client", client, "--seconds", "5", "--backend", "runpod-h3"] },
    { name: "generate (no confirm)", args: ["generate", "--client", client, "--seconds", "5"], expect: 2 },
    { name: "generate --confirm", args: ["generate", "--client", client, "--seconds", "5", "--confirm"] },
    { name: "assemble", args: ["assemble", "--client", client] },
    { name: "cost", args: ["cost", "--client", client] },
  ];

  for (const step of steps) {
    hr(`demo step · ${step.name}`);
    const { code } = run(step.args, dataDir);
    const expected = step.expect ?? 0;
    if (code !== expected) {
      err(`Step "${step.name}" exited ${code}, expected ${expected}.`);
      return code || 1;
    }
    if (step.expect === 2) ok("Correctly refused generate without --confirm.");
    console.log("");
  }

  ok("End-to-end dry-run complete. No MiniMax call. No RunPod GPU. Ledger actuals = $0.");
  info("Compare: self-host hypothesis $0.17/5s vs API ceiling $0.40/5s @768P / $0.65 @2K.");
  return 0;
}
