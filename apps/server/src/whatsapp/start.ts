/**
 * Bot entry point.
 * Called from apps/server/src/index.ts when WHATSAPP_ENABLED=true.
 * Wires message events → per-chat mutex → central handler.
 */

import { execSync } from "node:child_process";
import { existsSync, rmSync, lstatSync, readlinkSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import os from "node:os";
import type { Hono } from "hono";
import { createClient } from "./client";
import { withChatLock } from "./middleware/mutex";
import { handleMessage } from "./router/index";

const MAX_INIT_RETRIES = 4;
const RETRY_DELAY_MS   = 3_000;

/**
 * Kill any orphaned Chrome/Chromium process that is using our session directory.
 * Works on both Linux and Windows.
 */
function killOrphanedChrome(sessionDir: string): void {
  if (process.platform === "win32") {
    try {
      execSync(
        `powershell -NoProfile -Command "` +
        `Get-CimInstance Win32_Process -Filter 'Name = \\"chrome.exe\\"' | ` +
        `Where-Object { $_.CommandLine -like '*wwebjs_auth*' } | ` +
        `ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`,
        { stdio: "ignore", timeout: 8_000 },
      );
    } catch { /* no matching processes */ }
    return;
  }

  // Linux / macOS — layered approach:
  // 1. Read SingletonLock symlink → extract the exact Chrome PID → kill it.
  //    This is the most targeted method and works even if Chrome renamed itself.
  const lockFile = join(sessionDir, "session", "SingletonLock");
  try {
    const target = readlinkSync(lockFile);          // e.g. "hostname-12345"
    const pid = parseInt(target.split("-").pop() ?? "", 10);
    if (pid > 0) {
      try { process.kill(pid, 9); } catch { /* already dead */ }
      console.log(`[whatsapp] Killed Chrome PID ${pid} from SingletonLock`);
    }
  } catch { /* lock doesn't exist or isn't a symlink */ }

  // 2. Kill every Chrome/Chromium process by binary name (catches any that
  //    were started outside of our control or have stale PIDs).
  const chromeNames = ["chrome", "google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];
  for (const name of chromeNames) {
    try {
      execSync(`pkill -9 -x ${name} 2>/dev/null; true`, { stdio: "ignore", timeout: 3_000 });
    } catch { /* binary not installed or no match */ }
  }

  // 3. Belt-and-suspenders: match any process with "chrom" in its full argv.
  try {
    execSync(
      `pids=$(pgrep -f 'chrom' 2>/dev/null); [ -n "$pids" ] && kill -9 $pids || true`,
      { stdio: "ignore", timeout: 5_000, shell: "/bin/sh" },
    );
  } catch { /* pgrep not available */ }
  console.log("[whatsapp] Sent SIGKILL to all Chrome/Chromium processes");
}

async function clearPuppeteerLockfile(sessionDir: string): Promise<void> {
  // Chrome lock-file paths differ by OS and profile layout:
  //   Linux:   SingletonLock  (symlink), SingletonSocket, SingletonCookie
  //   Windows: lockfile       (regular file)
  // We probe every known location and forcibly remove them so the next
  // initialize() call can start a fresh browser without the "already running" error.
  const base = join(sessionDir, "session");
  const candidates = [
    // Linux Chrome singleton files
    join(base, "SingletonLock"),
    join(base, "SingletonSocket"),
    join(base, "SingletonCookie"),
    join(base, "Default", "SingletonLock"),
    // Windows lockfile
    join(base, "lockfile"),
    join(base, "Default", "lockfile"),
    // Legacy session-default layout
    join(sessionDir, "session-default", "SingletonLock"),
    join(sessionDir, "session-default", "lockfile"),
  ];

  for (const candidate of candidates) {
    // lstatSync (not existsSync) so we detect dangling symlinks too
    let exists = false;
    try { lstatSync(candidate); exists = true; } catch { /* not present */ }
    if (!exists) continue;

    try {
      rmSync(candidate, { force: true });
      console.log(`[whatsapp] Removed stale lock: ${candidate}`);
    } catch (e: unknown) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === "EBUSY") {
        console.warn(`[whatsapp] Lock busy — killing Chrome and retrying…`);
        killOrphanedChrome(sessionDir);
        await sleep(1_000);
        try { rmSync(candidate, { force: true }); } catch { /* best effort */ }
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

  // Mirror the dataPath resolution used in client.ts
  const rawSessionDir = process.env.WHATSAPP_SESSION_DIR ?? "./.wwebjs_auth";
  const sessionDir = isAbsolute(rawSessionDir)
    ? rawSessionDir
    : join(os.homedir(), ".wwebjs_auth");

  for (let attempt = 1; attempt <= MAX_INIT_RETRIES; attempt++) {
    // Kill any orphaned Chrome BEFORE clearing lock files.
    // A running Chrome recreates SingletonLock the instant we delete it,
    // so the kill must happen first.
    killOrphanedChrome(sessionDir);
    // Always wait after SIGKILL — the kernel needs a moment to reap the
    // process and release the profile directory handles before we delete
    // the lock files (otherwise Chrome may not have released them yet).
    await sleep(attempt === 1 ? 1_500 : 2_500);
    await clearPuppeteerLockfile(sessionDir);

    try {
      console.log(`[whatsapp] Initialising… (attempt ${attempt}/${MAX_INIT_RETRIES})`);
      await client.initialize();
      return; // success
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isLockError = msg.includes("already running") || msg.includes("lockfile") || msg.includes("SingletonLock");

      if (isLockError && attempt < MAX_INIT_RETRIES) {
        console.warn(`[whatsapp] Browser lock on attempt ${attempt} — retrying in ${RETRY_DELAY_MS / 1000}s…`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      // Non-lock error or out of retries — propagate so the caller can log it
      throw err;
    }
  }
}
