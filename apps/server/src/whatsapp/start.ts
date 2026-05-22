/**
 * Bot entry point.
 * Called from apps/server/src/index.ts when WHATSAPP_ENABLED=true.
 * Wires message events → per-chat mutex → central handler.
 */

import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Hono } from "hono";
import { createClient } from "./client";
import { withChatLock } from "./middleware/mutex";
import { handleMessage } from "./router/index";

const MAX_INIT_RETRIES = 4;
const RETRY_DELAY_MS   = 3_000;

/**
 * On Windows, when bun hot-reloads it kills the JS process but leaves the
 * puppeteer-launched Chromium orphaned and still holding the lockfile open
 * (EBUSY). rmSync can't delete a file that an open process has locked.
 *
 * Fix: before touching the lockfile, find and kill any Chrome process whose
 * command line contains our specific session dir, wait a moment for the OS
 * to release the file handle, then delete it.
 */
function killOrphanedChrome(sessionDir: string): void {
  if (process.platform !== "win32") return;

  // Normalise to forward slashes so the PowerShell -like pattern is simpler
  const needle = sessionDir.replace(/\\/g, "/");
  try {
    execSync(
      `powershell -NoProfile -Command "` +
      `Get-CimInstance Win32_Process -Filter 'Name = \\"chrome.exe\\"' | ` +
      `Where-Object { $_.CommandLine -like '*wwebjs_auth*' } | ` +
      `ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`,
      { stdio: "ignore", timeout: 8_000 }
    );
    console.log(`[whatsapp] Killed orphaned Chrome processes for: ${needle}`);
  } catch {
    // No matching processes or powershell unavailable — safe to continue
  }
}

async function clearPuppeteerLockfile(sessionDir: string): Promise<void> {
  // LocalAuth stores sessions under <sessionDir>/session/
  // The lockfile can appear at several paths depending on Chrome's profile layout.
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
      } catch (e: unknown) {
        const code = (e as NodeJS.ErrnoException).code;
        if (code === "EBUSY") {
          // File still locked — Chrome is still alive. Kill it, wait, retry once.
          console.warn(`[whatsapp] Lockfile busy — killing orphaned Chrome and retrying…`);
          killOrphanedChrome(sessionDir);
          // Give the OS 1 s to release the file handle after the process dies
          await sleep(1_000);
          try {
            rmSync(candidate, { force: true });
            console.log(`[whatsapp] Removed stale lockfile (after kill): ${candidate}`);
          } catch (e2) {
            console.warn(`[whatsapp] Could not remove lockfile ${candidate}:`, e2);
          }
        } else {
          console.warn(`[whatsapp] Could not remove lockfile ${candidate}:`, e);
        }
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
    await clearPuppeteerLockfile(sessionDir);

    try {
      console.log(`[whatsapp] Initialising… (attempt ${attempt}/${MAX_INIT_RETRIES})`);
      await client.initialize();
      return; // success
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isLockError = msg.includes("already running") || msg.includes("lockfile");

      if (isLockError && attempt < MAX_INIT_RETRIES) {
        console.warn(`[whatsapp] Browser lock detected — killing orphaned Chrome and retrying in ${RETRY_DELAY_MS / 1000}s…`);
        killOrphanedChrome(sessionDir);
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      // Non-lock error or out of retries — propagate so the caller can log it
      throw err;
    }
  }
}
