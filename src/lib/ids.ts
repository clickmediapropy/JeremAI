import { createHash, randomBytes } from "node:crypto";

export function nowIso(): string {
  return new Date().toISOString();
}

export function shortId(prefix: string): string {
  return `${prefix}_${randomBytes(4).toString("hex")}`;
}

export function sha256Short(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}
