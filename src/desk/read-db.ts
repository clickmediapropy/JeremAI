import { existsSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export function openReadOnly(dataDir: string): DatabaseSync | null {
  const file = join(dataDir, "jeremai.sqlite");
  if (!existsSync(file)) return null;
  return new DatabaseSync(file, { readOnly: true });
}
