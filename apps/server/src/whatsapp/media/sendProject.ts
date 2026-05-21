/**
 * Sends a generated project PDF to a WhatsApp chat.
 * Handles R2-hosted (fromUrl) and tmp-file (fromFilePath) cases.
 * Falls back to sending chunked text if PDF is unavailable.
 */

import { MessageMedia } from "whatsapp-web.js";
import type { Client, MessageSendOptions } from "whatsapp-web.js";
import type { Project } from "@pass/db";
import { renderProjectPdfAndUpload, estimatePageCount } from "./renderProjectPdf";
import { chunkMessage } from "../utils/format";
import { projectDoneMessage, projectFallbackMessage } from "../utils/messages";

export async function sendProjectPdf(
  client: Client,
  chatId: string,
  project: Project,
): Promise<void> {
  let pdfUrl = project.pdfUrl;
  if (!pdfUrl) pdfUrl = await renderProjectPdfAndUpload(project);

  const pages   = estimatePageCount(project.content);
  const caption = projectDoneMessage(project.subject, project.topic, pages);

  if (pdfUrl) {
    try {
      let media: InstanceType<typeof MessageMedia>;
      if (pdfUrl.startsWith("file://")) {
        media = MessageMedia.fromFilePath(pdfUrl.replace("file://", ""));
      } else {
        media = await MessageMedia.fromUrl(pdfUrl, { unsafeMime: true });
      }
      await client.sendMessage(chatId, media, {
        sendMediaAsDocument: true,
        caption,
      } as MessageSendOptions);
      return;
    } catch (err) {
      console.error("[whatsapp] sendProjectPdf failed:", err);
    }
  }

  // Fallback: send the project URL + first text chunk
  await client.sendMessage(chatId, projectFallbackMessage(project.id));
  const preview = chunkMessage(project.content)[0];
  if (preview) await client.sendMessage(chatId, preview);
}
