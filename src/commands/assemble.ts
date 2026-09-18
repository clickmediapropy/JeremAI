import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadClient } from "../lib/config.ts";
import { getJob, latestJob, listAssets, openDb, updateJob } from "../lib/db.ts";
import { concatClips, writeStubClip } from "../lib/ffmpeg.ts";
import { ensureDir } from "../lib/paths.ts";
import { err, hr, info, kv, ok } from "../lib/print.ts";
import { seedClientLibrary } from "../lib/seed.ts";
import { EXIT, type AssetRecord } from "../types.ts";

export function cmdAssemble(opts: { client: string; job?: string; dataDir?: string }): number {
  const client = loadClient(opts.client);
  const { db, dataDir } = openDb(opts.dataDir);
  seedClientLibrary(db, client.id);
  const job = opts.job ? getJob(db, opts.job) : latestJob(db, client.id);
  if (!job) {
    err("No generate job to assemble. Run generate --confirm first.");
    return EXIT.notFound;
  }

  const assets = listAssets(db, client.id);
  const reuse = job.reuseAssetIds
    .map((id) => assets.find((a) => a.id === id))
    .filter((a): a is AssetRecord => Boolean(a));
  const generated = assets.filter((a) => a.uri && a.source === "generated" && a.uri.includes(job.id));

  const jobDir = ensureDir(join(dataDir, "jobs", job.id));
  const clipPaths: string[] = [];

  for (const asset of [...reuse, ...generated]) {
    const dest = asset.uri.startsWith("/")
      ? asset.uri
      : join(jobDir, `${asset.id}.mp4`);
    if (!asset.uri.startsWith("/")) {
      writeStubClip({
        outPath: dest,
        seconds: Math.max(1, Math.min(asset.durationS, 6)),
        label: asset.title,
        color: asset.claimSafe ? "0x243044" : "0x402020",
      });
    } else if (!asset.uri.endsWith(".mp4")) {
      writeStubClip({
        outPath: dest,
        seconds: Math.max(1, Math.min(asset.durationS, 6)),
        label: asset.title,
      });
    }
    clipPaths.push(asset.uri.startsWith("/") && asset.uri.endsWith(".mp4") ? asset.uri : dest);
  }

  if (clipPaths.length === 0) {
    const fallback = join(jobDir, "fallback.mp4");
    writeStubClip({ outPath: fallback, seconds: job.seconds, label: "assemble fallback" });
    clipPaths.push(fallback);
  }

  const roughCut = join(jobDir, "rough-cut.mp4");
  concatClips(clipPaths, roughCut);

  const handoff = {
    format: "jeremai.handoff.v1",
    nle: ["premiere", "capcut"],
    client: { id: client.id, name: client.name, product: client.product },
    jobId: job.id,
    scriptId: job.scriptId,
    roughCut,
    clips: clipPaths,
    reuseSeconds: reuse.reduce((s, a) => s + a.durationS, 0),
    generatedSeconds: job.seconds,
    polishPercent: 10,
    doNotAutoPublish: true,
    editorNotes: {
      premiere: "Import rough-cut.mp4 as a single sequence, or relink individual clips from clips[] onto V1. Keep supers on V2. Do not upload from Premiere.",
      capcut: "New project → import rough-cut.mp4. Split on hook / body / CTA. Add captions from the approved script only. Export locally; human posts.",
    },
    polishChecklist: [
      "Confirm on-screen text matches the approved script (no improvised health claims).",
      "Check product label / scoop / bottle fidelity — wrong pack = wasted media.",
      "Hold FDA disclaimer and 18+ super for the required duration.",
      "Kill any before/after or body-shame frames that slipped in from the library.",
      "Grade, audio, end card — this is the human 10%.",
      "Never auto-publish. Editor or media buyer posts after legal/account review.",
    ],
  };
  writeFileSync(join(jobDir, "handoff.json"), JSON.stringify(handoff, null, 2));
  writeFileSync(
    join(jobDir, "EDITOR.md"),
    [
      `# Handoff — ${client.name} / ${job.id}`,
      ``,
      `Rough cut: \`rough-cut.mp4\``,
      ``,
      `This is a **ffmpeg rough cut**, not a finished ad. Human editor owns ~10% polish.`,
      ``,
      `## Premiere`,
      handoff.editorNotes.premiere,
      ``,
      `## CapCut`,
      handoff.editorNotes.capcut,
      ``,
      `## Do not`,
      `- Auto-publish to Meta/Google`,
      `- Invent claims while captioning`,
      `- Use clips marked claim-unsafe`,
      ``,
    ].join("\n"),
  );

  updateJob(db, job.id, { status: "assembled", outputUri: roughCut });

  hr("assemble  (ffmpeg rough cut → editor handoff)");
  kv("job", job.id);
  kv("rough cut", roughCut);
  kv("clips", clipPaths.length);
  kv("reuse seconds", reuse.reduce((s, a) => s + a.durationS, 0));
  kv("handoff", join(jobDir, "handoff.json"));
  ok("Editor artifact written. Human polish only — JeremAI will not publish.");
  info("Paid-test metric: ≥40% of final seconds from reused library when the index is warm.");
  return 0;
}
