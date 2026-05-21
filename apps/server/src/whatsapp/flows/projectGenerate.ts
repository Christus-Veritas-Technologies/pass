/**
 * Project generation flow.
 * Calls passAgent to generate markdown, renders to PDF, sends to the user.
 */

import prisma from "@pass/db";
import type { Client, Message } from "whatsapp-web.js";
import type { ConversationState } from "../types";
import type { ProjectSlots } from "./projectBrief";
import { passAgent } from "../../mastra";
import { checkAndIncrementAiMessage } from "../../lib/aiQuota";
import { PLAN_LIMITS, currentMonthKey, type PlanKey } from "../../lib/planLimits";
import { renderProjectPdfAndUpload } from "../media/renderProjectPdf";
import { sendProjectPdf } from "../media/sendProject";
import {
  projectConfirmMessage,
  projectsQuotaMessage,
  aiQuotaMessage,
  aiUsageFooter,
  AI_ERROR,
} from "../utils/messages";

export async function generateProject(
  client: Client,
  msg: Message,
  slots: ProjectSlots,
  userId: string,
  state: ConversationState,
): Promise<ConversationState> {
  const chat = await msg.getChat();
  const whatsappId = chat.id._serialized;

  // Enforce project quota
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  if (user) {
    const limits = PLAN_LIMITS[user.plan as PlanKey];
    const month = currentMonthKey();
    const usage = await prisma.monthlyUsage.findUnique({
      where: { userId_month: { userId, month } },
    });
    if ((usage?.projectsUsed ?? 0) >= limits.projects) {
      await msg.reply(projectsQuotaMessage(user.plan, limits.projects));
      return { ...state, mode: { kind: "idle" } };
    }
    await prisma.monthlyUsage.upsert({
      where: { userId_month: { userId, month } },
      create: { userId, month, papersUsed: 0, projectsUsed: 1, aiMessagesUsed: 0 },
      update: { projectsUsed: { increment: 1 } },
    });
  }

  // Check AI quota
  const quota = await checkAndIncrementAiMessage(userId);
  if (!quota.allowed) {
    await msg.reply(aiQuotaMessage(user?.plan ?? "FREE", quota.limit));
    return { ...state, mode: { kind: "idle" } };
  }

  await msg.reply(projectConfirmMessage(slots.subject, slots.grade, slots.topic));
  await chat.sendStateTyping();

  // Create placeholder project row
  const project = await prisma.project.create({
    data: { userId, grade: slots.grade, subject: slots.subject, topic: slots.topic, content: "" },
  });

  try {
    const stream = await passAgent.stream([
      {
        role: "user" as const,
        content:
          `Generate a complete ZIMSEC project report in Markdown format.\n\n` +
          `Subject: ${slots.subject}\nGrade: ${slots.grade}\nTopic: ${slots.topic}\n\n` +
          `Structure the report with ## headings:\n` +
          `1. Title Page (school name placeholder, candidate name placeholder, year)\n` +
          `2. Introduction (background and context)\n` +
          `3. Objectives (bulleted list)\n` +
          `4. Methodology (how the project was conducted)\n` +
          `5. Findings / Results (main content — include tables or lists where appropriate)\n` +
          `6. Analysis and Discussion\n` +
          `7. Conclusion\n` +
          `8. References (at least 3 ZIMSEC-appropriate references)\n\n` +
          `Write at the appropriate academic level for ZIMSEC ${slots.grade} in Zimbabwe. ` +
          `Use Zimbabwean context, examples, and currency (ZWL) where relevant.`,
      },
    ]);

    let content = "";
    for await (const chunk of stream.textStream) content += chunk;

    await prisma.project.update({ where: { id: project.id }, data: { content } });

    // Render PDF and upload to R2 (or tmp fallback)
    const pdfUrl = await renderProjectPdfAndUpload(
      await prisma.project.findUniqueOrThrow({ where: { id: project.id } }),
    );
    if (pdfUrl) {
      await prisma.project.update({ where: { id: project.id }, data: { pdfUrl } });
    }

    await chat.clearState();

    const finalProject = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    await sendProjectPdf(client, whatsappId, finalProject);

    const footer = aiUsageFooter(quota.used, quota.limit, user?.plan ?? "FREE") ?? "";
    if (footer) await client.sendMessage(whatsappId, footer);
  } catch (err) {
    console.error("[whatsapp] generateProject error:", err);
    await chat.clearState();
    await msg.reply(AI_ERROR);
  }

  return { ...state, mode: { kind: "idle" } };
}
