import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import { z } from "zod";
import prisma from "@pass/db";
import { explainAgent } from "../mastra/agents/explain.agent";
import { projectAgent } from "../mastra/agents/project.agent";
import { effectiveGuide, gradeAnswer, getSessionQuestion } from "../lib/grading";
import { PLAN_LIMITS, currentMonthKey } from "../lib/planLimits";

// ─── Schemas ─────────────────────────────────────────────────────────────────

// The client only identifies the question + sends the answer. Question text
// and the marking rubric are loaded server-side from the stored PaperQuestion.
const evaluateBodySchema = z.object({
  questionNumber: z.number().int().positive(),
  userAnswer: z.string().min(1),
});

// ─── Evaluate ────────────────────────────────────────────────────────────────

export async function evaluateAnswer(c: Context) {
  const userId = c.get("userId") as string;
  const sessionId = c.req.param("sessionId") as string;

  const parsed = evaluateBodySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid request body" }, 400);

  const { questionNumber, userAnswer } = parsed.data;

  // Loads the session (scoped to this user) and the stored question + rubric.
  const ctx = await getSessionQuestion(sessionId, userId, questionNumber);
  if (!ctx) return c.json({ error: "Session or question not found" }, 404);
  const { question } = ctx;

  // Return cached evaluation if it exists — no new AI call.
  const existing = await prisma.questionAttempt.findUnique({
    where: { sessionId_questionNumber: { sessionId, questionNumber } },
  });
  if (existing?.evaluation) {
    return c.json(existing.evaluation);
  }

  // Grade with Haiku against the server-side rubric.
  const evaluation = await gradeAnswer(question, userAnswer);

  // Cache the result and track the attempt
  await prisma.questionAttempt.upsert({
    where: { sessionId_questionNumber: { sessionId, questionNumber } },
    create: {
      sessionId,
      questionNumber,
      questionText: question.text,
      userAnswer,
      evaluation: evaluation as object,
      correct: evaluation.isCorrect,
    },
    update: {
      userAnswer,
      evaluation: evaluation as object,
      correct: evaluation.isCorrect,
    },
  });

  // Increment questionsAnswered only on first attempt
  if (!existing) {
    await prisma.paperSession.update({
      where: { id: sessionId },
      data: { questionsAnswered: { increment: 1 } },
    });
  }

  return c.json(evaluation);
}

// ─── Explain ─────────────────────────────────────────────────────────────────

export async function explainAnswer(c: Context) {
  const userId = c.get("userId") as string;
  const sessionId = c.req.param("sessionId") as string;
  const questionNumber = Number(c.req.param("questionNumber"));

  if (Number.isNaN(questionNumber)) {
    return c.json({ error: "Invalid question number" }, 400);
  }

  const attempt = await prisma.questionAttempt.findFirst({
    where: {
      sessionId,
      questionNumber,
      session: { userId },
    },
  });

  if (!attempt) return c.json({ error: "Attempt not found" }, 404);

  // Pull the stored marking rubric so the explanation is accurate.
  const ctx = await getSessionQuestion(sessionId, userId, questionNumber);
  const guide = ctx ? effectiveGuide(ctx.question) : null;

  let accumulated = "";

  return streamSSE(c, async (s) => {
    const agentStream = await explainAgent.stream(
      `A ZIMSEC student got this question wrong and has clicked "Explain this". Give them a helpful, detailed explanation.

Question: ${attempt.questionText}

Student's Answer: ${attempt.userAnswer}
${guide ? `\nMarking rubric / accepted points:\n${guide}\n` : ""}
Please explain:
1. What the correct answer is and the key points the marking guide expects
2. Why those points are important — the underlying concept
3. How to approach similar questions in the exam (exam technique)
4. A memory tip or shortcut if applicable

Keep the language clear and encouraging for a secondary school student. You can use simple Markdown (bold, bullet lists).`,
    );

    for await (const chunk of agentStream.textStream) {
      accumulated += chunk;
      await s.writeSSE({ data: chunk });
    }

    await s.writeSSE({ data: "[DONE]" });

    // Persist explanation for reference (not used as cache — always re-generates)
    await prisma.questionAttempt.update({
      where: { id: attempt.id },
      data: { explanation: accumulated },
    });
  });
}

// ─── Generate Project ─────────────────────────────────────────────────────────

const projectBodySchema = z.object({
  grade: z.string().min(1),
  subject: z.string().min(1),
  topic: z.string().min(1),
});

export async function generateProject(c: Context) {
  const userId = c.get("userId") as string;

  const bodyRaw = await c.req.json();
  const parsed = projectBodySchema.safeParse(bodyRaw);
  if (!parsed.success) return c.json({ error: "Invalid request body" }, 400);

  const { grade, subject, topic } = parsed.data;

  // Enforce monthly project limit
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  if (user) {
    const limits = PLAN_LIMITS[user.plan];
    const month = currentMonthKey();
    const usage = await prisma.monthlyUsage.findUnique({
      where: { userId_month: { userId, month } },
    });
    if ((usage?.projectsUsed ?? 0) >= limits.projects) {
      return c.json({
        error: "Monthly project limit reached for your plan",
        limitReached: true,
        plan: user.plan,
        limit: limits.projects,
      }, 402);
    }
    await prisma.monthlyUsage.upsert({
      where: { userId_month: { userId, month } },
      create: { userId, month, papersUsed: 0, projectsUsed: 1 },
      update: { projectsUsed: { increment: 1 } },
    });
  }

  // Create placeholder project row so the client has an ID immediately
  const project = await prisma.project.create({
    data: { userId, grade, subject, topic, content: "" },
  });

  c.header("X-Project-Id", project.id);

  let accumulated = "";

  return streamSSE(c, async (s) => {
    const agentStream = await projectAgent.stream(
      `Generate a complete ZIMSEC project report in Markdown format.

Subject: ${subject}
Grade: ${grade}
Topic: ${topic}

Structure the report with these sections (use ## headings):
1. Title Page (school name placeholder, candidate name placeholder, year)
2. Introduction (background and context)
3. Objectives (bulleted list)
4. Methodology (how the project was conducted)
5. Findings / Results (the main content — include tables or lists where appropriate)
6. Analysis and Discussion
7. Conclusion
8. References (at least 3 ZIMSEC-appropriate references)

Write at the appropriate academic level for ZIMSEC ${grade} in Zimbabwe. Use Zimbabwean context, examples, and currency (ZWL) where relevant.`,
    );

    for await (const chunk of agentStream.textStream) {
      accumulated += chunk;
      await s.writeSSE({ data: chunk });
    }

    await s.writeSSE({ data: "[DONE]" });

    await prisma.project.update({
      where: { id: project.id },
      data: { content: accumulated },
    });
  });
}
