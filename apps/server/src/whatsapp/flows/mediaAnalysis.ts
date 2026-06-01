/**
 * Handles inbound WhatsApp messages that contain media (images or PDFs).
 *
 * Supported types:
 *   image/*           — photo of a question, diagram, past paper page
 *   application/pdf   — full past paper or document
 *
 * Everything else gets a polite decline.
 */

import type { Message } from "whatsapp-web.js";
import Anthropic from "@anthropic-ai/sdk";
import type { ConversationState } from "../types";
import { checkAndIncrementAiMessage } from "../../lib/aiQuota";
import prisma from "@pass/db";
import { aiQuotaMessage, aiUsageFooter } from "../utils/messages";
import { env } from "@pass/env/server";

const SYSTEM_PROMPT = `You are Pass — an AI tutor for Zimbabwean ZIMSEC students. A student has shared an image or document with you. Analyse it thoroughly and respond in a way that directly helps with exam preparation:

- If it is a past paper or exam question: identify the subject and topic, then explain how to approach answering it. Give a model answer if the question is clear.
- If it is a diagram, table, or figure: explain what it shows and why it matters for the relevant subject.
- If it is a document or notes: summarise the key points and highlight what is likely to appear in an exam.
- If it is a photo of written work: give constructive feedback.

Keep responses under 400 words. Use plain text — no markdown headers or code blocks, as this is WhatsApp.`;

const UNSUPPORTED =
  "⚠️ I can read *images* (photos of questions, diagrams, papers) and *PDF documents*, but I can't process this file type.\n\nSend me a photo or a PDF and I'll analyse it for you 📚";

const DOWNLOAD_ERROR =
  "⚠️ I couldn't download that attachment — it may have expired or be too large. Please try sending it again.";

const ANALYSIS_ERROR =
  "⚠️ Something went wrong while analysing that file. Please try again in a moment.";

/**
 * Accepted MIME types — map to Anthropic content block types.
 * Claude supports jpeg, png, gif, webp for images; pdf for documents.
 */
const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export async function handleMediaMessage(
  msg: Message,
  userId: string,
  state: ConversationState,
): Promise<ConversationState> {
  const chat = await msg.getChat();
  await chat.sendStateTyping();

  // ── Quota check ────────────────────────────────────────────────────────────
  const quota = await checkAndIncrementAiMessage(userId);
  if (!quota.allowed) {
    await chat.clearState();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    await msg.reply(aiQuotaMessage(user?.plan ?? "FREE", quota.limit));
    return state;
  }

  // ── Download media ─────────────────────────────────────────────────────────
  let media: Awaited<ReturnType<typeof msg.downloadMedia>> | null = null;
  try {
    media = await msg.downloadMedia();
  } catch (err) {
    console.warn("[mediaAnalysis] downloadMedia failed:", err);
    await chat.clearState();
    await msg.reply(DOWNLOAD_ERROR);
    return state;
  }

  if (!media?.data) {
    await chat.clearState();
    await msg.reply(DOWNLOAD_ERROR);
    return state;
  }

  const mime = (media.mimetype ?? "").split(";")[0]?.trim() ?? "";
  const isImage = ACCEPTED_IMAGE_TYPES.has(mime);
  const isPdf   = mime === "application/pdf";

  if (!isImage && !isPdf) {
    await chat.clearState();
    await msg.reply(UNSUPPORTED);
    return state;
  }

  // Caption the user may have typed alongside the media
  const caption = (msg.body ?? "").trim();

  // ── Build Anthropic content blocks ─────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentBlocks: any[] = [];

  if (isImage) {
    contentBlocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: mime as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: media.data,
      },
    });
  } else {
    // PDF document block
    contentBlocks.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: media.data,
      },
    });
  }

  // Add caption or default prompt
  contentBlocks.push({
    type: "text",
    text: caption || (isImage
      ? "Please analyse this image and explain its content for ZIMSEC exam preparation."
      : "Please analyse this document and explain its content for ZIMSEC exam preparation."),
  });

  // ── Call Anthropic ─────────────────────────────────────────────────────────
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      // Haiku is fast and cheap for image analysis; escalate to Sonnet for PDFs
      model: isPdf ? "claude-sonnet-4-5" : "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: contentBlocks }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    await chat.clearState();

    if (!text) {
      await msg.reply(ANALYSIS_ERROR);
      return state;
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    const footer = aiUsageFooter(quota.used, quota.limit, user?.plan ?? "FREE") ?? "";
    await msg.reply(text + footer);
  } catch (err) {
    console.error("[mediaAnalysis] Anthropic call failed:", err);
    await chat.clearState();
    await msg.reply(ANALYSIS_ERROR);
  }

  return state;
}
