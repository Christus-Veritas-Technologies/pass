/**
 * HBC project generation flow.
 * Resolves the project body via resolveProjectContent (parallel fan-out
 * generation, or reuse from the per-(grade, subject) pool once it is full),
 * renders to PDF, and sends it as a WhatsApp document.
 */

import prisma from "@pass/db";
import type { Client, Message } from "whatsapp-web.js";
import type { ConversationState } from "../types";
import type { ProjectSlots } from "./projectBrief";
import { resolveProjectContent } from "../../mastra/project/pool";
import type { ProjectInput } from "../../mastra/project/spine";
import { checkAndIncrementAiMessage } from "../../lib/aiQuota";
import { PLAN_LIMITS, currentMonthKey, type PlanKey, AMBASSADOR_LIMIT } from "../../lib/planLimits";
import { renderProjectPdfAndUpload } from "../media/renderProjectPdf";
import { sendProjectPdf } from "../media/sendProject";
import {
  projectConfirmMessage,
  projectsQuotaMessage,
  aiQuotaMessage,
  aiUsageFooter,
  AI_ERROR,
  WHAT_NEXT,
} from "../utils/messages";

// ── Main generator ────────────────────────────────────────────────────────────

export async function generateProject(
  client: Client,
  msg: Message,
  slots: ProjectSlots,
  userId: string,
  state: ConversationState,
): Promise<ConversationState> {
  const chat = await msg.getChat();
  const whatsappId = chat.id._serialized;

  // ── Project quota check ───────────────────────────────────────────────────
  const month = currentMonthKey();
  const [user, usage] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true, bonusProjects: true, isAmbassador: true } }),
    prisma.monthlyUsage.findUnique({ where: { userId_month: { userId, month } } }),
  ]);
  if (user) {
    const projectLimit = user.isAmbassador ? AMBASSADOR_LIMIT : PLAN_LIMITS[user.plan as PlanKey].projects;
    const projectsUsed = usage?.projectsUsed ?? 0;
    if (projectsUsed >= projectLimit) {
      if (!user.isAmbassador && (user.bonusProjects ?? 0) > 0) {
        await prisma.user.update({ where: { id: userId }, data: { bonusProjects: { decrement: 1 } } });
      } else {
        await msg.reply(projectsQuotaMessage(user.plan, projectLimit));
        return { ...state, mode: { kind: "idle" } };
      }
    } else {
      await prisma.monthlyUsage.upsert({
        where: { userId_month: { userId, month } },
        create: { userId, month, papersUsed: 0, projectsUsed: 1, aiMessagesUsed: 0 },
        update: { projectsUsed: { increment: 1 } },
      });
    }
  }

  // ── AI quota check ────────────────────────────────────────────────────────
  const quota = await checkAndIncrementAiMessage(userId);
  if (!quota.allowed) {
    await msg.reply(aiQuotaMessage(user?.plan ?? "FREE", quota.limit));
    return { ...state, mode: { kind: "idle" } };
  }

  await msg.reply(projectConfirmMessage(slots));
  await msg.reply(
    `📝 Heads up — we're putting together a fully structured, high-quality project for you, so this one takes a bit longer than usual. Grab a snack, it should be ready within 2–5 minutes 🙂`,
  );
  await chat.sendStateTyping();

  // Create placeholder project row
  const project = await prisma.project.create({
    data: {
      userId,
      grade: slots.grade,
      subject: slots.subject,
      topic: "",
      content: "",
      outline: slots.outline?.trim() || null,
      centreNumber: slots.centreNumber,
      candidateNumber: slots.candidateNumber,
      studentName: slots.studentName,
      schoolName: slots.schoolName,
      district: slots.district,
      province: slots.province,
      category: slots.category,
    },
  });

  try {
    // Generate in parallel, or reuse a pooled body once the (grade, subject)
    // pool is full. Either way this returns the finished body + title.
    await chat.sendStateTyping();
    const input: ProjectInput = {
      grade: slots.grade,
      subject: slots.subject,
      category: slots.category,
      title: slots.title,
      outline: slots.outline,
      isGroupProject: (slots as ProjectSlots & { isGroupProject?: boolean }).isGroupProject,
    };
    const { topic: resolvedTopic, content } = await resolveProjectContent(input);
    const topic = slots.title || resolvedTopic || `${slots.subject} HBC Project`;

    await prisma.project.update({
      where: { id: project.id },
      data: { content, topic },
    });

    // ── Render PDF and upload ───────────────────────────────────────────────
    try {
      const pdfUrl = await renderProjectPdfAndUpload(
        await prisma.project.findUniqueOrThrow({ where: { id: project.id } }),
      );
      if (pdfUrl) {
        await prisma.project.update({ where: { id: project.id }, data: { pdfUrl } });
      }
    } catch (pdfErr) {
      console.error("[whatsapp] generateProject PDF render/upload error:", pdfErr);
      // PDF failed — sendProjectPdf will use text fallback
    }

    await chat.clearState();

    const finalProject = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    await sendProjectPdf(client, whatsappId, finalProject);

    const footer = aiUsageFooter(quota.used, quota.limit, user?.plan ?? "FREE") ?? "";
    if (footer) await client.sendMessage(whatsappId, footer);

    // Clear context: user has their project — show the main menu so the next
    // message starts fresh rather than being interpreted as project follow-up.
    await client.sendMessage(whatsappId, WHAT_NEXT);
  } catch (err) {
    console.error("[whatsapp] generateProject error:", err);
    await chat.clearState();
    await msg.reply(AI_ERROR);
  }

  return { ...state, mode: { kind: "idle" } };
}
