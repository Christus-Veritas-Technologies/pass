/**
 * Paper browsing flow.
 * Lists available past papers with optional subject/grade/year filtering.
 * Students reply with a number to select a paper.
 */

import type { Message } from "whatsapp-web.js";
import prisma from "@pass/db";
import type { PaperFilter, ConversationState } from "../types";

const PAGE_SIZE = 5;

function buildPaperList(
  papers: Array<{ id: string; title: string; year: number; questionCount: number }>,
  page: number,
  hasMore: boolean,
): string {
  const lines = papers.map(
    (p, i) => `*${page * PAGE_SIZE + i + 1}.* ${p.title} (${p.questionCount} questions)`,
  );
  let msg = `Here are the papers I found:\n\n${lines.join("\n")}\n\nSend the *number* to start.`;
  if (hasMore) msg += `\nReply _more_ to see more papers.`;
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

  const papers = await prisma.resource.findMany({
    where,
    orderBy: [{ year: "desc" }, { subject: "asc" }],
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    select: { id: true, title: true, year: true, questionCount: true },
  });

  const hasMore = papers.length > PAGE_SIZE;
  const slice = papers.slice(0, PAGE_SIZE);

  if (slice.length === 0) {
    await msg.reply("I couldn't find any papers matching that. Try _\"papers\"_ to see all.");
    return { newState: { ...state, mode: { kind: "idle" } }, paperIds: [] };
  }

  await msg.reply(buildPaperList(slice, page, hasMore));

  return {
    newState: { ...state, mode: { kind: "browsing_papers", filter, page } },
    paperIds: slice.map((p) => p.id),
  };
}

// Per-chat paper-ID index so numeric replies resolve to a resource ID
const paperListCache = new Map<string, string[]>();

export function setPaperListCache(whatsappId: string, ids: string[]): void {
  paperListCache.set(whatsappId, ids);
}

export function getPaperFromCache(whatsappId: string, n: number): string | undefined {
  return paperListCache.get(whatsappId)?.[n - 1];
}
