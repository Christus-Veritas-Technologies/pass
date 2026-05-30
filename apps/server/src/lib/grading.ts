/**
 * Shared answer-grading logic for the paper study feature.
 *
 * The marking rubric is loaded SERVER-SIDE from the stored PaperQuestion —
 * the client never supplies it. Grading runs on Haiku because the rubric is
 * pre-extracted, making it a cheap constrained task.
 */

import prisma from "@pass/db";
import type { PaperSession, PaperQuestion, Resource } from "@pass/db";
import { gradingAgent, evaluationSchema, type Evaluation } from "../mastra/agents/grading.agent";

export { evaluationSchema };
export type { Evaluation };

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
): Promise<{ session: PaperSession & { resource: Resource }; question: PaperQuestion } | null> {
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

/** Grade a student's answer (Haiku) against the stored rubric, via the Mastra gradingAgent. */
export async function gradeAnswer(
  question: GradableQuestion,
  userAnswer: string,
): Promise<Evaluation> {
  const guide = effectiveGuide(question);
  const prompt = `Mark this ZIMSEC exam answer against the official marking rubric.
${question.hasDiagram ? "Note: this question refers to a diagram in the paper — mark the student's textual reasoning leniently.\n" : ""}
Question (${question.marks} marks):
${question.text}

Marking rubric / accepted points:
${guide}

Student's answer:
${userAnswer || "(no answer provided)"}

maxScore must equal ${question.marks}.`;

  const result = await gradingAgent.generate(prompt, {
    structuredOutput: { schema: evaluationSchema },
  });
  return evaluationSchema.parse(result.object);
}
