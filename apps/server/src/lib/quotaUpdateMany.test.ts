/**
 * Regression guard for a Prisma footgun.
 *
 * The compound unique selector `userId_month: { userId, month }` is ONLY valid
 * for single-record operations (findUnique / update / upsert / delete). Passing
 * it to `updateMany` (whose `where` is a plain WhereInput of flat fields) throws
 * at runtime:
 *
 *   PrismaClientValidationError: Unknown argument `userId_month`.
 *
 * This shipped once and broke project/paper/AI quota consumption in production
 * (the atomic "consume one if under limit" updateMany). Because the unit tests
 * mock Prisma, a type/shape mistake like this slips through — so we assert it at
 * the source level instead: any `updateMany({...})` block must use flat fields
 * (`where: { userId, month, ... }`), never the `userId_month` compound key.
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SERVER_SRC = join(import.meta.dir, "..");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry === "generated") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.ts$/.test(entry) && !/\.test\.ts$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Find each `.updateMany(` call and return the text from the call open paren up
 * to its matching close paren (brace/paren-balanced), so we can inspect its args.
 */
function updateManyCallBodies(source: string): string[] {
  const bodies: string[] = [];
  const marker = ".updateMany(";
  let idx = source.indexOf(marker);
  while (idx !== -1) {
    let depth = 0;
    const start = idx + marker.length - 1; // position of the '('
    let i = start;
    for (; i < source.length; i++) {
      const ch = source[i];
      if (ch === "(" || ch === "{" || ch === "[") depth++;
      else if (ch === ")" || ch === "}" || ch === "]") {
        depth--;
        if (depth === 0) break;
      }
    }
    bodies.push(source.slice(start, i + 1));
    idx = source.indexOf(marker, i + 1);
  }
  return bodies;
}

describe("Prisma updateMany must not use compound-key selectors", () => {
  const files = walk(SERVER_SRC);

  test("scans a non-trivial number of source files", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  test("no updateMany() call references `userId_month`", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (!src.includes(".updateMany(")) continue;
      for (const body of updateManyCallBodies(src)) {
        if (body.includes("userId_month")) {
          offenders.push(file.replace(SERVER_SRC, "src"));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test("no updateMany() call references any other `_`-joined compound key", () => {
    // e.g. sessionId_questionNumber, resourceId_questionNumber — all unique
    // selectors that are invalid inside updateMany's WhereInput.
    const COMPOUND_KEY = /\b\w+_\w+:\s*\{[^}]*\b(userId|sessionId|resourceId|month|questionNumber)\b/;
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (!src.includes(".updateMany(")) continue;
      for (const body of updateManyCallBodies(src)) {
        if (COMPOUND_KEY.test(body)) {
          offenders.push(file.replace(SERVER_SRC, "src"));
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
