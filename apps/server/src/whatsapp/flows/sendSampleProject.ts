/**
 * Send a SAMPLE project on WhatsApp.
 *
 * A user can ask to see what a finished project looks like (in the project flow
 * or anywhere). We pick a real past project from the database, strip the original
 * student's identity from the cover, render it to PDF, and send it.
 *
 * This is NOT a project generation:
 *  - no AI call,
 *  - no quota touched (monthlyUsage / bonusProjects / AI messages),
 *  - no writes to the source project (we render stripped bytes in memory and never
 *    upload to R2 — calling renderProjectPdfAndUpload would overwrite the source
 *    project's cached PDF and its pdfUrl).
 */

import { MessageMedia } from "whatsapp-web.js";
import type { Client, MessageSendOptions } from "whatsapp-web.js";
import prisma from "@pass/db";
import type { Project } from "@pass/db";
import { generateProjectPdfBuffer } from "../../lib/projectPdfDocument";
import { estimatePageCount } from "../media/renderProjectPdf";
import { projectSampleCaption } from "../utils/messages";

/** A project needs at least this many characters of content to be worth showing. */
const MIN_SAMPLE_CHARS = 1500;
/** How many recent candidates to consider per tier before filtering by length. */
const CANDIDATE_POOL = 40;

/** Find a recent, sufficiently complete project, preferring the given hints. */
async function findSampleProject(hints?: { subject?: string; grade?: string }): Promise<Project | null> {
  // Most specific filter first, then progressively looser; last tier matches any.
  const tiers: Array<{ subject?: string; grade?: string }> = [];
  if (hints?.subject && hints?.grade) tiers.push({ subject: hints.subject, grade: hints.grade });
  if (hints?.subject) tiers.push({ subject: hints.subject });
  tiers.push({});

  for (const tier of tiers) {
    const candidates = await prisma.project.findMany({
      where: {
        content: { not: "" },
        ...(tier.subject ? { subject: tier.subject } : {}),
        ...(tier.grade ? { grade: tier.grade } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: CANDIDATE_POOL,
    });
    const good = candidates.filter((p) => p.content.trim().length >= MIN_SAMPLE_CHARS);
    if (good.length > 0) {
      return good[Math.floor(Math.random() * good.length)]!;
    }
  }
  return null;
}

/**
 * Render a sample project (identity stripped) and send it as a PDF document.
 * Returns true if a sample was sent, false if none was available.
 */
export async function sendSampleProject(
  client: Client,
  chatId: string,
  hints?: { subject?: string; grade?: string },
): Promise<boolean> {
  const source = await findSampleProject(hints);
  if (!source) return false;

  // Strip the original student's identity. The cover renders "—" for "_" fields,
  // so blanking these four is all that's needed for the cover/metadata.
  const stripped: Project = {
    ...source,
    studentName: "_",
    schoolName: "_",
    centreNumber: "_",
    candidateNumber: "_",
  };

  let pdfBytes: Buffer;
  try {
    pdfBytes = await generateProjectPdfBuffer(stripped);
  } catch (err) {
    console.error("[whatsapp] sendSampleProject PDF render failed:", err);
    return false;
  }

  const safeSubject = stripped.subject.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `HBC_Sample_${safeSubject}.pdf`;
  const pages = estimatePageCount(stripped.content);
  const caption = projectSampleCaption(stripped.subject, stripped.topic, pages);

  try {
    const media = new MessageMedia("application/pdf", pdfBytes.toString("base64"), filename);
    await client.sendMessage(chatId, media, {
      sendMediaAsDocument: true,
      caption,
    } as MessageSendOptions);
    return true;
  } catch (err) {
    console.error("[whatsapp] sendSampleProject send failed:", err);
    return false;
  }
}
