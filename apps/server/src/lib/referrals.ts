/**
 * Referral system service.
 *
 * Each user gets a unique 8-character referral code on signup.
 * When a referred user completes signup (on any platform), the referrer
 * receives +2 bonus paper credits and +1 bonus project credit.
 */

import { customAlphabet } from "nanoid";
import prisma from "@pass/db";

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export async function generateReferralCode(userId: string): Promise<string> {
  const existing = await prisma.referralCode.findUnique({ where: { userId } });
  if (existing) return existing.code;

  let code: string;
  let attempts = 0;
  while (true) {
    code = nanoid();
    const conflict = await prisma.referralCode.findUnique({ where: { code } });
    if (!conflict) break;
    if (++attempts > 10) throw new Error("Failed to generate unique referral code");
  }

  await prisma.referralCode.create({ data: { userId, code: code! } });
  return code!;
}

export async function getReferralCode(userId: string): Promise<string> {
  return generateReferralCode(userId);
}

export async function validateReferralCode(
  code: string,
): Promise<{ userId: string; code: string } | null> {
  const row = await prisma.referralCode.findUnique({ where: { code } });
  return row ?? null;
}

/**
 * Grants the referrer +2 bonus papers and +1 bonus project.
 * No-ops silently if the referee has already redeemed a code.
 */
export async function applyReferralReward(
  referrerId: string,
  refereeId: string,
): Promise<{ applied: boolean }> {
  const existing = await prisma.referralRedemption.findUnique({
    where: { refereeId },
  });
  if (existing) return { applied: false };

  await prisma.$transaction([
    prisma.referralRedemption.create({
      data: { referrerId, refereeId, rewardGranted: true },
    }),
    prisma.user.update({
      where: { id: referrerId },
      data: { bonusPapers: { increment: 2 }, bonusProjects: { increment: 1 } },
    }),
  ]);

  // Fire notification (non-fatal)
  try {
    const { sendNotification } = await import("./notifications");
    const referee = await prisma.user.findUnique({ where: { id: refereeId }, select: { name: true } });
    await sendNotification(referrerId, "referral_reward", { refereeName: referee?.name ?? "someone" });
  } catch {
    // notifications may not be configured
  }

  return { applied: true };
}
