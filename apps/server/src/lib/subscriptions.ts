import prisma from "@pass/db";
import type { Plan, SubscriptionStatus } from "@pass/db";
import { PLAN_LIMITS } from "./planLimits";
import { sendNotification } from "./notifications";

/**
 * Check for subscriptions that are expiring soon and mark them for renewal.
 * Also downgrade expired subscriptions.
 * Should be run daily (e.g., via a cron job).
 */
export async function checkSubscriptionExpiry() {
  const now = new Date();

  // Find subscriptions expiring in 7 days
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const expiringSubscriptions = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      expiryDate: {
        lte: sevenDaysFromNow,
        gt: now,
      },
      renewalDue: false,
    },
    include: { user: true },
  });

  // Mark them as renewal due
  for (const sub of expiringSubscriptions) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { renewalDue: true },
    });

    const daysLeft = Math.ceil((sub.expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    if (daysLeft <= 7) {
      await sendNotification(sub.userId, "subscription_expiring", {
        plan: sub.plan,
        daysLeft,
        expiryDate: sub.expiryDate.toISOString(),
      });
    }
  }

  // Find subscriptions that have expired
  const expiredSubscriptions = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      expiryDate: { lte: now },
    },
    include: { user: true },
  });

  // Mark them as expired and downgrade user to FREE
  for (const sub of expiredSubscriptions) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "EXPIRED" },
    });

    await prisma.user.update({
      where: { id: sub.userId },
      data: { plan: "FREE" },
    });

    await sendNotification(sub.userId, "subscription_expired", { plan: sub.plan });
  }
}

/**
 * Get subscription info for a user.
 */
export async function getSubscriptionInfo(userId: string): Promise<{
  plan: Plan;
  status: SubscriptionStatus;
  startDate: Date;
  expiryDate: Date;
  daysRemaining: number;
  isExpired: boolean;
  renewalDue: boolean;
} | null> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return null;
  }

  const now = new Date();
  const daysRemaining = Math.ceil((subscription.expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  return {
    plan: subscription.plan,
    status: subscription.status,
    startDate: subscription.startDate,
    expiryDate: subscription.expiryDate,
    daysRemaining: Math.max(0, daysRemaining),
    isExpired: subscription.status === "EXPIRED",
    renewalDue: subscription.renewalDue,
  };
}

/**
 * Check if a user can perform an action based on their plan limits.
 */
export async function checkPlanLimit(userId: string, resource: "paper" | "project"): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return false;

  // Get the current month in YYYY-MM format
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Get monthly usage
  const usage = await prisma.monthlyUsage.findUnique({
    where: { userId_month: { userId, month } },
  });

  const planLimits = PLAN_LIMITS[user.plan];
  const limit = resource === "paper" ? planLimits.papers : planLimits.projects;
  const used = resource === "paper" ? (usage?.papersUsed || 0) : (usage?.projectsUsed || 0);

  return used < limit;
}

/**
 * Get remaining usage for a user's current plan.
 */
export async function getPlanUsage(userId: string): Promise<{
  plan: Plan;
  papersUsed: number;
  papersLimit: number;
  papersRemaining: number;
  projectsUsed: number;
  projectsLimit: number;
  projectsRemaining: number;
} | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return null;
  }

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const usage = await prisma.monthlyUsage.findUnique({
    where: { userId_month: { userId, month } },
  });

  const limits = PLAN_LIMITS[user.plan];

  return {
    plan: user.plan,
    papersUsed: usage?.papersUsed || 0,
    papersLimit: limits.papers,
    papersRemaining: limits.papers - (usage?.papersUsed || 0),
    projectsUsed: usage?.projectsUsed || 0,
    projectsLimit: limits.projects,
    projectsRemaining: limits.projects - (usage?.projectsUsed || 0),
  };
}
