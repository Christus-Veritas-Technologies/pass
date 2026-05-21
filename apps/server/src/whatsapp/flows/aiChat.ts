/**
 * Free-form AI chat flow.
 * Routes any study question to the passAgent and returns a WhatsApp-friendly reply.
 */

import prisma from "@pass/db";
import type { Message } from "whatsapp-web.js";
import type { ConversationState } from "../types";
import { passAgent } from "../../mastra";
import { checkAndIncrementAiMessage } from "../../lib/aiQuota";
import { aiQuotaMessage, aiUsageFooter, AI_ERROR } from "../utils/messages";

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
    const stream = await passAgent.stream([
      {
        role: "user" as const,
        content:
          `A ZIMSEC student is asking a study question via WhatsApp. ` +
          `Answer in 120–200 words using WhatsApp markdown (*bold*, _italic_). ` +
          `Be helpful, clear, and encouraging. End with a brief exam tip if relevant.\n\n` +
          `Question: ${question}`,
      },
    ]);

    let text = "";
    for await (const chunk of stream.textStream) text += chunk;
    await chat.clearState();

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
