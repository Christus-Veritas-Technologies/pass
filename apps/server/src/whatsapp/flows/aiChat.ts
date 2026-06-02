/**
 * Free-form AI chat flow.
 *
 * Routes any study question to the Mastra passAgent — which carries the hardened
 * Pass identity, conversation memory (per student), study tools, and safety
 * guardrails (prompt-injection + moderation). Off-topic requests are declined by
 * the agent's identity prompt; unsafe input/output is blocked by its processors.
 */

import prisma from "@pass/db";
import type { Message } from "whatsapp-web.js";
import type { ConversationState } from "../types";
import { RequestContext } from "@mastra/core/di";
import { passAgent, USER_ID_CTX_KEY } from "../../mastra";
import { checkAndIncrementAiMessage } from "../../lib/aiQuota";
import { withRetry } from "../../mastra/retry";
import { aiQuotaMessage, aiUsageFooter, AI_ERROR } from "../utils/messages";

const OFF_LIMITS_REPLY =
  "I can only help with ZIMSEC studying 📚 — ask me a study question, request a past paper, or say *project* to generate an HBC project.";

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
    const result = await withRetry(() =>
      passAgent.generate(question, {
        // Per-student conversation memory (multi-turn context).
        memory: { resource: userId, thread: msg.from },
        // Trusted user id for account/usage tools — never model-supplied.
        requestContext: new RequestContext([[USER_ID_CTX_KEY, userId]]),
        maxSteps: 4,
      }),
    );

    await chat.clearState();

    // A guardrail (injection/moderation) blocked the request.
    if (result.tripwire) {
      console.warn("[whatsapp] aiChat guardrail tripwire:", result.tripwire);
      await msg.reply(OFF_LIMITS_REPLY);
      return { ...state, mode: { kind: "ai_chat" } };
    }

    const text = (result.text ?? "").trim();
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
