/**
 * Paper browsing flow.
 * Lists available past papers with optional subject/grade/year filtering.
 * Students reply with a number to select a paper.
 *
 * Numbering is always 1–N relative to the *current page*, not cumulative.
 * This keeps cache lookup simple (index = n - 1) and avoids the off-by-page
 * bug where page-2 cumulative numbers exceeded the cache length.
 */

import type { Message } from "whatsapp-web.js";
import prisma from "@pass/db";
import type { PaperFilter, ConversationState } from "../types";

const PAGE_SIZE = 10;

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

  let msg = `${header}${lines.join("\n")}\n\nSend the *number* to start studying.`;
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
