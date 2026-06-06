/**
 * Paper browsing flow.
 *
 * Entry flow (interactive, used when user says "papers" with no hints):
 *   startPaperBrowse() → grade picker
 *     → user picks grade → subject picker (subjects we actually have)
 *       → user picks subject → showPapers()
 *
 * Shortcut (used by NL router when subject/grade hints are present):
 *   showPapers(filter) directly — skips the setup steps.
 *
 * Numbering within the paper list is always 1–N per page so cache lookup
 * stays simple (index = n - 1).
 */

import type { Message } from "whatsapp-web.js";
import prisma from "@pass/db";
import type { PaperFilter, ConversationState } from "../types";
import {
  paperBrowseAskGrade,
  paperBrowseAskSubject,
  paperBrowseNoSubjects,
  paperBrowseNoGradeMatch,
  paperBrowseNoSubjectMatch,
} from "../utils/messages";

const PAGE_SIZE = 10;

// ── DB helpers ────────────────────────────────────────────────────────────────

export async function getAvailableGrades(): Promise<string[]> {
  const rows = await prisma.resource.findMany({
    where: { type: "PAST_PAPER" },
    select: { grade: true },
    distinct: ["grade"],
    orderBy: { grade: "asc" },
  });
  return rows.map((r) => r.grade).filter(Boolean);
}

export async function getAvailableSubjects(grade: string): Promise<string[]> {
  const rows = await prisma.resource.findMany({
    where: { type: "PAST_PAPER", grade },
    select: { subject: true },
    distinct: ["subject"],
    orderBy: { subject: "asc" },
  });
  return rows.map((r) => r.subject).filter(Boolean);
}

// ── Grade/subject fuzzy match ────────────────────────────────────────────────

/** Case-insensitive match of user input against a list of DB values. */
export function matchItem(input: string, list: string[]): string | undefined {
  const t = input.trim().toLowerCase();
  // Exact match first
  const exact = list.find((item) => item.toLowerCase() === t);
  if (exact) return exact;
  // Contains match (e.g. "maths" matches "Mathematics")
  return list.find((item) => item.toLowerCase().includes(t) || t.includes(item.toLowerCase()));
}

// ── Interactive setup entry point ─────────────────────────────────────────────

/**
 * Start the grade→subject→papers setup flow.
 *
 * If `hints.grade` is provided, skip straight to the subject step.
 * If `hints.subject` is provided (regardless of grade), skip the setup
 * entirely and show the filtered paper list.
 */
export async function startPaperBrowse(
  msg: Message,
  state: ConversationState,
  hints?: { subject?: string; grade?: string },
): Promise<{ newState: ConversationState; paperIds: string[] }> {
  // Subject hint supplied → jump directly to the paper list
  if (hints?.subject) {
    return showPapers(msg, { subject: hints.subject, grade: hints.grade }, 0, state);
  }

  // Grade hint supplied → skip the grade step, go to subject picker
  if (hints?.grade) {
    const subjects = await getAvailableSubjects(hints.grade);
    if (subjects.length === 0) {
      await msg.reply(paperBrowseNoSubjects(hints.grade));
      return { newState: { ...state, mode: { kind: "idle" } }, paperIds: [] };
    }
    await msg.reply(paperBrowseAskSubject(hints.grade, subjects));
    return {
      newState: {
        ...state,
        mode: { kind: "paper_browse_setup", step: "subject", grades: [], selectedGrade: hints.grade, subjects },
      },
      paperIds: [],
    };
  }

  // No hints → show grade picker
  const grades = await getAvailableGrades();
  if (grades.length === 0) {
    await msg.reply("No papers are available right now. Please try again later.");
    return { newState: { ...state, mode: { kind: "idle" } }, paperIds: [] };
  }
  await msg.reply(paperBrowseAskGrade(grades));
  return {
    newState: { ...state, mode: { kind: "paper_browse_setup", step: "grade", grades } },
    paperIds: [],
  };
}

/**
 * Handle a user reply during the grade/subject setup steps.
 * Returns the new state and (once setup is complete) the first page's paper IDs.
 */
export async function handlePaperBrowseSetup(
  msg: Message,
  text: string,
  state: ConversationState,
): Promise<{ newState: ConversationState; paperIds: string[] }> {
  if (state.mode.kind !== "paper_browse_setup") return { newState: state, paperIds: [] };
  const m = state.mode;

  if (m.step === "grade") {
    // Try number select first
    const n = parseInt(text.trim(), 10);
    const chosen = (!isNaN(n) && n >= 1 && n <= m.grades.length)
      ? m.grades[n - 1]!
      : matchItem(text, m.grades);

    if (!chosen) {
      await msg.reply(paperBrowseNoGradeMatch(text.trim()));
      return { newState: state, paperIds: [] };
    }

    const subjects = await getAvailableSubjects(chosen);
    if (subjects.length === 0) {
      await msg.reply(paperBrowseNoSubjects(chosen));
      return { newState: { ...state, mode: { kind: "idle" } }, paperIds: [] };
    }

    await msg.reply(paperBrowseAskSubject(chosen, subjects));
    return {
      newState: {
        ...state,
        mode: { kind: "paper_browse_setup", step: "subject", grades: m.grades, selectedGrade: chosen, subjects },
      },
      paperIds: [],
    };
  }

  // step === "subject"
  const subjects = m.subjects ?? [];
  const grade = m.selectedGrade ?? "";

  // "back" → return to grade picker
  if (/^back\s*$/i.test(text.trim())) {
    await msg.reply(paperBrowseAskGrade(m.grades));
    return {
      newState: { ...state, mode: { kind: "paper_browse_setup", step: "grade", grades: m.grades } },
      paperIds: [],
    };
  }

  const n = parseInt(text.trim(), 10);
  const chosen = (!isNaN(n) && n >= 1 && n <= subjects.length)
    ? subjects[n - 1]!
    : matchItem(text, subjects);

  if (!chosen) {
    await msg.reply(paperBrowseNoSubjectMatch(text.trim(), grade));
    return { newState: state, paperIds: [] };
  }

  return showPapers(msg, { grade, subject: chosen }, 0, { ...state, mode: { kind: "idle" } });
}

function buildPaperList(
  papers: Array<{ id: string; title: string; grade: string; year: number; questionCount: number }>,
  page: number,
  total: number,
  hasMore: boolean,
): string {
  const from = page * PAGE_SIZE + 1;
  const to   = page * PAGE_SIZE + papers.length;

  const lines = papers.map(
    // Numbers always start from 1 on every page — cache index = n - 1
    (p, i) => `*${i + 1}.* ${p.title} (${p.questionCount} q)`,
  );

  const header =
    total > PAGE_SIZE
      ? `📚 Papers ${from}–${to} of *${total}*:\n\n`
      : `📚 *${total}* paper${total !== 1 ? "s" : ""} found:\n\n`;

  let msg = `${header}${lines.join("\n")}\n\nReply the *number* to study, or *download N* to get the PDF (e.g. _download 2_).`;
  if (hasMore) msg += `\nReply *more* to see the next ${Math.min(PAGE_SIZE, total - to)} papers.`;
  return msg;
}

export async function showPapers(
  msg: Message,
  filter: PaperFilter,
  page: number,
  state: ConversationState,
): Promise<{ newState: ConversationState; paperIds: string[] }> {
  const where: Record<string, unknown> = { type: "PAST_PAPER" };
  if (filter.subject) where.subject = { contains: filter.subject, mode: "insensitive" };
  if (filter.grade)   where.grade   = { contains: filter.grade,   mode: "insensitive" };
  if (filter.year)    where.year    = filter.year;

  // Fetch total count and current page in parallel
  const [total, papers] = await Promise.all([
    prisma.resource.count({ where }),
    prisma.resource.findMany({
      where,
      orderBy: [{ subject: "asc" }, { grade: "asc" }, { year: "desc" }],
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      select: { id: true, title: true, grade: true, year: true, questionCount: true },
    }),
  ]);

  const hasMore = papers.length > PAGE_SIZE;
  const slice   = papers.slice(0, PAGE_SIZE);

  if (slice.length === 0) {
    const suggestion = filter.subject || filter.grade || filter.year
      ? `I couldn't find any papers matching that filter.\n\nReply *papers* to see all ${total > 0 ? total : "available"} papers.`
      : "I couldn't find any papers right now — please try again in a moment.";
    await msg.reply(suggestion);
    return { newState: { ...state, mode: { kind: "idle" } }, paperIds: [] };
  }

  await msg.reply(buildPaperList(slice, page, total, hasMore));

  return {
    newState: { ...state, mode: { kind: "browsing_papers", filter, page } },
    paperIds: slice.map((p) => p.id),
  };
}

// ── Per-chat paper-ID index ───────────────────────────────────────────────────
// Holds only the *current page* IDs. Numbers displayed are always 1–N per page
// so n - 1 is a valid index into this array regardless of which page is active.

const paperListCache = new Map<string, string[]>();

export function setPaperListCache(whatsappId: string, ids: string[]): void {
  paperListCache.set(whatsappId, ids);
}

export function getPaperFromCache(whatsappId: string, n: number): string | undefined {
  return paperListCache.get(whatsappId)?.[n - 1];
}
