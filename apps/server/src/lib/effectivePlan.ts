/**
 * Resolve a user's *effective* plan at read time, accounting for subscription
 * expiry. Quota gates must use this instead of `user.plan` directly: if the
 * daily expiry cron (checkSubscriptionExpiry) is delayed or fails, an expired
 * subscriber must NOT keep paid-plan limits.
 *
 * Conservative by design: only downgrades when a Subscription row exists and is
 * expired/EXPIRED. A paid `user.plan` with no subscription row (e.g. an admin or
 * legacy grant) is trusted as-is. FREE short-circuits with no query.
 */

import prisma from "@pass/db";
import type { Plan } from "@pass/db";

export async function effectivePlan(userId: string, plan: Plan): Promise<Plan> {
  if (plan === "FREE") return "FREE";

  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, expiryDate: true },
  });
  if (!sub) return plan;

  const expired = sub.status === "EXPIRED" || sub.expiryDate.getTime() <= Date.now();
  return expired ? "FREE" : plan;
}
