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
  if (!pdfUrl) {
    try {
      pdfUrl = await renderProjectPdfAndUpload(project);
    } catch (err) {
      console.error("[whatsapp] sendProjectPdf renderProjectPdfAndUpload failed:", err);
    }
  }

  const pages   = estimatePageCount(project.content);
  const caption = projectDoneMessage(project.subject, project.topic, pages);

  const safeSubject = project.subject.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = project.candidateNumber
    ? `HBC_Project_${project.candidateNumber}_${safeSubject}.pdf`
    : `Pass_Project_${project.id.slice(-8)}.pdf`;

  if (pdfUrl) {
    try {
      const media = await MessageMedia.fromUrl(pdfUrl, { unsafeMime: true });
      media.filename = filename;
      await client.sendMessage(chatId, media, {
        sendMediaAsDocument: true,
        caption,
      } as MessageSendOptions);
      return;
    } catch (err) {
      console.error("[whatsapp] sendProjectPdf fromUrl failed:", err);
    }
  }

  // Fallback: send project text in chunks
  await client.sendMessage(chatId, projectFallbackMessage(project.id));
  const preview = chunkMessage(project.content)[0];
  if (preview) await client.sendMessage(chatId, preview);
}
