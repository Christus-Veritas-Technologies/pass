/**
 * Sends a generated project PDF to a WhatsApp chat.
 * Constructs a MessageMedia from the PDF bytes with a descriptive HBC filename.
 * Falls back to text chunks if PDF rendering is unavailable.
 */

import { readFile } from "node:fs/promises";
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

  // Build a descriptive filename
  const safeSubject = project.subject.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = project.candidateNumber
    ? `HBC_Project_${project.candidateNumber}_${safeSubject}.pdf`
    : `Pass_Project_${project.id.slice(-8)}.pdf`;

  if (pdfUrl) {
    try {
      let pdfBytes: Buffer;
      if (pdfUrl.startsWith("file://")) {
        pdfBytes = await readFile(pdfUrl.replace("file://", ""));
      } else {
        const resp = await fetch(pdfUrl);
        if (!resp.ok) throw new Error(`PDF fetch failed: ${resp.status}`);
        pdfBytes = Buffer.from(await resp.arrayBuffer());
      }

      const base64 = pdfBytes.toString("base64");
      const media = new MessageMedia("application/pdf", base64, filename);

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
