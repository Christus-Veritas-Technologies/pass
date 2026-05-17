import type { Context } from "hono";

export async function getPapers(c: Context) {
  return c.json({ message: "getPapers" });
}

export async function getPaper(c: Context) {
  return c.json({ message: "getPaper", id: c.req.param("id") });
}

export async function startSession(c: Context) {
  return c.json({ message: "startSession", id: c.req.param("id") });
}

export async function submitAnswer(c: Context) {
  return c.json({ message: "submitAnswer", id: c.req.param("id") });
}

export async function getRecentSessions(c: Context) {
  // Mock data — replace with real DB query once Prisma is connected
  const sessions = [
    {
      id: "session_1",
      paperId: "paper_1",
      paperTitle: "Mathematics Paper 1 2023",
      subject: "Mathematics",
      grade: "Form 4",
      questionsTotal: 20,
      questionsAnswered: 20,
      score: 75,
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "session_2",
      paperId: "paper_2",
      paperTitle: "English Language Paper 2 2022",
      subject: "English Language",
      grade: "Form 4",
      questionsTotal: 15,
      questionsAnswered: 12,
      score: 60,
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "session_3",
      paperId: "paper_3",
      paperTitle: "Combined Science Paper 1 2023",
      subject: "Combined Science",
      grade: "Form 4",
      questionsTotal: 25,
      questionsAnswered: 25,
      score: 88,
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return c.json({ sessions });
}
