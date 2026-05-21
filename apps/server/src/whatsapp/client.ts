/**
 * WhatsApp Web client singleton.
 * Manages the wwebjs lifecycle: QR → authenticated → ready → disconnected.
 */

import { existsSync } from "fs";
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

  _client = new Client({
    authStrategy: new LocalAuth({ dataPath: env.WHATSAPP_SESSION_DIR }),
    puppeteer: {
      headless: true,
      executablePath: resolveChromePath(),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
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

  _client.on("ready", () => {
    console.log("[whatsapp] Ready ✓");
    setConnected(true);
    // Expose the Puppeteer browser instance for PDF rendering
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

  return _client;
}
