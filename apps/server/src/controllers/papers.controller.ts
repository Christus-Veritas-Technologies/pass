import { streamText } from "ai";
import { streamSSE } from "hono/streaming";
import type { Context } from "hono";

import prisma from "@pass/db";
import { anthropic, CLAUDE_MODEL } from "../lib/anthropic";

// ─── Controllers ─────────────────────────────────────────────────────────────

export async function getPapers(c: Context) {
  const papers = await prisma.resource.findMany({
    where: { type: "PAST_PAPER" },
    orderBy: [{ year: "desc" }, { subject: "asc" }],
  });
  return c.json({ papers });
}

export async function getPaper(c: Context) {
  const id = c.req.param("id");
  const paper = await prisma.resource.findUnique({ where: { id } });
  if (!paper) return c.json({ error: "Paper not found" }, 404);

  // Questions are generated per-session via AI; return metadata only here
  return c.json({ paper, questions: [] });
}

export async function startSession(c: Context) {
  const userId = c.get("userId") as string;
  const paperId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const mode: "GUIDE" | "FREE" = body.mode === "FREE" ? "FREE" : "GUIDE";

  const paper = await prisma.resource.findUnique({ where: { id: paperId } });
  if (!paper) return c.json({ error: "Paper not found" }, 404);

  const session = await prisma.paperSession.create({
    data: { userId, resourceId: paperId, mode },
  });

  return c.json({ session, paper, questions: [] }, 201);
}

export async function submitAnswer(c: Context) {
  const userId = c.get("userId") as string;
  const sessionId = c.req.param("sessionId");

  const session = await prisma.paperSession.findUnique({
    where: { id: sessionId },
    include: { resource: true },
  });
  if (!session || session.userId !== userId) {
    return c.json({ error: "Session not found" }, 404);
  }

  const body = await c.req.json().catch(() => null);
  if (!body?.questionText || body.questionNumber == null) {
    return c.json({ error: "questionText and questionNumber are required" }, 400);
  }

  const { questionText, questionNumber, userAnswer = "", mode } = body as {
    questionText: string;
    questionNumber: number;
    userAnswer?: string;
    mode?: string;
  };

  const sessionMode = (mode ?? session.mode) as "GUIDE" | "FREE";

  let prompt: string;
  if (sessionMode === "GUIDE") {
    prompt = `You are a warm, encouraging ZIMSEC tutor helping a Zimbabwean student.

The question is: ${questionText}

The student answered: ${userAnswer || "(no answer provided)"}

Give encouraging feedback in 2-3 sentences. If the answer is correct or mostly correct, congratulate them genuinely. If it is wrong or incomplete, gently explain what the right answer is and why — never be harsh or discouraging.`;
  } else {
    prompt = `You are a knowledgeable ZIMSEC tutor helping a Zimbabwean student.

Work through this ZIMSEC question:

${questionText}

Give the full, worked solution with a clear step-by-step explanation. Use simple language suitable for a Form 4 or Form 6 student.`;
  }

  // Persist answer attempt (upsert in case of retry)
  await prisma.questionAttempt.upsert({
    where: { sessionId_questionNumber: { sessionId, questionNumber } },
    create: { sessionId, questionNumber, questionText, userAnswer },
    update: { userAnswer, updatedAt: new Date() },
  });

  // Increment questionsAnswered if this is a new question
  await prisma.paperSession.update({
    where: { id: sessionId },
    data: { questionsAnswered: { increment: 1 } },
  });

  return streamSSE(c, async (stream) => {
    try {
      const result = streamText({
        model: anthropic(CLAUDE_MODEL),
        prompt,
        maxTokens: 512,
      });

      let fullExplanation = "";
      for await (const chunk of result.textStream) {
        fullExplanation += chunk;
        await stream.writeSSE({ data: chunk, event: "chunk" });
      }

      // Persist the AI explanation after streaming
      await prisma.questionAttempt.update({
        where: { sessionId_questionNumber: { sessionId, questionNumber } },
        data: { explanation: fullExplanation },
      });

      await stream.writeSSE({ data: "", event: "done" });
    } catch (err) {
      console.error("submitAnswer stream error:", err);
      await stream.writeSSE({ data: "AI response unavailable.", event: "error" });
    }
  });
}

export async function completeSession(c: Context) {
  const userId = c.get("userId") as string;
  const sessionId = c.req.param("sessionId");

  const session = await prisma.paperSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) {
    return c.json({ error: "Session not found" }, 404);
  }

  const updated = await prisma.paperSession.update({
    where: { id: sessionId },
    data: { completedAt: new Date() },
    include: { resource: true },
  });

  return c.json({ session: updated });
}

export async function getRecentSessions(c: Context) {
  const userId = c.get("userId") as string;

  const sessions = await prisma.paperSession.findMany({
    where: { userId, completedAt: { not: null } },
    include: { resource: true, questionAttempts: true },
    orderBy: { completedAt: "desc" },
    take: 10,
  });

  const formatted = sessions.map((s) => ({
    id: s.id,
    paperId: s.resourceId,
    paperTitle: s.resource.title,
    subject: s.resource.subject,
    grade: s.resource.grade,
    questionsTotal: s.questionAttempts.length,
    questionsAnswered: s.questionsAnswered,
    completedAt: s.completedAt,
  }));

  return c.json({ sessions: formatted });
}
