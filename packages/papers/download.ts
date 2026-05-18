/**
 * ZIMSEC Past Papers Downloader
 * Run with: bun run packages/papers/download.ts
 *
 * Scrapes zambuko.vercel.app, downloads every PDF to:
 *   packages/papers/papers/<Level>/<subject>/<year>/paper_N.pdf
 * then makes one git commit per paper.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://zambuko.vercel.app";
const TOTAL_PAGES = 52;
const CONCURRENCY = 4;
const DELAY_MS = 300;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "papers");

// ── helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function slugify(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function levelFolder(text: string): "Grade-7" | "O-Level" | "A-Level" {
  const t = text.toLowerCase();
  if (/a[-\s]level/.test(t)) return "A-Level";
  if (/grade[-\s]?7/.test(t)) return "Grade-7";
  return "O-Level";
}

function extractYear(text: string): string {
  return text.match(/\b(19|20)\d{2}\b/)?.[0] ?? "unknown";
}

function extractPaper(text: string): number {
  return parseInt(text.match(/paper\s*([12])/i)?.[1] ?? "1", 10);
}

function extractSubject(text: string, slug: string): string {
  // Try to grab everything before the level/year keywords
  const m = text
    .toLowerCase()
    .match(/^([a-z][a-z\s&-]*)(?:\s+(?:o[-\s]level|a[-\s]level|grade|november|june|\d{4}))/i);
  if (m?.[1]) return slugify(m[1]);
  // Fall back to the prefix of the slug  (e.g. "chemistry" from "chemistry-vG6Yn")
  const slugPart = slug.split("/").pop()?.split("-")[0] ?? "unknown";
  return slugify(slugPart);
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ZimsecPapersScraper/1.0)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// ── Step 1: collect all resource slugs ───────────────────────────────────────

async function collectSlugs(): Promise<string[]> {
  const slugSet = new Set<string>();
  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const url = page === 1 ? `${BASE}/zimsec` : `${BASE}/zimsec/page/${page}`;
    try {
      const html = await fetchHtml(url);
      const matches = html.matchAll(/\/zimsec\/resource\/[a-zA-Z0-9_-]+/g);
      for (const m of matches) slugSet.add(m[0]);
      console.log(`  page ${page}/${TOTAL_PAGES} — ${slugSet.size} slugs`);
    } catch (e) {
      console.warn(`  WARN: page ${page} failed — ${(e as Error).message}`);
    }
    await sleep(DELAY_MS);
  }
  return [...slugSet];
}

// ── Step 2: resolve metadata + PDF URL for one resource ──────────────────────

interface PaperMeta {
  slug: string;
  pdfUrl: string;
  level: "Grade-7" | "O-Level" | "A-Level";
  subject: string;
  year: string;
  paperNum: number;
}

async function resolveMeta(slug: string): Promise<PaperMeta | null> {
  const url = `${BASE}${slug}`;
  try {
    const html = await fetchHtml(url);
    const pdfUrl = html.match(/https:\/\/firebasestorage\.googleapis\.com\/[^"']+/)?.[0];
    if (!pdfUrl) return null;

    const title =
      html.match(/<title>([^<]+)<\/title>/i)?.[1] ??
      html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] ??
      "";

    return {
      slug,
      pdfUrl: pdfUrl.replace(/&amp;/g, "&"),
      level: levelFolder(title),
      subject: extractSubject(title, slug),
      year: extractYear(title),
      paperNum: extractPaper(title),
    };
  } catch {
    return null;
  }
}

// ── Step 3: download a PDF ────────────────────────────────────────────────────

async function downloadPdf(meta: PaperMeta): Promise<string | null> {
  let destDir = join(ROOT, meta.level, meta.subject, meta.year);
  mkdirSync(destDir, { recursive: true });

  // Find an unused paper_N.pdf slot
  let n = meta.paperNum;
  let dest = join(destDir, `paper_${n}.pdf`);
  while (existsSync(dest)) {
    n++;
    dest = join(destDir, `paper_${n}.pdf`);
  }

  try {
    const res = await fetch(meta.pdfUrl, {
      signal: AbortSignal.timeout(120_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ZimsecPapersScraper/1.0)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 1_000) throw new Error(`too small: ${buf.byteLength} bytes`);
    writeFileSync(dest, Buffer.from(buf));
    return dest;
  } catch (e) {
    console.warn(`  WARN: download failed ${meta.slug} — ${(e as Error).message}`);
    return null;
  }
}

// ── Step 4: git commit one paper ─────────────────────────────────────────────

function gitCommit(filePath: string, meta: PaperMeta) {
  const rel = filePath.replace(/\\/g, "/").replace(/.*packages\/papers\//, "packages/papers/");
  const msg = `papers: add ${meta.level} ${meta.subject} ${meta.year} paper ${meta.paperNum}`;
  try {
    execSync(`git add "${rel}"`, { cwd: join(ROOT, "../../.."), stdio: "pipe" });
    execSync(`git commit -m "${msg}"`, { cwd: join(ROOT, "../../.."), stdio: "pipe" });
    console.log(`  ✓ committed: ${msg}`);
  } catch (e) {
    console.warn(`  WARN: git commit failed — ${(e as Error).message}`);
  }
}

// ── Run with bounded concurrency ─────────────────────────────────────────────

async function withConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]!);
      await sleep(DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== ZIMSEC Papers Downloader ===\n");

  // 1. Collect slugs
  console.log("Step 1: Collecting resource slugs from all pages…");
  const slugs = await collectSlugs();
  console.log(`\nFound ${slugs.length} unique resources.\n`);

  // 2. Resolve metadata (in parallel)
  console.log("Step 2: Resolving metadata + PDF URLs…");
  const metas = await withConcurrency(slugs, CONCURRENCY, async (slug) => {
    await sleep(Math.random() * 200);
    const m = await resolveMeta(slug);
    if (m) process.stdout.write(".");
    else process.stdout.write("x");
    return m;
  });
  const valid = metas.filter(Boolean) as PaperMeta[];
  console.log(`\nResolved ${valid.length}/${slugs.length} papers.\n`);

  // 3 + 4. Download + commit each paper sequentially (to keep commits clean)
  console.log("Step 3: Downloading papers and committing…");
  let downloaded = 0;
  for (const meta of valid) {
    const dest = await downloadPdf(meta);
    if (dest) {
      gitCommit(dest, meta);
      downloaded++;
      console.log(`  [${downloaded}/${valid.length}] ${meta.level}/${meta.subject}/${meta.year}/paper_${meta.paperNum}.pdf`);
    }
  }

  console.log(`\n✅ Done. Downloaded and committed ${downloaded} papers.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
