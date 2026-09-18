import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ensureDir } from "./paths.ts";

export function ffmpegBin(): string {
  return process.env.FFMPEG_PATH || "ffmpeg";
}

export function hasFfmpeg(): boolean {
  const r = spawnSync(ffmpegBin(), ["-version"], { encoding: "utf8" });
  return r.status === 0;
}

export function writeStubClip(opts: {
  outPath: string;
  seconds: number;
  label: string;
  color?: string;
}): void {
  ensureDir(dirname(opts.outPath));
  if (!hasFfmpeg()) {
    writeFileSync(
      `${opts.outPath}.missing-ffmpeg.txt`,
      `ffmpeg not found. Would write ${opts.seconds}s stub "${opts.label}" to ${opts.outPath}\n`,
    );
    return;
  }
  const color = opts.color ?? "0x1b2430";
  const safeLabel = opts.label.replace(/[:\\]/g, " ").slice(0, 48);
  const args = [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${color}:s=1280x720:d=${opts.seconds}`,
    "-f",
    "lavfi",
    "-i",
    "anullsrc=r=44100:cl=stereo",
    "-vf",
    `drawtext=text='${safeLabel}':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2`,
    "-shortest",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    opts.outPath,
  ];
  const r = spawnSync(ffmpegBin(), args, { encoding: "utf8" });
  if (r.status !== 0) {
    // drawtext needs libfreetype; fall back to unlabeled color bars
    const fallback = spawnSync(
      ffmpegBin(),
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `color=c=${color}:s=1280x720:d=${opts.seconds}`,
        "-f",
        "lavfi",
        "-i",
        "anullsrc=r=44100:cl=stereo",
        "-shortest",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        opts.outPath,
      ],
      { encoding: "utf8" },
    );
    if (fallback.status !== 0) {
      throw new Error(`ffmpeg stub failed: ${fallback.stderr || r.stderr}`);
    }
  }
}

export function concatClips(clipPaths: string[], outPath: string): void {
  ensureDir(dirname(outPath));
  const existing = clipPaths.filter((p) => existsSync(p));
  if (existing.length === 0) {
    throw new Error("No clip files to assemble.");
  }
  if (!hasFfmpeg()) {
    writeFileSync(
      `${outPath}.missing-ffmpeg.txt`,
      `ffmpeg not found. Would concat:\n${existing.join("\n")}\n`,
    );
    return;
  }
  const listPath = join(dirname(outPath), "concat.txt");
  writeFileSync(
    listPath,
    existing.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n") + "\n",
  );
  const r = spawnSync(
    ffmpegBin(),
    ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outPath],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    const re = spawnSync(
      ffmpegBin(),
      [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listPath,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        outPath,
      ],
      { encoding: "utf8" },
    );
    if (re.status !== 0) {
      throw new Error(`ffmpeg concat failed: ${re.stderr || r.stderr}`);
    }
  }
}
