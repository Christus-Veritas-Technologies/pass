/**
 * Sends a past-paper PDF to a WhatsApp chat.
 * Papers live in packages/papers/papers/{grade}/{slug}/{year}/paper_*.pdf
 * and are served at /static/papers/*. We resolve the path on disk directly
 * so we don't need an HTTP round-trip.
 */

import { join } from "node:path";
import { MessageMedia } from "whatsapp-web.js";
import type { Client, MessageSendOptions } from "whatsapp-web.js";
import type { Resource } from "@pass/db";

// import.meta.dir → apps/server/src/whatsapp/media
// go up 5 levels to the repo root, then into packages/papers/papers
const PAPERS_DIR = join(import.meta.dir, "../../../../..", "packages", "papers", "papers");

export async function sendPaperPdf(
  client: Client,
  chatId: string,
  resource: Resource,
): Promise<boolean> {
  try {
    // fileUrl looks like "/static/papers/O-Level/maths/2024/paper_1.pdf"
    const rel = resource.fileUrl.replace(/^\/static\/papers\//, "");
    const abs = join(PAPERS_DIR, rel);

    const media = MessageMedia.fromFilePath(abs);
    await client.sendMessage(chatId, media, {
      sendMediaAsDocument: true,
      caption: `${resource.title} — ${resource.year}`,
    } as MessageSendOptions);

    return true;
  } catch (err) {
    console.error(`[whatsapp] sendPaperPdf failed for ${resource.id}:`, err);
    return false;
  }
}
