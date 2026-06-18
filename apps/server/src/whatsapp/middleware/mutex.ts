/**
 * Per-chat serialisation mutex.
 *
 * WhatsApp can deliver a new message before we've finished processing the
 * previous one.  Without serialisation two concurrent handlers can read the
 * same state, both modify it, and the second write wins — losing the first.
 *
 * We maintain a Map<chatId, Promise<void>>.  Each new message awaits the
 * previous promise then replaces it with its own, guaranteeing sequential
 * processing per chat while allowing full concurrency across chats.
 */

const locks = new Map<string, Promise<void>>();

/** Drop all pending locks. Call this when the client is destroyed so stale
 *  promise chains from the dead client don't block the next client's messages. */
export function clearAllLocks(): void {
  locks.clear();
}

export function withChatLock<T>(chatId: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(chatId) ?? Promise.resolve();

  const next = prev.then(() => fn()).finally(() => {
    if (locks.get(chatId) === next) locks.delete(chatId);
  });

  locks.set(chatId, next as unknown as Promise<void>);
  return next;
}
