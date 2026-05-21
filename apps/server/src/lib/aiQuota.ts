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
import { PLAN_LIMITS, currentMonthKey } from "./planLimits";

export interface AiQuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
}

/**
 * Atomically increment the AI-message counter and check whether the user
 * is still within their plan limit.  Rolls back the increment when the
 * user has already hit the cap so we never double-count.
 */
export async function checkAndIncrementAiMessage(userId: string): Promise<AiQuotaResult> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  if (!user) throw new Error(`User ${userId} not found`);

  const limit = PLAN_LIMITS[user.plan].aiMessages;

  // Short-circuit for unlimited plans — no DB write needed
  if (limit === Infinity) {
    return { allowed: true, used: 0, limit: Infinity };
  }

  const month = currentMonthKey();

  const usage = await prisma.monthlyUsage.upsert({
    where: { userId_month: { userId, month } },
    create: { userId, month, papersUsed: 0, projectsUsed: 0, aiMessagesUsed: 1 },
    update: { aiMessagesUsed: { increment: 1 } },
  });

  if (usage.aiMessagesUsed > limit) {
    await prisma.monthlyUsage.update({
      where: { userId_month: { userId, month } },
      data: { aiMessagesUsed: { decrement: 1 } },
    });
    return { allowed: false, used: limit, limit };
  }

  return { allowed: true, used: usage.aiMessagesUsed, limit };
}

export async function getAiMessageUsage(userId: string): Promise<AiQuotaResult> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  if (!user) throw new Error(`User ${userId} not found`);

  const limit = PLAN_LIMITS[user.plan].aiMessages;
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
