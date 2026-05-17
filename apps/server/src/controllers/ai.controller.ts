import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import { z } from "zod";
import prisma from "@pass/db";
import { passAgent } from "../mastra";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const evaluationSchema = z.object({
  isCorrect: z.boolean(),
  score: z.number(),
  maxScore: z.number(),
  feedback: z.string(),
  pointsEarned: z.array(z.string()),
  pointsMissed: z.array(z.string()),
});

const evaluateBodySchema = z.object({
  questionNumber: z.number().int().positive(),
  questionText: z.string().min(1),
  markingGuide: z.string().min(1),
  userAnswer: z.string().min(1),
});

// ─── Evaluate ────────────────────────────────────────────────────────────────

export async function evaluateAnswer(c: Context) {
  const userId = c.get("userId") as string;
  const sessionId = c.req.param("sessionId");

  const bodyRaw = await c.req.json();
  const parsed = evaluateBodySchema.safeParse(bodyRaw);
  if (!parsed.success) return c.json({ error: "Invalid request body" }, 400);

  const { questionNumber, questionText, markingGuide, userAnswer } = parsed.data;

  const session = await prisma.paperSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) return c.json({ error: "Session not found" }, 404);

  // Return cached evaluation if it exists
  const existing = await prisma.questionAttempt.findUnique({
    where: { sessionId_questionNumber: { sessionId, questionNumber } },
  });
  if (existing?.evaluation) {
    return c.json(existing.evaluation);
  }

  // Generate evaluation using Pass agent (structured output)
  const result = await passAgent.generate(
    [
      {
        role: "user" as const,
        content: `Evaluate this ZIMSEC exam answer and return structured JSON.

Question: ${questionText}

Marking Guide / Accepted Answers:
${markingGuide}

Student's Answer: ${userAnswer}

Evaluate strictly according to the marking guide. Award marks only for points the student clearly addressed.`,
      },
    ],
    { output: evaluationSchema },
  );

  const evaluation = (result as { object: z.infer<typeof evaluationSchema> }).object;

  // Cache the result and track the attempt
  await prisma.questionAttempt.upsert({
    where: { sessionId_questionNumber: { sessionId, questionNumber } },
    create: {
      sessionId,
      questionNumber,
      questionText,
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
  const sessionId = c.req.param("sessionId");
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

  let accumulated = "";

  return streamSSE(c, async (s) => {
    const agentStream = await passAgent.stream([
      {
        role: "user" as const,
        content: `A ZIMSEC student got this question wrong and has clicked "Explain this". Give them a helpful, detailed explanation.

Question: ${attempt.questionText}

Student's Answer: ${attempt.userAnswer}

Please explain:
1. What the correct answer is and the key points the marking guide expects
2. Why those points are important — the underlying concept
3. How to approach similar questions in the exam (exam technique)
4. A memory tip or shortcut if applicable

Keep the language clear and encouraging for a secondary school student. You can use simple Markdown (bold, bullet lists).`,
      },
    ]);

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

  // Create placeholder project row so the client has an ID immediately
  const project = await prisma.project.create({
    data: { userId, grade, subject, topic, content: "" },
  });

  c.header("X-Project-Id", project.id);

  let accumulated = "";

  return streamSSE(c, async (s) => {
    const agentStream = await passAgent.stream([
      {
        role: "user" as const,
        content: `Generate a complete ZIMSEC project report in Markdown format.

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
      },
    ]);

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
