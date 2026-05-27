/**
 * Free-form AI chat flow.
 * Routes any study question to the passAgent and returns a WhatsApp-friendly reply.
 */

import prisma from "@pass/db";
import type { Message } from "whatsapp-web.js";
import type { ConversationState } from "../types";
import { generateText } from "ai";
import { anthropic } from "../../lib/anthropic";
import { checkAndIncrementAiMessage } from "../../lib/aiQuota";
import { aiQuotaMessage, aiUsageFooter, AI_ERROR } from "../utils/messages";

const SYSTEM_PROMPT = `You are the Pass study assistant, an AI tutor for Zimbabwean O-Level and A-Level students.
You specialise in ZIMSEC (Zimbabwe School Examinations Council) exam preparation.

When answering study questions:
- Answer in 120–200 words
- Use WhatsApp markdown (*bold*, _italic_) for emphasis
- Be helpful, clear, and encouraging
- Reference Zimbabwean context where relevant (ZWL currency, local examples)
- End with a brief exam tip if relevant
- Never mock or belittle a student

If the student asks something unrelated to studying, gently redirect them to studying.`;

export async function handleAiChat(
  msg: Message,
  question: string,
  userId: string,
  state: ConversationState,
): Promise<ConversationState> {
  const chat = await msg.getChat();
  await chat.sendStateTyping();

  const quota = await checkAndIncrementAiMessage(userId);
  if (!quota.allowed) {
    await chat.clearState();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    await msg.reply(aiQuotaMessage(user?.plan ?? "FREE", quota.limit));
    return { ...state, mode: { kind: "idle" } };
  }

  try {
    const result = await generateText({
      model: anthropic("claude-haiku-4-5"),
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: question }],
      maxTokens: 400,
    });

    const text = result.text?.trim() ?? "";
    await chat.clearState();

    if (!text) {
      await msg.reply(AI_ERROR);
      return { ...state, mode: { kind: "ai_chat" } };
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    const footer = aiUsageFooter(quota.used, quota.limit, user?.plan ?? "FREE") ?? "";
    await msg.reply(text + footer);
  } catch (err) {
    console.error("[whatsapp] handleAiChat error:", err);
    await chat.clearState();
    await msg.reply(AI_ERROR);
  }

  return { ...state, mode: { kind: "ai_chat" } };
}
