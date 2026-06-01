/**
 * Resolves the absolute path to the local papers directory.
 *
 * Problem: when the server is bundled into dist/index.mjs, all source files
 * share the same import.meta.dir (the dist/ directory). Relative "../../../.."
 * paths hard-coded to a specific source depth break silently in production.
 *
 * Solution (in priority order):
 *   1. PAPERS_LOCAL_DIR env var — explicit override, always wins
 *   2. Walk up from import.meta.dir until pnpm-workspace.yaml is found
 *   3. Try a fixed path relative to process.cwd() as last resort
 *
 * The resolved base is then probed with two candidate suffixes to handle
 * deployments where an extra "papers/" nesting was created accidentally:
 *   • <root>/packages/papers/papers          (standard)
 *   • <root>/packages/papers/papers/papers   (extra nesting on some servers)
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

function findProjectRoot(start: string): string | null {
  let dir = start;
  for (let i = 0; i < 20; i++) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function resolve(): string {
  // 1. Explicit env override
  if (process.env.PAPERS_LOCAL_DIR) return process.env.PAPERS_LOCAL_DIR;

  // 2. Walk up from the module file to find the monorepo root
  const root = findProjectRoot(import.meta.dir);
  if (root) {
    // Try standard path first, then extra-nested variant
    const standard = join(root, "packages/papers/papers");
    const nested   = join(root, "packages/papers/papers/papers");
    if (existsSync(nested) && !existsSync(join(standard, "A-Level"))) {
      return nested;
    }
    return standard;
  }

  // 3. Fallback: two levels up from cwd (covers apps/server → project root)
  return join(process.cwd(), "../../packages/papers/papers");
}

export const PAPERS_DIR: string = resolve();

/**
 * Given a path relative to the papers directory, return the first absolute
 * path candidate that exists on disk, or null if none exist.
 */
export function resolvePaperPath(rel: string): string | null {
  const primary  = join(PAPERS_DIR, rel);
  if (existsSync(primary)) return primary;

  // Extra-nesting fallback: try adding one more "papers/" segment
  const fallback = join(PAPERS_DIR, "papers", rel);
  if (existsSync(fallback)) return fallback;

  return null;
}
