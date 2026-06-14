/**
 * Per-user AI-message quota enforcement.
 *
 * Counts every outbound AI-generated reply (chat, grading, explanation).
 * Hard-coded bot responses (welcome, menu, quota walls) do NOT count.
 *
 * Limits:
 *   FREE  → 100 / month
 *   STUDY → 500 / month
 *   PASS  → unlimited
 */
import prisma from "@pass/db";
import { PLAN_LIMITS, currentMonthKey, AMBASSADOR_LIMIT } from "./planLimits";
import { effectivePlan } from "./effectivePlan";

export interface AiQuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
}

/**
 * Atomically increment the AI-message counter and check whether the user
 * is still within their plan limit.  Rolls back the increment when the
 * user has already hit the cap so we never double-count.
 *
 * `cost` is how many messages this request consumes (default 1). The in-app
 * chat charges 2 when a message carries a file upload (vision is pricier);
 * every other caller keeps the default of 1. The charge is all-or-nothing:
 * if the full cost won't fit under the cap the counter is left untouched and
 * `allowed` is false — we never partially charge or exceed the limit.
 */
export async function checkAndIncrementAiMessage(userId: string, cost = 1): Promise<AiQuotaResult> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true, isAmbassador: true } });
  if (!user) throw new Error(`User ${userId} not found`);

  const plan = user.isAmbassador ? user.plan : await effectivePlan(userId, user.plan);
  const limit = user.isAmbassador ? AMBASSADOR_LIMIT : PLAN_LIMITS[plan].aiMessages;

  // Short-circuit for unlimited plans — no DB write needed
  if (limit === Infinity) {
    return { allowed: true, used: 0, limit: Infinity };
  }

  const month = currentMonthKey();

  // Ensure the row exists, then consume `cost` messages ONLY if the FULL cost
  // still fits under the limit — a single atomic conditional update. This
  // avoids the previous increment-then-check-then-rollback race where
  // concurrent requests at the boundary could each slip through before any
  // rolled back. With cost=1, `lte: limit - 1` is exactly the old `lt: limit`.
  await prisma.monthlyUsage.upsert({
    where: { userId_month: { userId, month } },
    create: { userId, month, papersUsed: 0, projectsUsed: 0, aiMessagesUsed: 0 },
    update: {},
  });

  // updateMany takes a plain WhereInput (flat fields) — NOT the compound
  // `userId_month` unique selector, which is only valid for single-record ops
  // (findUnique/update/upsert). userId + month is unique so this still matches
  // exactly the one row.
  const consumed = await prisma.monthlyUsage.updateMany({
    where: { userId, month, aiMessagesUsed: { lte: limit - cost } },
    data: { aiMessagesUsed: { increment: cost } },
  });

  const usage = await prisma.monthlyUsage.findUnique({ where: { userId_month: { userId, month } } });
  const used = usage?.aiMessagesUsed ?? 0;

  if (consumed.count === 0) {
    return { allowed: false, used, limit };
  }
  return { allowed: true, used, limit };
}

export async function getAiMessageUsage(userId: string): Promise<AiQuotaResult> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true, isAmbassador: true } });
  if (!user) throw new Error(`User ${userId} not found`);

  const plan = user.isAmbassador ? user.plan : await effectivePlan(userId, user.plan);
  const limit = user.isAmbassador ? AMBASSADOR_LIMIT : PLAN_LIMITS[plan].aiMessages;
  const month = currentMonthKey();

  const usage = await prisma.monthlyUsage.findUnique({
    where: { userId_month: { userId, month } },
  });

  return {
    allowed: (usage?.aiMessagesUsed ?? 0) < limit,
    used: usage?.aiMessagesUsed ?? 0,
    limit,
  };
}

// ─── Per-feature read-only quota checks ───────────────────────────────────────
// Used by the router to short-circuit feature flows before they collect slots.

export interface FeatureQuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
  plan: string;
}

export async function checkPapersQuota(userId: string): Promise<FeatureQuotaResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, bonusPapers: true, isAmbassador: true },
  });
  if (!user) return { allowed: false, used: 0, limit: 0, plan: "FREE" };

  const plan = user.isAmbassador ? user.plan : await effectivePlan(userId, user.plan);
  const limit = user.isAmbassador ? AMBASSADOR_LIMIT : PLAN_LIMITS[plan as import("./planLimits").PlanKey].papers;
  const month = currentMonthKey();
  const usage = await prisma.monthlyUsage.findUnique({ where: { userId_month: { userId, month } } });

  const used = usage?.papersUsed ?? 0;
  const hasBonusCredits = !user.isAmbassador && (user.bonusPapers ?? 0) > 0;
  return {
    allowed: used < limit || hasBonusCredits,
    used,
    limit,
    plan,
  };
}

export async function checkProjectsQuota(userId: string): Promise<FeatureQuotaResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, bonusProjects: true, isAmbassador: true },
  });
  if (!user) return { allowed: false, used: 0, limit: 0, plan: "FREE" };

  const plan = user.isAmbassador ? user.plan : await effectivePlan(userId, user.plan);
  const limit = user.isAmbassador ? AMBASSADOR_LIMIT : PLAN_LIMITS[plan as import("./planLimits").PlanKey].projects;
  const month = currentMonthKey();
  const usage = await prisma.monthlyUsage.findUnique({ where: { userId_month: { userId, month } } });

  const used = usage?.projectsUsed ?? 0;
  const hasBonusCredits = !user.isAmbassador && (user.bonusProjects ?? 0) > 0;
  return {
    allowed: used < limit || hasBonusCredits,
    used,
    limit,
    plan,
  };
}
