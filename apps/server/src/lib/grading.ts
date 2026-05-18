/**
 * Shared answer-grading logic for the paper study feature.
 *
 * The marking rubric is loaded SERVER-SIDE from the stored PaperQuestion —
 * the client never supplies it. Grading runs on Haiku because the rubric is
 * pre-extracted, making it a cheap constrained task.
 */

import { generateText } from "ai";
import { z } from "zod";
import prisma from "@pass/db";
import { anthropic, CLAUDE_GRADING_MODEL } from "./anthropic";

export const evaluationSchema = z.object({
  isCorrect: z.boolean(),
  score: z.number(),
  maxScore: z.number(),
  feedback: z.string(),
  pointsEarned: z.array(z.string()),
  pointsMissed: z.array(z.string()),
});

export type Evaluation = z.infer<typeof evaluationSchema>;

type GradableQuestion = {
  text: string;
  marks: number;
  hasDiagram: boolean;
  officialGuide: string | null;
  aiModelAnswer: string;
};

/** The rubric to grade against — official scheme if attached, else AI-generated. */
export function effectiveGuide(q: { officialGuide: string | null; aiModelAnswer: string }): string {
  return q.officialGuide ?? q.aiModelAnswer;
}

/**
 * Load a stored question for a session, scoped to the owning user.
 * Returns null if the session/question doesn't exist or isn't the user's.
 */
export async function getSessionQuestion(
  sessionId: string,
  userId: string,
  questionNumber: number,
) {
  const session = await prisma.paperSession.findFirst({
    where: { id: sessionId, userId },
    include: { resource: true },
  });
  if (!session) return null;

  const question = await prisma.paperQuestion.findUnique({
    where: { resourceId_questionNumber: { resourceId: session.resourceId, questionNumber } },
  });
  return question ? { session, question } : null;
}

/** Strip ```json fences a model sometimes wraps JSON in. */
function unfence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
}

/** Grade a student's answer with Haiku against the stored rubric. */
export async function gradeAnswer(
  question: GradableQuestion,
  userAnswer: string,
): Promise<Evaluation> {
  const guide = effectiveGuide(question);
  const { text } = await generateText({
    model: anthropic(CLAUDE_GRADING_MODEL),
    maxTokens: 700,
    prompt: `You are marking a ZIMSEC (Zimbabwe) exam answer against the official marking rubric.
${question.hasDiagram ? "Note: this question refers to a diagram in the paper — mark the student's textual reasoning leniently.\n" : ""}
Question (${question.marks} marks):
${question.text}

Marking rubric / accepted points:
${guide}

Student's answer:
${userAnswer || "(no answer provided)"}

Award marks only for points the student clearly made. Be fair, accurate and encouraging.

Return ONLY a JSON object — no markdown, no prose — with exactly these keys:
  "isCorrect": boolean (true if the answer earns most of the marks),
  "score": number (marks awarded),
  "maxScore": number (must equal ${question.marks}),
  "feedback": string (2-4 encouraging sentences),
  "pointsEarned": string[] (rubric points the student made),
  "pointsMissed": string[] (rubric points the student missed).`,
  });
  return evaluationSchema.parse(JSON.parse(unfence(text)));
}
