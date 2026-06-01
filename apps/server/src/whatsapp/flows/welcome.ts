import type { Message } from "whatsapp-web.js";
import prisma from "@pass/db";
import { PLAN_LIMITS, currentMonthKey, type PlanKey, AMBASSADOR_LIMIT } from "../../lib/planLimits";
import { WELCOME_UNLINKED, HELP_MESSAGE, usageCard } from "../utils/messages";

export async function sendWelcomeUnlinked(msg: Message): Promise<void> {
  await msg.reply(WELCOME_UNLINKED);
}

export async function sendHelp(msg: Message): Promise<void> {
  await msg.reply(HELP_MESSAGE);
}

export async function sendUsageCard(msg: Message, userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true, isAmbassador: true } });
  if (!user) { await msg.reply("Could not load your usage. Try again."); return; }

  const plan = user.plan as PlanKey;
  const baseLimits = PLAN_LIMITS[plan];
  const amb = user.isAmbassador;
  const month = currentMonthKey();

  const usage = await prisma.monthlyUsage.findUnique({
    where: { userId_month: { userId, month } },
  });

  await msg.reply(
    usageCard({
      plan,
      papersUsed:     usage?.papersUsed     ?? 0,
      papersLimit:    amb ? AMBASSADOR_LIMIT : baseLimits.papers,
      projectsUsed:   usage?.projectsUsed   ?? 0,
      projectsLimit:  amb ? AMBASSADOR_LIMIT : baseLimits.projects,
      aiUsed:         usage?.aiMessagesUsed ?? 0,
      aiLimit:        amb ? AMBASSADOR_LIMIT : baseLimits.aiMessages,
      downloadsUsed:  usage?.downloadsUsed  ?? 0,
      downloadsLimit: amb ? AMBASSADOR_LIMIT : baseLimits.downloads,
      isAmbassador:   amb,
    }),
  );
}
