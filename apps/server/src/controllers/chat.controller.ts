/**
 * In-app AI chat — thread CRUD + streaming send.
 *
 * Threads and messages are the user-facing source of truth for the chat
 * sidebar (synced web + native). Text and in-app-attachment messages stream
 * through the Mastra `passAgent` (memory + tools + guardrails); messages with a
 * file upload stream through the direct-Anthropic vision path. The shared
 * monthly AI-message pool (`MonthlyUsage.aiMessagesUsed`) is charged before
 * generation: 1 for a normal message, 2 when it carries a file upload.
 */

import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import { z } from "zod";
import prisma from "@pass/db";
import { RequestContext } from "@mastra/core/di";
import { passAgent, USER_ID_CTX_KEY } from "../mastra";
import { APP_FORMAT } from "../mastra/prompts";
import { withRetry } from "../mastra/retry";
import { checkAndIncrementAiMessage } from "../lib/aiQuota";
import { nextMonthlyResetISO } from "../lib/planLimits";
import { effectivePlan } from "../lib/effectivePlan";
import { buildAttachmentContext, type InAppAttachment } from "../lib/chatContext";
import { streamChatVision, CHAT_IMAGE_TYPES, type ChatUpload } from "../lib/chatVision";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const attachmentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("upload"), url: z.string().url(), mime: z.string().min(1), name: z.string().min(1) }),
  z.object({ kind: z.literal("paper"), refId: z.string().min(1) }),
  z.object({ kind: z.literal("session"), refId: z.string().min(1) }),
  z.object({ kind: z.literal("resource"), refId: z.string().min(1) }),
  z.object({ kind: z.literal("project"), refId: z.string().min(1) }),
]);

const sendBodySchema = z.object({
  text: z.string().min(1).max(8000),
  attachments: z.array(attachmentSchema).max(5).optional(),
});

const createThreadSchema = z.object({ title: z.string().min(1).max(200).optional() });
const updateThreadSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  archived: z.boolean().optional(),
});

type Attachment = z.infer<typeof attachmentSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the thread only if it exists AND belongs to the user (else null). */
async function requireOwnedThread(threadId: string, userId: string) {
  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
  return thread && thread.userId === userId ? thread : null;
}

/** A short title derived from the first message (no extra model call). */
function slugTitle(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > 60 ? `${oneLine.slice(0, 57)}…` : oneLine;
}

// ─── Thread CRUD ─────────────────────────────────────────────────────────────

export async function listThreads(c: Context) {
  const userId = c.get("userId") as string;
  const threads = await prisma.chatThread.findMany({
    where: { userId, archived: false },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });
  return c.json({ threads });
}

export async function createThread(c: Context) {
  const userId = c.get("userId") as string;
  const parsed = createThreadSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: "Invalid request body" }, 400);

  const thread = await prisma.chatThread.create({
    data: { userId, title: parsed.data.title ?? "New chat" },
  });
  return c.json(thread, 201);
}

export async function updateThread(c: Context) {
  const userId = c.get("userId") as string;
  const threadId = c.req.param("id") as string;

  const owned = await requireOwnedThread(threadId, userId);
  if (!owned) return c.json({ error: "Thread not found" }, 404);

  const parsed = updateThreadSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid request body" }, 400);

  const thread = await prisma.chatThread.update({
    where: { id: threadId },
    data: parsed.data,
  });
  return c.json(thread);
}

export async function deleteThread(c: Context) {
  const userId = c.get("userId") as string;
  const threadId = c.req.param("id") as string;

  const owned = await requireOwnedThread(threadId, userId);
  if (!owned) return c.json({ error: "Thread not found" }, 404);

  await prisma.chatThread.delete({ where: { id: threadId } }); // cascades to messages
  return c.json({ ok: true });
}

export async function listMessages(c: Context): Promise<Response> {
  const userId = c.get("userId") as string;
  const threadId = c.req.param("id") as string;

  const owned = await requireOwnedThread(threadId, userId);
  if (!owned) return c.json({ error: "Thread not found" }, 404);

  const before = c.req.query("before");
  const limit = Math.min(Number(c.req.query("limit")) || 50, 100);

  const messages = await prisma.chatMessage.findMany({
    where: { threadId, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  // Return in chronological order for rendering.
  return c.json({ messages: messages.reverse() });
}

// ─── Streaming send ──────────────────────────────────────────────────────────

export async function sendMessage(c: Context) {
  const userId = c.get("userId") as string;
  const threadId = c.req.param("id") as string;

  const owned = await requireOwnedThread(threadId, userId);
  if (!owned) return c.json({ error: "Thread not found" }, 404);

  const parsed = sendBodySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid request body" }, 400);

  const { text } = parsed.data;
  const attachments: Attachment[] = parsed.data.attachments ?? [];
  const uploads = attachments.filter((a): a is ChatUpload & { kind: "upload" } => a.kind === "upload");
  const inAppAtts = attachments.filter((a): a is InAppAttachment => a.kind !== "upload");
  const hasUpload = uploads.length > 0;

  // ── Paid-feature gate: file uploads require a paid plan ──────────────────────
  if (hasUpload) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    const plan = user ? await effectivePlan(userId, user.plan) : "FREE";
    if (plan === "FREE") {
      return c.json({ error: "File uploads require a paid plan", feature: "attachments", plan: "FREE" }, 402);
    }
    // Reject upload MIME types the vision path can't read.
    for (const u of uploads) {
      if (!CHAT_IMAGE_TYPES.has(u.mime) && u.mime !== "application/pdf") {
        return c.json({ error: `Unsupported file type: ${u.mime}` }, 400);
      }
    }
  }

  // ── Charge the shared monthly pool (before generation) ───────────────────────
  const cost = hasUpload ? 2 : 1;
  const quota = await checkAndIncrementAiMessage(userId, cost);
  if (!quota.allowed) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    return c.json(
      {
        error: "You're out of AI messages for this month.",
        feature: "aiMessages",
        plan: user?.plan ?? "FREE",
        limit: quota.limit,
        used: quota.used,
        resetAt: nextMonthlyResetISO(),
      },
      402,
    );
  }

  const remaining = quota.limit === Infinity ? Infinity : Math.max(0, quota.limit - quota.used);

  // ── Persist the user message + bump the thread ──────────────────────────────
  await prisma.chatMessage.create({
    data: { threadId, role: "user", content: text, attachments, tokensCharged: cost },
  });
  // Auto-title a still-default thread from its first message.
  await prisma.chatThread.update({
    where: { id: threadId },
    data: {
      updatedAt: new Date(),
      ...(owned.title === "New chat" ? { title: slugTitle(text) } : {}),
    },
  });

  // ── Build the prompt context for in-app attachments ─────────────────────────
  const attachmentContext = inAppAtts.length ? await buildAttachmentContext(inAppAtts, userId) : "";

  // ── Stream the answer ───────────────────────────────────────────────────────
  return streamSSE(c, async (s) => {
    let accumulated = "";

    const emitUsage = async () => {
      await s.writeSSE({
        event: "usage",
        data: JSON.stringify({
          used: quota.used,
          limit: quota.limit === Infinity ? null : quota.limit,
          remaining: remaining === Infinity ? null : remaining,
          cost,
        }),
      });
    };

    try {
      await emitUsage();

      if (hasUpload) {
        // Vision path — replay recent thread history for multi-turn context.
        const recent = await prisma.chatMessage.findMany({
          where: { threadId },
          orderBy: { createdAt: "desc" },
          take: 11, // 10 prior + the just-saved user message
        });
        const history = recent
          .reverse()
          .slice(0, -1) // drop the message we just persisted (sent as content blocks)
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

        for await (const delta of streamChatVision({ uploads, text, history })) {
          accumulated += delta;
          await s.writeSSE({ event: "chunk", data: JSON.stringify({ delta }) });
        }
      } else {
        // Agent path — memory keyed to the thread keeps conversations independent.
        const prompt = [APP_FORMAT, attachmentContext, text].filter(Boolean).join("\n\n");
        const agentStream = await withRetry(() =>
          passAgent.stream(prompt, {
            memory: { resource: userId, thread: threadId },
            requestContext: new RequestContext([[USER_ID_CTX_KEY, userId]]),
            maxSteps: 4,
          }),
        );

        for await (const delta of agentStream.textStream) {
          accumulated += delta;
          await s.writeSSE({ event: "chunk", data: JSON.stringify({ delta }) });
        }
      }

      const trimmed = accumulated.trim();
      if (!trimmed) {
        await s.writeSSE({ event: "error", data: JSON.stringify({ message: "No response was generated. Please try again." }) });
        return;
      }

      const assistant = await prisma.chatMessage.create({
        data: { threadId, role: "assistant", content: trimmed, tokensCharged: 0 },
      });
      await prisma.chatThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });

      await s.writeSSE({
        event: "done",
        data: JSON.stringify({
          message_id: assistant.id,
          used: quota.used,
          limit: quota.limit === Infinity ? null : quota.limit,
          remaining: remaining === Infinity ? null : remaining,
        }),
      });
    } catch (err) {
      console.error("[chat] sendMessage stream error:", err);
      await s.writeSSE({ event: "error", data: JSON.stringify({ message: "Something went wrong. Please try again." }) });
    }
  });
}
