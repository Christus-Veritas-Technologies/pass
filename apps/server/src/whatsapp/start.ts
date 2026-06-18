/**
 * Bot entry point.
 * Called from apps/server/src/index.ts when WHATSAPP_ENABLED=true.
 * Wires message events → per-chat mutex → central handler.
 */

import { execSync } from "node:child_process";
import { rmSync, lstatSync, readlinkSync, mkdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import os from "node:os";
import type { Hono } from "hono";
import { createClient, destroyClient, setOnDisconnected } from "./client";
import { withChatLock } from "./middleware/mutex";
import { handleMessage } from "./router/index";

const MAX_INIT_RETRIES = 4;
const RETRY_DELAY_MS   = 3_000;

// whatsapp-web.js can silently stop emitting "message" events (a known,
// unresolved upstream issue — the client stays "ready" while its internal
// WhatsApp Web event hooks break, e.g. after WhatsApp ships a web-client
// update) with no error to detect. There's no reliable way to notice this
// from the outside, so we bound the blast radius with a periodic forced
// restart instead of waiting for a human to notice the bot has gone silent.
const RESTART_INTERVAL_MS = (Number(process.env.WHATSAPP_RESTART_INTERVAL_HOURS) || 12) * 60 * 60 * 1000;
let restartTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRestart(app: Hono): void {
  if (restartTimer) clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    console.log("[whatsapp] Scheduled restart — refreshing the session to recover from any silent event-capture failures.");
    startWhatsappBot(app).catch((e) => console.error("[whatsapp] Scheduled restart error:", e));
  }, RESTART_INTERVAL_MS);
}

/**
 * Kill every Chrome/Chromium process on this machine.
 * On Linux: reads the SingletonLock to get the exact PID first, then
 * falls back to pkill by name and pgrep -f as belt-and-suspenders.
 * On Windows: stops chrome.exe via PowerShell.
 */
function killAllChrome(sessionDir: string): void {
  if (process.platform === "win32") {
    try {
      execSync(
        `powershell -NoProfile -Command "Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force"`,
        { stdio: "ignore", timeout: 8_000 },
      );
    } catch { /* no chrome running */ }
    return;
  }

  // 1. Read SingletonLock → targeted PID kill (most precise).
  const lockFile = join(sessionDir, "session", "SingletonLock");
  try {
    const target = readlinkSync(lockFile); // e.g. "hostname-12345"
    const pid = parseInt(target.split("-").pop() ?? "", 10);
    if (pid > 0) {
      try { process.kill(pid, 9); } catch { /* already dead */ }
    }
  } catch { /* no lock or not a symlink */ }

  // 2. Kill by binary name.
  for (const name of ["chrome", "google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    try { execSync(`pkill -9 -x ${name} 2>/dev/null; true`, { stdio: "ignore", timeout: 3_000 }); }
    catch { /* not installed */ }
  }

  // 3. Kill anything with "chrom" in its argv (catches snap/flatpak variants).
  try {
    execSync(
      `pids=$(pgrep -f 'chrom' 2>/dev/null); [ -n "$pids" ] && kill -9 $pids; true`,
      { stdio: "ignore", timeout: 5_000, shell: "/bin/sh" },
    );
  } catch { /* pgrep unavailable */ }
}

/**
 * Create the session directory tree, then fix permissions recursively so
 * Chrome can always read and write its profile files. Uses `chmod -R 755`
 * because a prior crashed Chrome may have left subdirectories with mode 700
 * owned by a different UID.
 */
function ensureSessionDirPerms(sessionDir: string): void {
  for (const d of [sessionDir, join(sessionDir, "session")]) {
    try { mkdirSync(d, { recursive: true }); } catch { /* already exists */ }
  }
  if (process.platform !== "win32") {
    try {
      execSync(`chmod -R 755 "${sessionDir}"`, { stdio: "ignore", timeout: 5_000 });
    } catch { /* best effort */ }
  }
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
        killAllChrome(sessionDir);
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
  console.log("[whatsapp] Starting bot…");

  // Mirror the dataPath resolution used in client.ts
  const rawSessionDir = process.env.WHATSAPP_SESSION_DIR ?? "./.wwebjs_auth";
  const sessionDir = isAbsolute(rawSessionDir)
    ? rawSessionDir
    : join(os.homedir(), ".wwebjs_auth");

  // ── Startup cleanup ───────────────────────────────────────────────────────
  // When PM2 reloads the server it kills the Node process but NOT Puppeteer's
  // Chrome child process — Chrome becomes an orphan and keeps the profile
  // directory locked. Kill it once at startup, wait for the kernel to release
  // the socket, then clear stale lock files and fix any broken permissions
  // before attempting the first initialize().
  console.log("[whatsapp] Startup: cleaning up any orphaned Chrome…");
  killAllChrome(sessionDir);
  await sleep(3_000); // wait for kernel to release the profile socket
  await clearPuppeteerLockfile(sessionDir);
  ensureSessionDirPerms(sessionDir);
  // ─────────────────────────────────────────────────────────────────────────

  for (let attempt = 1; attempt <= MAX_INIT_RETRIES; attempt++) {
    // Destroy any stale client from a previous attempt so Puppeteer's
    // internal state (browser process handle, event listeners) is fully reset.
    await destroyClient();

    // Fresh client for this attempt — message handler re-registered each time.
    const client = createClient();
    // Route runtime disconnects through this same clean-restart cycle instead
    // of letting client.ts re-initialize the same (now-stale) Client instance.
    setOnDisconnected(() => {
      startWhatsappBot(_app).catch((e) => console.error("[whatsapp] Reconnect restart error:", e));
    });
    client.on("message", async (msg) => {
      const chatId = msg.from;
      console.log("Message received", msg.body);
      try {
        await withChatLock(chatId, () => handleMessage(client, msg));
      } catch (err) {
        console.error(`[whatsapp] Unhandled error for chat ${chatId}:`, err);
      }
    });

    try {
      console.log(`[whatsapp] Initialising… (attempt ${attempt}/${MAX_INIT_RETRIES})`);
      await client.initialize();
      scheduleRestart(_app);
      return; // success — keep this client alive
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isLockError =
        msg.includes("already running") ||
        msg.includes("Failed To Create") ||
        msg.includes("lockfile") ||
        msg.includes("SingletonLock") ||
        msg.includes("ProcessSingleton");

      if (attempt < MAX_INIT_RETRIES) {
        if (isLockError) {
          // Only kill Chrome and clear lock files when we actually hit a lock
          // error. Killing pre-emptively on every attempt was wrong: it
          // terminated a successfully-started Chrome before the "ready" event
          // fired, causing an infinite restart loop.
          console.warn(`[whatsapp] Browser lock on attempt ${attempt} — killing Chrome and retrying in ${RETRY_DELAY_MS / 1000}s…`);
          killAllChrome(sessionDir);
          // SIGKILL is instant but the kernel needs time to release the profile
          // socket before a new Chrome can claim it.
          await sleep(attempt === 1 ? 2_000 : 4_000);
          await clearPuppeteerLockfile(sessionDir);
        } else {
          console.warn(`[whatsapp] Init failed on attempt ${attempt} — retrying in ${RETRY_DELAY_MS / 1000}s…`);
          await sleep(RETRY_DELAY_MS);
        }
        continue;
      }

      // All retries exhausted. Log and schedule a long retry rather than
      // throwing — throwing would crash the server and trigger a PM2 rapid
      // restart loop (7000+ restarts!) where new instances race against each
      // other's Chrome processes and perpetuate the lock.
      console.error(`[whatsapp] All ${MAX_INIT_RETRIES} attempts failed. Retrying in 60s…`, err);
      setTimeout(() => {
        startWhatsappBot(_app).catch((e) => console.error("[whatsapp] Scheduled retry error:", e));
      }, 60_000);
      return; // ← don't throw: server stays up, PM2 stops restarting
    }
  }
}
