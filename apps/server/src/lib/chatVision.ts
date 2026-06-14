/**
 * Direct-to-Anthropic vision streaming for in-app chat messages that carry a
 * file upload (image or PDF).
 *
 * The Mastra `passAgent` streams from a plain string prompt, which can't carry
 * image/document content blocks, so upload messages bypass the agent and call
 * Anthropic directly — reusing the proven block-building approach from the
 * WhatsApp `mediaAnalysis` flow (Haiku for images, Sonnet for PDFs). Multi-turn
 * context is preserved by replaying the thread's recent plain-text history.
 */

import Anthropic from "@anthropic-ai/sdk";
import { env } from "@pass/env/server";
import { withIdentity, APP_FORMAT } from "../mastra/prompts";

/** Accepted image MIME types — map directly to Anthropic image blocks. */
export const CHAT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export interface ChatUpload {
  url: string;
  mime: string;
  name: string;
}

export interface VisionHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

const VISION_ROLE = `YOUR ROLE: a direct, complete ZIMSEC study tutor. A student has shared one or more files (a photo of a question, a diagram, a past paper, or a document) along with their message.

- Read every attached file carefully.
- ALWAYS give the direct, complete, correct answer up front, then show the step-by-step working that leads to it.
- For a past paper or exam question: identify the subject and topic, then give the model answer and how the marks are earned.
- For a diagram, table or figure: explain what it shows and why it matters.
- For a student's written work: give the correct answer first, then constructive, specific feedback.`;

const VISION_SYSTEM = `${withIdentity(VISION_ROLE)}\n\n${APP_FORMAT}`;

/** Fetch an uploaded object and return its base64-encoded bytes. */
async function fetchBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch upload (${res.status})`);
  const buf = await res.arrayBuffer();
  return Buffer.from(buf).toString("base64");
}

/** True if at least one upload is a PDF (escalates the model to Sonnet). */
function hasPdf(uploads: ChatUpload[]): boolean {
  return uploads.some((u) => u.mime === "application/pdf");
}

/**
 * Stream a vision answer for a message with file uploads. Yields text deltas
 * as they arrive so the controller can forward them over SSE.
 */
export async function* streamChatVision(opts: {
  uploads: ChatUpload[];
  text: string;
  history: VisionHistoryMessage[];
}): AsyncGenerator<string> {
  const { uploads, text, history } = opts;
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  // Build the content blocks for the current turn: every file, then the text.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [];
  for (const u of uploads) {
    const data = await fetchBase64(u.url);
    if (CHAT_IMAGE_TYPES.has(u.mime)) {
      blocks.push({
        type: "image",
        source: { type: "base64", media_type: u.mime, data },
      });
    } else if (u.mime === "application/pdf") {
      blocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data },
      });
    }
  }
  blocks.push({
    type: "text",
    text: text || "Please analyse the attached file(s) and help me with it for ZIMSEC exam preparation.",
  });

  // Replay recent plain-text history so the upload turn keeps conversation context.
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: blocks },
  ];

  const stream = await client.messages.create({
    model: hasPdf(uploads) ? "claude-sonnet-4-5" : "claude-haiku-4-5",
    max_tokens: 2048,
    system: VISION_SYSTEM,
    messages,
    stream: true,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}
