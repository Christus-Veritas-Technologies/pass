/**
 * Bot entry point.
 * Called from apps/server/src/index.ts when WHATSAPP_ENABLED=true.
 * Wires message events → per-chat mutex → central handler.
 */

import type { Hono } from "hono";
import { createClient } from "./client";
import { withChatLock } from "./middleware/mutex";
import { handleMessage } from "./router/index";

export async function startWhatsappBot(_app: Hono): Promise<void> {
  const client = createClient();

  client.on("message", async (msg) => {
    const chatId = msg.from;
    try {
      await withChatLock(chatId, () => handleMessage(client, msg));
    } catch (err) {
      console.error(`[whatsapp] Unhandled error for chat ${chatId}:`, err);
    }
  });

  console.log("[whatsapp] Initialising…");
  await client.initialize();
}
