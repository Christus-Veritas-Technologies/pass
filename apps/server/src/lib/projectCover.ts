/**
 * Cover-page field derivation — the single source of truth for the project
 * cover sheet, shared by all three renderers (PDF, HTML, DOCX).
 *
 * The cover is a plain bordered sheet of `LABEL : value` rows matching the
 * ZIMSEC candidate-information format:
 *
 *   SURNAME, NAME, SCHOOL, CENTRE NUMBER, CANDIDATE NUMBER, LEVEL,
 *   ACADEMIC YEAR, DISTRICT, PROVINCE, LEARNING AREA, PROJECT TITLE
 *
 * Some values are derived rather than stored: SURNAME/NAME are a best-effort
 * split of the single `studentName`, LEVEL maps from grade, and ACADEMIC YEAR
 * is a span derived from `createdAt`. District/Province are collected fields.
 */

import type { Project } from "@pass/db";
import { isALevel, isGrade7 } from "../mastra/project/sections";

const DASH = "—";

/** Treat empty strings and the "_" placeholder (set by the WhatsApp brief) as blank. */
function present(v: unknown): string {
  const s = String(v ?? "").trim();
  return s && s !== "_" ? s : "";
}

/**
 * Best-effort split of a single full name into surname + remaining names.
 * The LAST whitespace token is taken as the surname, everything before it as
 * the name(s). A single token becomes the surname with an empty name.
 *   "Delay A Muzaruwetu" -> { surname: "Muzaruwetu", name: "Delay A" }
 *   "Muzaruwetu"         -> { surname: "Muzaruwetu", name: "" }
 */
export function splitName(studentName: unknown): { surname: string; name: string } {
  const full = present(studentName);
  if (!full) return { surname: "", name: "" };
  const parts = full.split(/\s+/);
  if (parts.length === 1) return { surname: parts[0]!, name: "" };
  const surname = parts[parts.length - 1]!;
  const name = parts.slice(0, -1).join(" ");
  return { surname, name };
}

/** ZIMSEC level label derived from the grade. */
export function levelLabel(grade: string): string {
  if (isALevel(grade)) return "ADVANCED";
  if (isGrade7(grade)) return "JUNIOR";
  return "ORDINARY";
}

/** Academic-year span, e.g. a project created in 2025 -> "2025-2026". */
export function academicYearSpan(createdAt: Date | string | number): string {
  const year = new Date(createdAt).getFullYear();
  return `${year}-${year + 1}`;
}

export type CoverRow = { label: string; value: string };

/**
 * Ordered cover rows for a project. Blank values render as an em dash so the
 * layout stays stable when optional fields (district/province/numbers) are
 * absent.
 */
export function coverFieldRows(project: Project): CoverRow[] {
  const { surname, name } = splitName(project.studentName);
  const row = (label: string, value: string): CoverRow => ({ label, value: value || DASH });
  return [
    row("SURNAME", surname),
    row("NAME", name),
    row("SCHOOL", present(project.schoolName)),
    row("CENTRE NUMBER", present(project.centreNumber)),
    row("CANDIDATE NUMBER", present(project.candidateNumber)),
    row("LEVEL", levelLabel(project.grade)),
    row("ACADEMIC YEAR", academicYearSpan(project.createdAt)),
    row("DISTRICT", present(project.district)),
    row("PROVINCE", present(project.province)),
    row("LEARNING AREA", present(project.subject)),
    row("PROJECT TITLE", present(project.topic)),
  ];
}
