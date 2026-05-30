/**
 * Conversation memory for the WhatsApp chat tutor (passAgent).
 *
 * Backed by the shared Postgres store. We keep the last ~15 messages per thread
 * so the tutor has multi-turn context (e.g. "explain that more simply") without
 * letting the context window grow unbounded.
 *
 * Threading convention (set at call time):
 *   resource = userId      (stable per Pass account)
 *   thread   = whatsappId  (stable per WhatsApp chat)
 */

import { Memory } from "@mastra/memory";
import { mastraStorage } from "./storage";

export const chatMemory = new Memory({
  storage: mastraStorage,
  options: {
    lastMessages: 15,
  },
});
