/**
 * In-process LRU cache for conversation state.
 * Prevents a Postgres read on every incoming message.
 * All writes still go to Postgres immediately.
 */

import type { ConversationState } from "../types";

const MAX_ENTRIES = 5_000;

const store = new Map<string, ConversationState>();

export function cacheGet(whatsappId: string): ConversationState | undefined {
  return store.get(whatsappId);
}

export function cacheSet(whatsappId: string, state: ConversationState): void {
  if (store.size >= MAX_ENTRIES && !store.has(whatsappId)) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(whatsappId, state);
}

export function cacheDel(whatsappId: string): void {
  store.delete(whatsappId);
}
