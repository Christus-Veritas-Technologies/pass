import type { Context } from "hono";
import prisma from "@pass/db";
import { passAgent } from "../mastra";

// ─── GET /study/stats ─────────────────────────────────────────────────────────

export async function getStudyStats(c: Context) {
  const userId = c.get("userId") as string;

  const [sessionsCompleted, sessionsStarted, totalQuestionsAnswered] = await Promise.all([
    prisma.paperSession.count({ where: { userId, completedAt: { not: null } } }),
    prisma.paperSession.count({ where: { userId } }),
    prisma.questionAttempt.count({ where: { session: { userId } } }),
  ]);

  const passRate =
    sessionsStarted > 0 ? Math.round((sessionsCompleted / sessionsStarted) * 100) : 0;

  const recentSessions = await prisma.paperSession.findMany({
    where: { userId, completedAt: { not: null } },
    include: { resource: true, questionAttempts: true },
    orderBy: { completedAt: "desc" },
    take: 5,
  });

  const sessions = recentSessions.map((s) => ({
    id: s.id,
    paperId: s.resourceId,
    paperTitle: s.resource.title,
    subject: s.resource.subject,
    grade: s.resource.grade,
    mode: s.mode,
    questionsAnswered: s.questionsAnswered,
    completedAt: s.completedAt,
  }));

  return c.json({ sessionsCompleted, sessionsStarted, passRate, totalQuestionsAnswered, sessions });
}

// ─── POST /study/prepare ──────────────────────────────────────────────────────

export async function prepareStudySession(c: Context) {
  const body = await c.req.json().catch(() => null);
  const paperId = body?.paperId as string | undefined;

  if (!paperId) return c.json({ error: "paperId is required" }, 400);

  const paper = await prisma.resource.findUnique({ where: { id: paperId } });
  if (!paper) return c.json({ error: "Paper not found" }, 404);

  try {
    const response = await passAgent.generate([
      {
        role: "user",
        content: `Use the lookupResource tool to fetch resource "${paper.id}", then write a concise 2-3 sentence study brief for a ${paper.grade} student about to attempt this ${paper.subject} ${paper.year} past paper. Include what key topics to expect and one quick exam tip. Be encouraging.`,
      },
    ]);

    return c.json({
      paper: {
        id: paper.id,
        title: paper.title,
        subject: paper.subject,
        grade: paper.grade,
        year: paper.year,
      },
      brief: response.text,
    });
  } catch (err) {
    console.error("Mastra prepare error:", err);
    // Graceful fallback — still allow the session to proceed
    return c.json({
      paper: {
        id: paper.id,
        title: paper.title,
        subject: paper.subject,
        grade: paper.grade,
        year: paper.year,
      },
      brief: `You're about to attempt the ${paper.subject} ${paper.grade} ${paper.year} past paper. Read each question carefully, manage your time, and show all working. Good luck!`,
    });
  }
}
