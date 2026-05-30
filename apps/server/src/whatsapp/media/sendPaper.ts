/**
 * Sends a past-paper PDF to a WhatsApp chat.
 *
 * Delivery strategy (in order):
 *  1. If fileUrl is an https:// URL (R2 / CDN), stream with MessageMedia.fromUrl
 *  2. Otherwise, resolve from the local packages/papers directory
 *
 * Returns "sent" | "no_file" | "quota_exceeded".
 */

import { join } from "node:path";
import { MessageMedia } from "whatsapp-web.js";
import type { Client, MessageSendOptions } from "whatsapp-web.js";
import type { Resource } from "@pass/db";
import prisma from "@pass/db";
import { PLAN_LIMITS, currentMonthKey } from "../../lib/planLimits";
import type { PlanKey } from "../../lib/planLimits";

// import.meta.dir → apps/server/src/whatsapp/media
const PAPERS_DIR = join(import.meta.dir, "../../../../..", "packages", "papers", "papers");

export type SendPaperResult = "sent" | "no_file" | "quota_exceeded";

/**
 * Check and (if allowed) increment the monthly download counter.
 * Returns true if the send is allowed.
 */
async function consumeDownloadQuota(userId: string): Promise<{ allowed: boolean; plan: string; limit: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  if (!user) return { allowed: false, plan: "FREE", limit: 10 };

  const limit = PLAN_LIMITS[user.plan as PlanKey].downloads;

  if (limit === Infinity) return { allowed: true, plan: user.plan, limit: Infinity };

  const month = currentMonthKey();
  const usage = await prisma.monthlyUsage.upsert({
    where: { userId_month: { userId, month } },
    create: { userId, month, papersUsed: 0, projectsUsed: 0, aiMessagesUsed: 0, downloadsUsed: 1 },
    update: { downloadsUsed: { increment: 1 } },
  });

  if (usage.downloadsUsed > limit) {
    // Roll back the increment
    await prisma.monthlyUsage.update({
      where: { userId_month: { userId, month } },
      data: { downloadsUsed: { decrement: 1 } },
    });
    return { allowed: false, plan: user.plan, limit };
  }

  return { allowed: true, plan: user.plan, limit };
}

/**
 * @param userId  When provided, the download is counted against the user's monthly
 *                download quota. Pass undefined for session-context sends (the PDF
 *                shown automatically when a study session starts) — those don't count.
 */
export async function sendPaperPdf(
  client: Client,
  chatId: string,
  resource: Resource,
  userId?: string,
): Promise<SendPaperResult> {
  // ── Quota check (only for explicit downloads, not session-context sends) ───
  if (userId !== undefined) {
    const quota = await consumeDownloadQuota(userId);
    if (!quota.allowed) return "quota_exceeded";
  }

  const caption = `📄 *${resource.title}* (${resource.year})\n${resource.grade} · ${resource.subject}`;
  const filename = `${resource.title.replace(/[^a-zA-Z0-9 ]/g, "_")}_${resource.year}.pdf`;

  // ── R2 / URL path ──────────────────────────────────────────────────────────
  if (resource.fileUrl.startsWith("https://") || resource.fileUrl.startsWith("http://")) {
    try {
      const media = await MessageMedia.fromUrl(resource.fileUrl, { unsafeMime: true });
      media.filename = filename;
      await client.sendMessage(chatId, media, {
        sendMediaAsDocument: true,
        caption,
      } as MessageSendOptions);
      return "sent";
    } catch (err) {
      console.error(`[whatsapp] sendPaperPdf fromUrl failed for ${resource.id}:`, err);
      // Fall through to local file path
    }
  }

  // ── Local file path ────────────────────────────────────────────────────────
  try {
    const rel = resource.fileUrl.replace(/^\/static\/papers\//, "");
    const abs = join(PAPERS_DIR, rel);
    const media = MessageMedia.fromFilePath(abs);
    media.filename = filename;
    await client.sendMessage(chatId, media, {
      sendMediaAsDocument: true,
      caption,
    } as MessageSendOptions);
    return "sent";
  } catch (err) {
    console.error(`[whatsapp] sendPaperPdf local fallback failed for ${resource.id}:`, err);
    return "no_file";
  }
}
