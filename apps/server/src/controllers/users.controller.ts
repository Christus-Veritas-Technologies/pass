import type { Context } from "hono";
import { z } from "zod";
import prisma from "@pass/db";

const USER_SELECT = {
  id: true, email: true, name: true, grade: true, school: true, plan: true,
} as const;

export async function getMe(c: Context) {
  const userId = c.get("userId") as string;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
  if (!user) return c.json({ error: "User not found" }, 404);

  // Real stats from DB
  const [papersAttempted, questionsAnswered, projectsGenerated] = await Promise.all([
    prisma.paperSession.count({ where: { userId } }),
    prisma.questionAttempt.count({ where: { session: { userId } } }),
    prisma.project.count({ where: { userId } }),
  ]);

  // Weekly progress: sessions created in the last 7 days
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weeklyProgress = await prisma.paperSession.count({
    where: { userId, createdAt: { gte: weekStart } },
  });

  const stats = {
    papersAttempted,
    questionsAnswered,
    projectsGenerated,
    currentStreak: 0, // Streak calculation requires daily activity tracking — placeholder
    weeklyGoal: 5,
    weeklyProgress,
  };

  return c.json({ user, stats });
}

const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  grade: z.string().optional(),
  school: z.string().optional(),
});

export async function updateMe(c: Context) {
  const userId = c.get("userId") as string;
  const body = await c.req.json().catch(() => null);
  const parsed = updateMeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request body" }, 400);

  const user = await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
    select: USER_SELECT,
  });

  return c.json({ user });
}
