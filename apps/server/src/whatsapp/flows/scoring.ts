/**
 * Diagram-aware score recalculation.
 *
 * Questions with hasDiagram = true are excluded from both numerator and
 * denominator, giving an honest percentage over the answerable questions.
 */

import type { PaperQuestion, QuestionAttempt } from "@pass/db";

export interface ScoreResult {
  earned: number;
  consideredMarks: number;
  skippedMarks: number;
  skippedCount: number;
  totalMarks: number;
  percentage: number;
  breakdown: Array<{
    qn: number;
    score?: number;
    maxScore: number;
    hasDiagram: boolean;
    topic?: string | null;
  }>;
}

export function recalculateScore(
  questions: PaperQuestion[],
  attempts: QuestionAttempt[],
): ScoreResult {
  const sorted = [...questions].sort((a, b) => a.questionNumber - b.questionNumber);

  let earned = 0;
  let consideredMarks = 0;
  let skippedMarks = 0;
  let skippedCount = 0;

  const breakdown = sorted.map((q) => {
    const attempt = attempts.find((a) => a.questionNumber === q.questionNumber);
    const ev = attempt?.evaluation as { score?: number } | null;
    const score = ev?.score;

    if (q.hasDiagram) {
      skippedMarks += q.marks;
      skippedCount++;
      return { qn: q.questionNumber, maxScore: q.marks, hasDiagram: true, topic: q.topic };
    }

    consideredMarks += q.marks;
    earned += score ?? 0;
    return { qn: q.questionNumber, score: score ?? 0, maxScore: q.marks, hasDiagram: false, topic: q.topic };
  });

  const totalMarks = consideredMarks + skippedMarks;
  const percentage = consideredMarks > 0 ? Math.round((earned / consideredMarks) * 100) : 0;

  return { earned, consideredMarks, skippedMarks, skippedCount, totalMarks, percentage, breakdown };
}
