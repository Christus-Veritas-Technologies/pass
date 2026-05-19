import type { Context } from "hono";
import { z } from "zod";
import prisma from "@pass/db";
import { PLAN_LIMITS, type PlanKey } from "../lib/planLimits";

const USER_SELECT = {
  id: true, email: true, name: true, grade: true, school: true, plan: true,
} as const;

export async function getMe(c: Context): Promise<Response> {
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

  // Current month usage for plan limits
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [monthPapers, monthProjects] = await Promise.all([
    prisma.paperSession.count({ where: { userId, createdAt: { gte: monthStart } } }),
    prisma.project.count({ where: { userId, createdAt: { gte: monthStart } } }),
  ]);
  const limits = PLAN_LIMITS[user.plan as PlanKey] ?? PLAN_LIMITS.FREE;
  const planUsage = {
    papers:   { used: monthPapers,   limit: limits.papers },
    projects: { used: monthProjects, limit: limits.projects },
  };

  const stats = {
    papersAttempted,
    questionsAnswered,
    projectsGenerated,
    currentStreak: 0,
    weeklyGoal: 5,
    weeklyProgress,
  };

  return c.json({ user, stats, planUsage });
}

const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  grade: z.string().optional(),
  school: z.string().optional(),
});

export async function updateMe(c: Context): Promise<Response> {
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
