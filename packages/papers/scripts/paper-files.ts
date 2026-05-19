/**
 * Paper file discovery, parsing and filtering.
 *
 * Walks packages/papers/papers/<Level>/<subject-folder>/<year>/paper_N.pdf,
 * filters out non-question artifacts (inserts, instruction sheets, forms),
 * and parses each path into structured metadata used by the ingestion pipeline.
 */

import { Glob } from "bun";
import { join } from "node:path";

export const PAPERS_ROOT = join(import.meta.dir, "../papers");
export const CACHE_DIR = join(import.meta.dir, "../.ingest-cache");

// Folder-name substrings that mark a PDF as a non-question artifact —
// supervisor copies, inserts, instruction sheets, advance information, forms.
const NON_QUESTION =
  /(insert|instruction|advanced?-information|advanced?-instruction|supervisor|dimension-form|booking-form|pattern-maker)/i;

export interface PaperFile {
  paperCode: string; // unique key — relative path without extension
  filePath: string; // repo-relative path to the PDF
  absPath: string; // absolute path on disk
  grade: string; // "Grade-7" | "O-Level" | "A-Level"
  subject: string; // human-readable subject
  subjectSlug: string;
  year: number;
  paperNum: number;
  fileUrl: string; // /static/papers/... served by the Hono server
  title: string;
}

function titleCase(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

/** Filesystem-safe name for a paperCode (slashes → __). */
export function cacheKey(paperCode: string): string {
  return paperCode.replace(/[/\\]/g, "__");
}

/** Parse a relative paper path into metadata, or null if it should be skipped. */
export function parsePaperPath(rel: string): PaperFile | null {
  const norm = rel.replace(/\\/g, "/");
  const parts = norm.split("/");
  if (parts.length !== 4) return null;

  const [grade, folder, yearStr, file] = parts as [string, string, string, string];
  if (NON_QUESTION.test(folder)) return null;
  if (!file.toLowerCase().endsWith(".pdf")) return null;

  const year = parseInt(yearStr, 10);
  if (Number.isNaN(year)) return null;

  // Subject = folder name up to the first numeric code or "-paper" marker.
  const subjectSlug = folder.split(/-\d|-paper/)[0]!;
  const subject = titleCase(subjectSlug);

  // Paper number: prefer an explicit "-paper-N" folder marker (Grade-7),
  // then the trailing group of a ZIMSEC code (e.g. 6001-01 → 1),
  // then the filename.
  let paperNum = 1;
  const folderPaper = folder.match(/-paper-?(\d)/i);
  const codePaper = folder.match(/\d{4}-(\d{1,2})/);
  if (folderPaper) paperNum = parseInt(folderPaper[1]!, 10);
  else if (codePaper) paperNum = parseInt(codePaper[1]!, 10);
  else paperNum = parseInt(file.match(/paper_(\d+)/i)?.[1] ?? "1", 10);

  const paperCode = norm.replace(/\.pdf$/i, "");

  return {
    paperCode,
    filePath: `packages/papers/papers/${norm}`,
    absPath: join(PAPERS_ROOT, rel),
    grade,
    subject,
    subjectSlug,
    year,
    paperNum,
    fileUrl: `/static/papers/${norm}`,
    title: `${subject} ${grade} ${year} Paper ${paperNum}`,
  };
}

/** Discover every question-paper PDF under packages/papers/papers. */
export async function listPaperFiles(): Promise<PaperFile[]> {
  const glob = new Glob("**/*.pdf");
  const out: PaperFile[] = [];
  for await (const rel of glob.scan({ cwd: PAPERS_ROOT })) {
    const parsed = parsePaperPath(rel);
    if (parsed) out.push(parsed);
  }
  return out.sort((a, b) => a.paperCode.localeCompare(b.paperCode));
}
