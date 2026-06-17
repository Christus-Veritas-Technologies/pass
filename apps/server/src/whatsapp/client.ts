/**
 * WhatsApp Web client singleton.
 * Manages the wwebjs lifecycle: QR → authenticated → ready → disconnected.
 */

import { existsSync } from "fs";
import { isAbsolute, join } from "node:path";
import os from "node:os";
import { Client, LocalAuth } from "whatsapp-web.js";
import qrcodeTerminal from "qrcode-terminal";
import { env } from "@pass/env/server";
import { setQr, setConnected } from "./admin/qrEndpoint";
import { setBrowser } from "./media/renderProjectPdf";

function resolveChromePath(): string | undefined {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    // Windows
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA
      ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
      : "",
    // Linux
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p));
}

let _client: Client | null = null;

export function getClient(): Client {
  if (!_client) throw new Error("WhatsApp client not initialised");
  return _client;
}

export function createClient(): Client {
  if (_client) return _client;

  // Resolve relative session paths to the home directory so the session files
  // land outside the project tree. This prevents bun --hot from detecting the
  // LocalAuth JSON writes and restarting the server before "ready" fires.
  const rawSessionDir = env.WHATSAPP_SESSION_DIR;
  const dataPath = isAbsolute(rawSessionDir)
    ? rawSessionDir
    : join(os.homedir(), ".wwebjs_auth");

  _client = new Client({
    authStrategy: new LocalAuth({ dataPath }),
    // If WhatsApp Web thinks this session is "open on another window" (a stale
    // orphaned session, or a previous container that didn't shut down cleanly),
    // the page sits forever on the conflict screen and "ready" never fires.
    // Forcibly take over so post-auth sync can proceed to the MAIN state.
    takeoverOnConflict: true,
    takeoverTimeoutMs: 10_000,
    // Give the post-authentication sync more headroom before wwebjs gives up.
    authTimeoutMs: 120_000,
    puppeteer: {
      headless: true,
      executablePath: resolveChromePath(),
      // Dump Chrome stdout/stderr so we can see exactly what it prints
      // before Puppeteer parses the logs (helps diagnose singleton errors).
      dumpio: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        // No first-run setup wizard that can interfere with startup
        "--no-first-run",
        // Disable crash reporter (reduces file/socket noise)
        "--disable-breakpad",
        // Disable extensions to reduce startup surface
        "--disable-extensions",
        // Keep the audio service in-process so Chrome doesn't try to fork an
        // audio daemon (which fails on a headless server with no sound card and
        // can stall page initialisation waiting for the daemon to respond).
        "--disable-features=AudioServiceOutOfProcess",
      ],
    },
  });

  _client.on("qr", (qr) => {
    console.log("[whatsapp] QR received — scan to pair:");
    qrcodeTerminal.generate(qr, { small: true });
    setQr(qr);
    setConnected(false);
  });

  _client.on("authenticated", () => {
    console.log("[whatsapp] Authenticated ✓");
  });

  // Post-auth sync visibility. If the bot authenticates but never goes "ready",
  // these tell us exactly where it stalls: loading_screen reports the sync
  // percentage, change_state reports WhatsApp's connection state machine
  // (e.g. CONFLICT / UNPAIRED / OPENING / PAIRING / CONNECTED).
  _client.on("loading_screen", (percent, message) => {
    console.log(`[whatsapp] Loading: ${percent}% — ${message}`);
  });

  _client.on("change_state", (state) => {
    console.log(`[whatsapp] State: ${state}`);
  });

  _client.on("ready", () => {
    console.log("[whatsapp] Ready ✓");
    setConnected(true);
    // Keep a reference so isBrowserReady() / setBrowser() remain satisfied
    // (PDF rendering now uses @react-pdf/renderer, not Puppeteer directly)
    const browser = (_client as unknown as { pupBrowser?: unknown }).pupBrowser;
    if (browser) setBrowser(browser as Parameters<typeof setBrowser>[0]);
  });

  _client.on("disconnected", (reason) => {
    console.warn("[whatsapp] Disconnected:", reason);
    setConnected(false);
    setTimeout(() => {
      console.log("[whatsapp] Attempting to reconnect…");
      _client?.initialize().catch((e) => console.error("[whatsapp] Reinit error:", e));
    }, 10_000);
  });

  // Without an error handler, an unhandled 'error' event crashes the entire
  // Bun/Node process (EventEmitter throws by default). This is what causes the
  // 7000+ PM2 restart loop — Puppeteer emits 'error' when Chrome exits
  // unexpectedly, PM2 sees the crash and restarts immediately, the new instance
  // races with the dying Chrome, and the cycle repeats.
  _client.on("error", (err) => {
    console.error("[whatsapp] Client error (non-fatal):", err);
  });

  return _client;
}

/**
 * Destroy the current client and reset the singleton so the next
 * createClient() call starts completely fresh. Call this after a failed
 * initialize() so stale Puppeteer state doesn't poison the next attempt.
 */
export async function destroyClient(): Promise<void> {
  if (!_client) return;
  try { await _client.destroy(); } catch { /* already gone */ }
  _client = null;
}
