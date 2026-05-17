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

  // Mock usage stats — replace with real queries once DB is connected
  const stats = {
    papersAttempted: 12,
    questionsAnswered: 148,
    currentStreak: 5,
    weeklyGoal: 20,
    weeklyProgress: 14,
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
