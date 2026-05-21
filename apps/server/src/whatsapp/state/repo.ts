/**
 * Persistence layer for WhatsApp conversation state.
 * Uses Postgres as the source of truth; the in-memory LRU cache (cache.ts)
 * is consulted first on reads to avoid unnecessary DB round-trips.
 */

import prisma from "@pass/db";
import { cacheGet, cacheSet } from "./cache";
import { DEFAULT_STATE, type ConversationState } from "../types";

export async function loadState(whatsappId: string): Promise<ConversationState> {
  const cached = cacheGet(whatsappId);
  if (cached) return cached;

  const row = await prisma.whatsappConversation.findUnique({ where: { whatsappId } });
  const state = (row?.state as ConversationState | null) ?? { ...DEFAULT_STATE };
  cacheSet(whatsappId, state);
  return state;
}

export async function saveState(whatsappId: string, state: ConversationState): Promise<void> {
  state.lastMessageAt = new Date().toISOString();

  await prisma.whatsappConversation.upsert({
    where: { whatsappId },
    create: {
      whatsappId,
      state: state as object,
      lastMessageAt: new Date(),
    },
    update: {
      state: state as object,
      lastMessageAt: new Date(),
    },
  });

  cacheSet(whatsappId, state);
}

export async function bindUser(whatsappId: string, userId: string): Promise<void> {
  await prisma.whatsappConversation.upsert({
    where: { whatsappId },
    create: { whatsappId, userId, state: DEFAULT_STATE as object },
    update: { userId },
  });
}

export async function getLinkedUserId(whatsappId: string): Promise<string | null> {
  const row = await prisma.whatsappConversation.findUnique({
    where: { whatsappId },
    select: { userId: true },
  });
  return row?.userId ?? null;
}

export async function purgeStaleConversations(days = 30): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1_000);
  const result = await prisma.whatsappConversation.deleteMany({
    where: { lastMessageAt: { lt: cutoff }, userId: null },
  });
  return result.count;
}
