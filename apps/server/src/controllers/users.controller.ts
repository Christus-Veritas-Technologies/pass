import { randomInt } from "node:crypto";
import type { Context } from "hono";
import { z } from "zod";
import prisma from "@pass/db";
import { PLAN_LIMITS, AMBASSADOR_LIMIT, type PlanKey, currentMonthKey } from "../lib/planLimits";
import { getReferralCode } from "../lib/referrals";

const USER_SELECT = {
  id: true, email: true, name: true, grade: true, school: true, plan: true, avatarUrl: true, isAmbassador: true,
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
  const baseLimits = PLAN_LIMITS[user.plan as PlanKey] ?? PLAN_LIMITS.FREE;
  // Ambassadors get 1 000 of every quota type regardless of their plan tier.
  const limits = user.isAmbassador
    ? { papers: AMBASSADOR_LIMIT, projects: AMBASSADOR_LIMIT, aiMessages: AMBASSADOR_LIMIT, downloads: AMBASSADOR_LIMIT }
    : baseLimits;
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

  // WhatsApp link status + bonus credits
  const userFull = await prisma.user.findUnique({
    where: { id: userId },
    select: { whatsappId: true, whatsappLinkedAt: true, phone: true, bonusPapers: true, bonusProjects: true },
  });

  // AI messages usage this month
  const month = currentMonthKey();
  const [monthlyUsage, referralCode] = await Promise.all([
    prisma.monthlyUsage.findUnique({ where: { userId_month: { userId, month } } }),
    getReferralCode(userId).catch(() => null),
  ]);

  const planUsageWithAi = {
    ...planUsage,
    aiMessages: { used: monthlyUsage?.aiMessagesUsed ?? 0, limit: limits.aiMessages },
  };

  const whatsapp = {
    linked:   !!userFull?.whatsappId,
    phone:    userFull?.phone ?? null,
    linkedAt: userFull?.whatsappLinkedAt ?? null,
  };

  const referral = {
    code:         referralCode,
    bonusPapers:  userFull?.bonusPapers  ?? 0,
    bonusProjects: userFull?.bonusProjects ?? 0,
  };

  return c.json({ user, stats, planUsage: planUsageWithAi, whatsapp, referral });
}

const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  grade: z.string().optional(),
  school: z.string().optional(),
  avatarUrl: z.string().url().optional().nullable(),
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

// ─── WhatsApp linking ─────────────────────────────────────────────────────────

/**
 * POST /users/me/whatsapp/link-code
 * Issues a fresh 6-digit one-time code the student sends to the bot.
 * TTL: 10 minutes. Invalidates any previous unused code first.
 */
export async function issueWhatsappLinkCode(c: Context): Promise<Response> {
  const userId = c.get("userId") as string;

  // Invalidate any existing unused codes
  await prisma.whatsappLinkCode.deleteMany({ where: { userId, consumedAt: null } });

  const code      = String(randomInt(100_000, 1_000_000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1_000);

  await prisma.whatsappLinkCode.create({ data: { userId, code, expiresAt } });

  return c.json({ code, expiresAt: expiresAt.toISOString() }, 201);
}

/**
 * DELETE /users/me/whatsapp
 * Unlinks the WhatsApp number; orphans the conversation so state is
 * preserved if the user re-links later.
 */
export async function unlinkWhatsapp(c: Context): Promise<Response> {
  const userId = c.get("userId") as string;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { phone: null, whatsappId: null, whatsappLinkedAt: null },
    }),
    prisma.whatsappConversation.updateMany({
      where: { userId },
      data: { userId: null },
    }),
  ]);

  return c.json({ success: true });
}
