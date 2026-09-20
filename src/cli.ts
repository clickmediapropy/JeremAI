import { Command } from "commander";
import { cmdAssemble } from "./commands/assemble.ts";
import { cmdBrief } from "./commands/brief.ts";
import { cmdCost } from "./commands/cost.ts";
import { cmdDemo } from "./commands/demo.ts";
import { cmdEstimate } from "./commands/estimate.ts";
import { cmdGenerate } from "./commands/generate.ts";
import { cmdScript } from "./commands/script.ts";
import { cmdSearchBroll } from "./commands/search-broll.ts";
import { listClients, loadClient } from "./lib/config.ts";
import { openDb } from "./lib/db.ts";
import { hr, kv } from "./lib/print.ts";
import { seedClientLibrary } from "./lib/seed.ts";

const program = new Command();

program
  .name("jeremai")
  .description(
    "Agent-native CLI for Nutra ad creatives: brief → B-roll search → claims-safe script → estimate → confirm → stub generate → ffmpeg assemble → cost ledger.",
  )
  .version("0.1.0");

function dataDirOption(cmd: Command): Command {
  return cmd.option("--data-dir <path>", "SQLite + artifacts directory (default: <repo>/.data)");
}

dataDirOption(
  program
    .command("init")
    .description("Create the local SQLite index and seed packaged B-roll for a client")
    .requiredOption("--client <id>", "Client id (folder under knowledge/clients)")
    .action((opts) => {
      const client = loadClient(opts.client);
      const { db, dataDir } = openDb(opts.dataDir);
      const n = seedClientLibrary(db, client.id);
      hr("init");
      kv("client", `${client.name} (${client.id})`);
      kv("cap", `$${client.budgetCapUsd.toFixed(2)}`);
      kv("drive", client.driveUri);
      kv("r2", client.r2Uri);
      kv("data", dataDir);
      kv("seeded assets", n);
      process.exitCode = 0;
    }),
);

dataDirOption(
  program
    .command("clients")
    .description("List packaged client brains")
    .action(() => {
      hr("clients");
      for (const id of listClients()) {
        const c = loadClient(id);
        kv(id, `${c.name} · cap $${c.budgetCapUsd} · ${c.preferredBackend}`);
      }
    }),
);

dataDirOption(
  program
    .command("brief")
    .description("Ingest a human brief / winning-ad notes (the 10–15%)")
    .requiredOption("--client <id>", "Client id")
    .requiredOption("--file <path>", "Markdown or text brief")
    .option("--title <title>", "Override title")
    .action((opts) => {
      process.exitCode = cmdBrief(opts);
    }),
);

dataDirOption(
  program
    .command("search-broll")
    .description("Search the Drive/R2/local asset index BEFORE generating")
    .requiredOption("--client <id>", "Client id")
    .option("--query <text>", "Tags / natural language")
    .option("--seconds <n>", "Target duration hint", (v) => Number(v))
    .action((opts) => {
      process.exitCode = cmdSearchBroll(opts);
    }),
);

dataDirOption(
  program
    .command("script")
    .description("Draft hooks + VO against the claims allowlist; optional human --approve")
    .requiredOption("--client <id>", "Client id")
    .option("--brief <id>", "Brief id (default: latest)")
    .option("--approve", "Record human approval after lint passes", false)
    .action((opts) => {
      process.exitCode = cmdScript(opts);
    }),
);

dataDirOption(
  program
    .command("estimate")
    .description("Print model, seconds, retries buffer, and remaining client budget (no spend)")
    .requiredOption("--client <id>", "Client id")
    .option("--seconds <n>", "Clip length", (v) => Number(v), 5)
    .option("--backend <id>", "runpod-h3 | minimax-h3-api | fal-ai (alias: fal)")
    .option("--resolution <res>", "768P | 2K", "768P")
    .action((opts) => {
      process.exitCode = cmdEstimate(opts);
    }),
);

dataDirOption(
  program
    .command("generate")
    .description("Dry-run video stub. Requires --confirm. Refuses without it. Never auto-publishes.")
    .requiredOption("--client <id>", "Client id")
    .option("--confirm", "Required explicit spend/execute confirmation", false)
    .option("--yes", "Alias for --confirm", false)
    .option("--seconds <n>", "Clip length", (v) => Number(v), 5)
    .option("--backend <id>", "runpod-h3 | minimax-h3-api | fal-ai (alias: fal)")
    .option("--resolution <res>", "768P | 2K", "768P")
    .option("--approve-script", "Record human script approval in the same step", false)
    .option("--simulate-spend", "Debit the estimate against the cap (still no cloud call)", false)
    .action((opts) => {
      process.exitCode = cmdGenerate({ ...opts, confirm: Boolean(opts.confirm || opts.yes) });
    }),
);

dataDirOption(
  program
    .command("assemble")
    .description("ffmpeg rough cut + Premiere/CapCut handoff artifact")
    .requiredOption("--client <id>", "Client id")
    .option("--job <id>", "Job id (default: latest)")
    .action((opts) => {
      process.exitCode = cmdAssemble(opts);
    }),
);

dataDirOption(
  program
    .command("cost")
    .description("Per-client ledger: billed vs cap, dry-run quotes, jobs")
    .requiredOption("--client <id>", "Client id")
    .action((opts) => {
      process.exitCode = cmdCost(opts);
    }),
);

dataDirOption(
  program
    .command("demo")
    .description("One-command dry-run: brief → script → estimate → refuse/confirm (runpod + fal) → assemble → cost")
    .option("--client <id>", "Client id", "aether-wellness")
    .action((opts) => {
      process.exitCode = cmdDemo(opts);
    }),
);

program.parse();
