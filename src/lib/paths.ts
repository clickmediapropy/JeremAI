import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export function findProjectRoot(start = process.cwd()): string {
  let dir = start;
  for (let i = 0; i < 12; i++) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
        if (pkg.name === "jeremai") return dir;
      } catch {
        /* keep walking */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(here, "../..");
}

export function resolveDataDir(explicit?: string): string {
  const root = findProjectRoot();
  const fromEnv = process.env.JEREMAI_DATA_DIR;
  const chosen = explicit || fromEnv || join(root, ".data");
  const abs = isAbsolute(chosen) ? chosen : resolve(process.cwd(), chosen);
  mkdirSync(abs, { recursive: true });
  mkdirSync(join(abs, "jobs"), { recursive: true });
  mkdirSync(join(abs, "clips"), { recursive: true });
  return abs;
}

export function knowledgeDir(): string {
  return join(findProjectRoot(), "knowledge");
}

export function clientDir(clientId: string): string {
  return join(knowledgeDir(), "clients", clientId);
}

export function ensureDir(path: string): string {
  mkdirSync(path, { recursive: true });
  return path;
}
