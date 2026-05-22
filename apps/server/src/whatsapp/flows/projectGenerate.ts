/**
 * HBC project generation flow.
 * Uses the ZIMSEC Heritage-Based Education 5.0 prompt, generates markdown,
 * renders to PDF via Puppeteer, and sends as a WhatsApp document.
 */

import { generateText } from "ai";
import prisma from "@pass/db";
import type { Client, Message } from "whatsapp-web.js";
import type { ConversationState } from "../types";
import type { ProjectSlots } from "./projectBrief";
import { anthropic, CLAUDE_MODEL } from "../../lib/anthropic";
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

  await msg.reply(projectConfirmMessage(slots));
  await chat.sendStateTyping();

  const year = new Date().getFullYear();
  const displayName = slots.studentName || "Student";

  const prompt = `You are an expert in ZIMSEC Heritage-Based Education 5.0. Generate a complete, formal ZIMSEC HBC project document for a ${slots.grade} student.

Student: ${displayName}
Centre Number: ${slots.centreNumber}
Candidate Number: ${slots.candidateNumber}
Subject: ${slots.subject}
Category: ${slots.category}
Grade: ${slots.grade}
Year: ${year}

First, choose a specific, authentic topic within the "${slots.category}" category for ${slots.subject} at ${slots.grade} level. The topic must be grounded in Zimbabwean heritage and align with the HBC 5.0 curriculum.

Then write the complete project with these exact sections:

# [Your chosen project title]

## Candidate Information
Centre Number: ${slots.centreNumber}
Candidate Number: ${slots.candidateNumber}
Name: ${displayName}
Grade: ${slots.grade}
Subject: ${slots.subject}
Year: ${year}

## Introduction
[Background, rationale, objectives — 200-300 words. Ground it in Zimbabwean heritage context.]

## Methodology
[How data was collected — interviews with community elders, field visits, library research, surveys. 150-200 words. Must be realistic for a Zimbabwean student.]

## Data Presentation and Analysis
[Findings presented in structured sections with clear headings. Include tables or lists where appropriate. 400-600 words. This is the main body.]

## Recommendations and Conclusion
[Practical recommendations for preserving the heritage/practice. Concluding remarks tying back to Heritage-Based Education. 150-200 words.]

## References
[3-5 realistic references: textbooks, interviews with named community members, government publications]

Write formally and academically. Use British English. Make the content authentic, detailed, and specific to Zimbabwe.`;

  // Create placeholder project row with all HBC fields
  const project = await prisma.project.create({
    data: {
      userId,
      grade: slots.grade,
      subject: slots.subject,
      topic: "",
      content: "",
      centreNumber: slots.centreNumber,
      candidateNumber: slots.candidateNumber,
      studentName: slots.studentName,
      category: slots.category,
    },
  });

  try {
    const result = await generateText({
      model: anthropic(CLAUDE_MODEL),
      prompt,
      maxTokens: 2500,
    });

    const content = result.text;

    // Extract the AI-chosen title from first # heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const topic = titleMatch ? titleMatch[1].trim() : `${slots.subject} HBC Project`;

    await prisma.project.update({
      where: { id: project.id },
      data: { content, topic },
    });

    // Render PDF and upload (or save to tmp)
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
