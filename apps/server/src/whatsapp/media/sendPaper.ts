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
import { PLAN_LIMITS, currentMonthKey, AMBASSADOR_LIMIT } from "../../lib/planLimits";
import type { PlanKey } from "../../lib/planLimits";
import { resolvePaperPath, PAPERS_DIR } from "../../lib/papersDir";

export type SendPaperResult =
  | "sent"
  | "no_file"
  | { kind: "quota_exceeded"; plan: string; limit: number };

/**
 * Check and (if allowed) increment the monthly download counter.
 * Returns true if the send is allowed.
 */
async function consumeDownloadQuota(userId: string): Promise<{ allowed: boolean; plan: string; limit: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true, isAmbassador: true } });
  if (!user) return { allowed: false, plan: "FREE", limit: 10 };

  const limit = user.isAmbassador ? AMBASSADOR_LIMIT : PLAN_LIMITS[user.plan as PlanKey].downloads;

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
    if (!quota.allowed) return { kind: "quota_exceeded", plan: quota.plan, limit: quota.limit };
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
    } catch (err: unknown) {
      const status = (err as { statusCode?: number; status?: number }).statusCode
        ?? (err as { statusCode?: number; status?: number }).status;
      if (status === 404 || status === 403 || status === 410) {
        console.warn(`[whatsapp] sendPaperPdf: URL unavailable (${status}) for resource ${resource.id} — trying local`);
      } else {
        console.error(`[whatsapp] sendPaperPdf fromUrl failed for ${resource.id}:`, err);
      }
      // Fall through to local file path
    }
  }

  // ── Local file path ────────────────────────────────────────────────────────
  // Prefer filePath (repo-relative, set at ingestion time) over deriving from
  // fileUrl — it's more reliable and survives URL scheme changes.
  const rel = resource.filePath
    ? resource.filePath.replace(/^packages\/papers\/papers\//, "")
    : resource.fileUrl.replace(/^\/static\/papers\//, "");

  const abs = resolvePaperPath(rel);
  if (!abs) {
    console.warn(
      `[whatsapp] sendPaperPdf: file not found for resource ${resource.id} (${resource.title})\n` +
      `  searched: ${join(PAPERS_DIR, rel)}`
    );
    return "no_file";
  }

  try {
    const media = MessageMedia.fromFilePath(abs);
    media.filename = filename;
    await client.sendMessage(chatId, media, {
      sendMediaAsDocument: true,
      caption,
    } as MessageSendOptions);
    return "sent";
  } catch (err: unknown) {
    console.error(`[whatsapp] sendPaperPdf failed to send ${abs}:`, err);
    return "no_file";
  }
}
