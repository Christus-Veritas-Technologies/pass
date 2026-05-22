/**
 * Bot entry point.
 * Called from apps/server/src/index.ts when WHATSAPP_ENABLED=true.
 * Wires message events → per-chat mutex → central handler.
 */

import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Hono } from "hono";
import { createClient } from "./client";
import { withChatLock } from "./middleware/mutex";
import { handleMessage } from "./router/index";

const MAX_INIT_RETRIES = 3;
const RETRY_DELAY_MS   = 5_000;

/**
 * Puppeteer leaves a lockfile when the process dies without a clean shutdown
 * (hot-reload, crash, SIGKILL). On the next start the lockfile makes Chrome
 * think another instance is already running and it throws. We delete it first
 * so every start is clean.
 */
function clearPuppeteerLockfile(sessionDir: string): void {
  // LocalAuth stores sessions under <sessionDir>/session-<name>/Default/
  // The lockfile itself can appear at several paths depending on the OS.
  const candidates = [
    join(sessionDir, "session", "lockfile"),
    join(sessionDir, "session", "Default", "lockfile"),
    join(sessionDir, "session-default", "lockfile"),
    join(sessionDir, "session-default", "Default", "lockfile"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      try {
        rmSync(candidate, { force: true });
        console.log(`[whatsapp] Removed stale lockfile: ${candidate}`);
      } catch (e) {
        console.warn(`[whatsapp] Could not remove lockfile ${candidate}:`, e);
      }
    }
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

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

  // Resolve the session directory (mirrors the LocalAuth dataPath)
  const sessionDir = process.env.WHATSAPP_SESSION_DIR
    ? join(process.cwd(), process.env.WHATSAPP_SESSION_DIR)
    : join(process.cwd(), ".wwebjs_auth");

  for (let attempt = 1; attempt <= MAX_INIT_RETRIES; attempt++) {
    clearPuppeteerLockfile(sessionDir);

    try {
      console.log(`[whatsapp] Initialising… (attempt ${attempt}/${MAX_INIT_RETRIES})`);
      await client.initialize();
      return; // success
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isLockError = msg.includes("already running") || msg.includes("lockfile");

      if (isLockError && attempt < MAX_INIT_RETRIES) {
        console.warn(`[whatsapp] Browser lock detected — retrying in ${RETRY_DELAY_MS / 1000}s…`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      // Non-lock error or out of retries — propagate so the caller can log it
      throw err;
    }
  }
}
