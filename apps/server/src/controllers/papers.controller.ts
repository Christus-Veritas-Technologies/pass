import { streamSSE } from "hono/streaming";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Context } from "hono";

import prisma from "@pass/db";
import { feedbackAgent } from "../mastra/agents/feedback.agent";
import { explainAgent } from "../mastra/agents/explain.agent";
import { effectiveGuide } from "../lib/grading";
import { PLAN_LIMITS, currentMonthKey } from "../lib/planLimits";
import { checkAndIncrementAiMessage } from "../lib/aiQuota";
import type { PlanKey } from "../lib/planLimits";

const PAPERS_DIR = join(import.meta.dir, "../../../../packages/papers/papers");

// ─── Helpers ─────────────────────────────────────────────────────────────────

type QuestionRow = {
  id: string;
  questionNumber: number;
  text: string;
  marks: number;
  section: string | null;
  topic: string | null;
  subParts: unknown;
  pdfPage: number | null;
  hasDiagram: boolean;
  diagramNote: string | null;
  guideSource: "AI_GENERATED" | "OFFICIAL";
};

/** Shape a stored PaperQuestion for the client (marking rubric is never sent). */
function mapQuestion(q: QuestionRow) {
  return {
    id: q.id,
    questionNumber: q.questionNumber,
    text: q.text,
    marks: q.marks,
    section: q.section,
    topic: q.topic,
    subParts: q.subParts,
    pdfPage: q.pdfPage,
    hasDiagram: q.hasDiagram,
    diagramNote: q.diagramNote,
    guideSource: q.guideSource,
  };
}

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
  const paper = await prisma.resource.findUnique({
    where: { id },
    include: { questions: { orderBy: { questionNumber: "asc" } } },
  });
  if (!paper) return c.json({ error: "Paper not found" }, 404);

  const { questions, ...meta } = paper;
  return c.json({ paper: meta, questions: questions.map(mapQuestion) });
}

export async function startSession(c: Context) {
  const userId = c.get("userId") as string;
  const paperId = c.req.param("id") as string;
  const body = await c.req.json().catch(() => ({}));
  const mode: "GUIDE" | "FREE" = body.mode === "FREE" ? "FREE" : "GUIDE";

  const paper = await prisma.resource.findUnique({
    where: { id: paperId },
  });
  if (!paper) return c.json({ error: "Paper not found" }, 404);

  // Enforce monthly paper limit
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  if (user) {
    const limits = PLAN_LIMITS[user.plan as PlanKey];
    const month = currentMonthKey();
    const usage = await prisma.monthlyUsage.findUnique({
      where: { userId_month: { userId, month } },
    });
    if ((usage?.papersUsed ?? 0) >= limits.papers) {
      // Check bonus papers before rejecting
      const userFull = await prisma.user.findUnique({ where: { id: userId }, select: { bonusPapers: true } });
      if ((userFull?.bonusPapers ?? 0) > 0) {
        await prisma.user.update({ where: { id: userId }, data: { bonusPapers: { decrement: 1 } } });
      } else {
        return c.json({
          error: "Monthly paper limit reached for your plan",
          limitReached: true,
          plan: user.plan,
          limit: limits.papers,
        }, 402);
      }
    } else {
      await prisma.monthlyUsage.upsert({
        where: { userId_month: { userId, month } },
        create: { userId, month, papersUsed: 1, projectsUsed: 0 },
        update: { papersUsed: { increment: 1 } },
      });
    }
  }

  const session = await prisma.paperSession.create({
    data: { userId, resourceId: paperId, mode },
  });

  return c.json({ session, paper }, 201);
}

export async function submitAnswer(c: Context) {
  const userId = c.get("userId") as string;
  const sessionId = c.req.param("sessionId") as string;

  const body = await c.req.json().catch(() => null);
  if (body?.questionNumber == null) {
    return c.json({ error: "questionNumber is required" }, 400);
  }

  const { questionNumber, userAnswer = "", mode } = body as {
    questionNumber: number;
    userAnswer?: string;
    mode?: string;
  };

  const [session, existingAttempt] = await Promise.all([
    prisma.paperSession.findUnique({
      where: { id: sessionId },
      include: { resource: true },
    }),
    prisma.questionAttempt.findUnique({
      where: { sessionId_questionNumber: { sessionId, questionNumber } },
      select: { id: true },
    }),
  ]);

  if (!session || session.userId !== userId) {
    return c.json({ error: "Session not found" }, 404);
  }

  const sessionMode = (mode ?? session.mode) as "GUIDE" | "FREE";

  // Load the stored question + marking rubric SERVER-SIDE — the client no
  // longer supplies question text or the marking guide.
  const question = await prisma.paperQuestion.findUnique({
    where: {
      resourceId_questionNumber: { resourceId: session.resourceId, questionNumber },
    },
  });
  // Fall back to client-supplied text only if the paper isn't ingested yet.
  const questionText = question?.text ?? (body.questionText as string | undefined) ?? "";
  if (!questionText) {
    return c.json({ error: "Question not found for this paper" }, 404);
  }

  const guide = question ? effectiveGuide(question) : null;
  const diagramHint = question?.hasDiagram
    ? `\n\nNote: this question refers to a diagram/figure in the paper${question.diagramNote ? ` (${question.diagramNote})` : ""}. The student is looking at it — focus on the reasoning.`
    : "";

  let prompt: string;
  // GUIDE → cheap Haiku feedback agent; FREE → Sonnet explanation agent.
  const agent = sessionMode === "GUIDE" ? feedbackAgent : explainAgent;
  if (sessionMode === "GUIDE") {
    // Grading feedback — cheap, runs on Haiku, informed by the real rubric.
    prompt = `You are a warm, encouraging ZIMSEC tutor marking a Zimbabwean student's answer.

Question: ${questionText}${diagramHint}
${guide ? `\nMarking rubric / accepted points:\n${guide}\n` : ""}
The student answered: ${userAnswer || "(no answer provided)"}

Give encouraging feedback in 2–4 sentences. Mark against the rubric: if the answer is correct or mostly correct, congratulate them and note any missing points. If it is wrong or incomplete, gently explain the key points they missed and why — never be harsh.

Write in plain text only. Use a blank line to separate paragraphs. If you need to list points, start each item on its own line with "* " (asterisk followed by a space). Do not use any markdown — no # headings, no **bold**, no *italic*, no - bullets.`;
  } else {
    // Full worked solution — teaching, runs on Sonnet for quality.
    prompt = `You are a knowledgeable ZIMSEC tutor helping a Zimbabwean student understand a past-paper question.

Question:
${questionText}${diagramHint}
${guide ? `\nMarking rubric (source of truth):\n${guide}\n` : ""}
Write a clear, well-structured solution suitable for a Form 4 or Form 6 student. Keep the language simple and the explanation thorough.

Write in plain text only. Use blank lines to separate sections or paragraphs. If you need a list, start each item on its own line with "* " (asterisk followed by a space). Do not use any markdown — no # headings, no **bold**, no *italic*, no - bullets.`;
  }

  // AI message quota check
  const aiCheck = await checkAndIncrementAiMessage(userId);
  if (!aiCheck.allowed) {
    return c.json({ error: "Monthly AI message limit reached for your plan", limitReached: true, limit: aiCheck.limit }, 402);
  }

  // Persist answer attempt (upsert in case of retry)
  await prisma.questionAttempt.upsert({
    where: { sessionId_questionNumber: { sessionId, questionNumber } },
    create: { sessionId, questionNumber, questionText, userAnswer },
    update: { userAnswer, questionText, updatedAt: new Date() },
  });

  // Increment questionsAnswered only on the first attempt for this question
  if (!existingAttempt) {
    await prisma.paperSession.update({
      where: { id: sessionId },
      data: { questionsAnswered: { increment: 1 } },
    });
  }

  return streamSSE(c, async (stream) => {
    try {
      const result = await agent.stream(prompt);

      let fullExplanation = "";
      for await (const chunk of result.textStream) {
        fullExplanation += chunk;
        await stream.writeSSE({ data: chunk, event: "chunk" });
      }

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

export async function getSession(c: Context) {
  const userId = c.get("userId") as string;
  const sessionId = c.req.param("sessionId");

  const session = await prisma.paperSession.findUnique({
    where: { id: sessionId },
    include: {
      resource: true,
      questionAttempts: { orderBy: { questionNumber: "asc" } },
    },
  });

  if (!session || session.userId !== userId) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json({
    session: {
      id: session.id,
      mode: session.mode,
      questionsAnswered: session.questionsAnswered,
      completedAt: session.completedAt,
      paper: {
        id: session.resourceId,
        title: session.resource.title,
        subject: session.resource.subject,
        grade: session.resource.grade,
        year: session.resource.year,
      },
      attempts: session.questionAttempts.map((a) => ({
        id: a.id,
        questionNumber: a.questionNumber,
        questionText: a.questionText,
        userAnswer: a.userAnswer,
        explanation: a.explanation,
      })),
    },
  });
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

/**
 * GET /papers/:id/download
 * Authenticated. Enforces monthly download quota, then streams the PDF
 * with Content-Disposition: attachment so browsers/native clients save it.
 */
export async function downloadPaper(c: Context) {
  const userId = c.get("userId") as string;
  const id = c.req.param("id");

  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return c.json({ error: "Paper not found" }, 404);

  // ── Download quota ────────────────────────────────────────────────────────
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const limit = PLAN_LIMITS[user.plan as PlanKey].downloads;
  if (limit !== Infinity) {
    const month = currentMonthKey();
    const usage = await prisma.monthlyUsage.upsert({
      where: { userId_month: { userId, month } },
      create: { userId, month, papersUsed: 0, projectsUsed: 0, aiMessagesUsed: 0, downloadsUsed: 1 },
      update: { downloadsUsed: { increment: 1 } },
    });
    if (usage.downloadsUsed > limit) {
      await prisma.monthlyUsage.update({
        where: { userId_month: { userId, month } },
        data: { downloadsUsed: { decrement: 1 } },
      });
      return c.json({ error: "Monthly download limit reached for your plan", limitReached: true, plan: user.plan, limit }, 402);
    }
  }

  const safeTitle = resource.title.replace(/[^a-zA-Z0-9 _-]/g, "").trim().replace(/\s+/g, "_");
  const filename = `${safeTitle}_${resource.year}.pdf`;
  const headers = {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, max-age=300",
  };

  // ── R2 / CDN path ─────────────────────────────────────────────────────────
  if (resource.fileUrl.startsWith("https://") || resource.fileUrl.startsWith("http://")) {
    try {
      const resp = await fetch(resource.fileUrl);
      if (!resp.ok) throw new Error(`Upstream ${resp.status}`);
      const bytes = await resp.arrayBuffer();
      return new Response(bytes, { headers });
    } catch {
      // Fall through to local
    }
  }

  // ── Local file path ───────────────────────────────────────────────────────
  try {
    const rel = resource.fileUrl.replace(/^\/static\/papers\//, "");
    const abs = join(PAPERS_DIR, rel);
    const bytes = await readFile(abs);
    return new Response(bytes.buffer as ArrayBuffer, { headers });
  } catch {
    return c.json({ error: "Paper file not available for download" }, 404);
  }
}
