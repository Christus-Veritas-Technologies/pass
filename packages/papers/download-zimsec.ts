/**
 * ZIMSEC Official Papers Downloader  (zimsec.co.zw)
 * ─────────────────────────────────────────────────
 * Run:  bun run packages/papers/download-zimsec.ts
 *
 * Walks every category/page, resolves the ?wpdmdl=NNN id for each paper,
 * downloads the PDF, saves it under:
 *   packages/papers/papers/<Level>/<subject>/<year>/paper_N.pdf
 * and makes one git commit per paper.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ZIMSEC  = "https://www5.zimsec.co.zw";
const ROOT    = join(dirname(fileURLToPath(import.meta.url)), "papers");
const REPO    = join(ROOT, "../../..");
const DELAY   = 500;          // ms between requests
const UA      = "Mozilla/5.0 (compatible; ZimsecDownloader/1.0)";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Category pages ──────────────────────────────────────────────────────────

const CATEGORIES: { level: string; slug: string; pages: number }[] = [
  { level: "Grade-7", slug: "grade-7",  pages: 3  },
  { level: "O-Level", slug: "o-level",  pages: 12 },
  { level: "A-Level", slug: "a-level",  pages: 4  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractYear(s: string): string {
  return s.match(/\b(19|20)\d{2}\b/)?.[0] ?? "specimen";
}

function extractPaperNum(s: string): number {
  // e.g. "4075/02", "Paper 2", "/02"
  const m = s.match(/\/0?([12])\b|[Pp]aper\s*([12])/);
  return parseInt(m?.[1] ?? m?.[2] ?? "1", 10);
}

/** Parse a title like "Mathematics Syllabus A 4075/01" into parts */
function parsePaperTitle(title: string, level: string) {
  // Remove code suffix like "4075/01" or "6027/02 Insert"
  const clean = title.replace(/\d{4}\/\d+.*$/, "").trim();
  const subject = slugify(clean || title.split(" ")[0]!);
  const paperNum = extractPaperNum(title);
  const year = extractYear(title);   // probably "specimen" for official papers
  return { subject, paperNum, year };
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ── Step 1: collect all download-page slugs per category ────────────────────

async function collectDownloadPages(level: string, catSlug: string, totalPages: number) {
  const pages: { title: string; url: string; level: string }[] = [];
  for (let p = 1; p <= totalPages; p++) {
    const url = p === 1
      ? `${ZIMSEC}/download-category/${catSlug}/`
      : `${ZIMSEC}/download-category/${catSlug}/page/${p}/`;
    try {
      const html = await fetchHtml(url);
      // Extract download page links: href="/download/<slug>/"
      const re = /href="(https:\/\/www5\.zimsec\.co\.zw\/download\/[^"]+)"/g;
      // Also grab the title from nearby text
      const titleRe = /<h3[^>]*>\s*<a[^>]*href="[^"]+">([^<]+)<\/a>/g;
      const titles: string[] = [];
      let tm: RegExpExecArray | null;
      while ((tm = titleRe.exec(html)) !== null) titles.push(tm[1]!.trim());
      let m: RegExpExecArray | null;
      let idx = 0;
      const seen = new Set<string>();
      while ((m = re.exec(html)) !== null) {
        const href = m[1]!;
        if (seen.has(href)) continue;
        seen.add(href);
        pages.push({ title: titles[idx] ?? href.split("/").at(-2)!, url: href, level });
        idx++;
      }
      console.log(`  ${level} page ${p}/${totalPages} — ${pages.length} items`);
    } catch (e) {
      console.warn(`  WARN: ${level} page ${p} — ${(e as Error).message}`);
    }
    await sleep(DELAY);
  }
  return pages;
}

// ── Step 2: resolve wpdmdl ID from a download page ──────────────────────────

async function resolveWpdmdl(pageUrl: string): Promise<{ wpdmdl: string; title: string; year: string } | null> {
  try {
    const html = await fetchHtml(pageUrl);
    const idMatch = html.match(/wpdmdl=(\d+)/);
    if (!idMatch) return null;
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.replace(/ - ZIMSEC.*/i, "").trim() ?? "";
    const year = extractYear(html) ?? "specimen";
    return { wpdmdl: idMatch[1]!, title, year };
  } catch {
    return null;
  }
}

// ── Step 3: download PDF ─────────────────────────────────────────────────────

async function downloadPdf(
  wpdmdl: string,
  level: string,
  subject: string,
  year: string,
  paperNum: number,
): Promise<string | null> {
  const destDir = join(ROOT, level, subject, year);
  mkdirSync(destDir, { recursive: true });

  let n = paperNum;
  let dest = join(destDir, `paper_${n}.pdf`);
  while (existsSync(dest)) { n++; dest = join(destDir, `paper_${n}.pdf`); }

  const url = `${ZIMSEC}/?wpdmdl=${wpdmdl}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Referer": ZIMSEC },
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("pdf") && !ct.includes("octet-stream")) {
      throw new Error(`unexpected content-type: ${ct}`);
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 5_000) throw new Error(`too small (${buf.byteLength}B)`);
    writeFileSync(dest, Buffer.from(buf));
    return dest;
  } catch (e) {
    console.warn(`  WARN: download failed wpdmdl=${wpdmdl} — ${(e as Error).message}`);
    return null;
  }
}

// ── Step 4: git commit ───────────────────────────────────────────────────────

function gitCommit(filePath: string, level: string, subject: string, year: string, paperNum: number) {
  const rel = filePath.replace(/\\/g, "/").replace(/.*?(packages\/)/, "$1");
  const msg = `papers: add ${level} ${subject} ${year} paper ${paperNum}`;
  try {
    execSync(`git add "${rel}"`, { cwd: REPO, stdio: "pipe" });
    execSync(`git commit -m "${msg}"`, { cwd: REPO, stdio: "pipe" });
    console.log(`  ✓ ${msg}`);
  } catch {
    // might already be staged or nothing changed
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== ZIMSEC Official Papers Downloader ===\n");

  // 1. Collect all download page URLs
  console.log("Step 1: Collecting paper pages…");
  const allPages: { title: string; url: string; level: string }[] = [];
  for (const cat of CATEGORIES) {
    const pages = await collectDownloadPages(cat.level, cat.slug, cat.pages);
    allPages.push(...pages);
    await sleep(DELAY);
  }
  console.log(`\nTotal papers found: ${allPages.length}\n`);

  // 2. Resolve wpdmdl + download + commit (sequential to keep commits ordered)
  console.log("Step 2: Downloading and committing…");
  let done = 0;
  for (const page of allPages) {
    const meta = await resolveWpdmdl(page.url);
    if (!meta) { console.warn(`  SKIP: no wpdmdl at ${page.url}`); continue; }

    const { subject, paperNum, year } = parsePaperTitle(page.title, page.level);
    const resolvedYear = meta.year !== "specimen" ? meta.year : year;

    const dest = await downloadPdf(meta.wpdmdl, page.level, subject, resolvedYear, paperNum);
    if (dest) {
      gitCommit(dest, page.level, subject, resolvedYear, paperNum);
      done++;
      console.log(`  [${done}/${allPages.length}] ${page.level}/${subject}/${resolvedYear}/paper_${paperNum}.pdf (${meta.wpdmdl})`);
    }
    await sleep(DELAY);
  }

  console.log(`\n✅ Done. Downloaded and committed ${done} papers.`);
}

main().catch(e => { console.error(e); process.exit(1); });
