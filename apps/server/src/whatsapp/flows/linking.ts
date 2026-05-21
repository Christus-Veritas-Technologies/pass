/**
 * Account linking flow.
 * The student sends a 6-digit code they generated in the web/native app.
 * On success: User.whatsappId and User.phone are set; conversation is bound.
 */

import prisma from "@pass/db";
import type { Message } from "whatsapp-web.js";
import { bindUser } from "../state/repo";
import { whatsappIdToE164 } from "../utils/phone";
import type { ConversationState } from "../types";
import { LINK_INSTRUCTIONS, LINK_CODE_WRONG, welcomeLinked } from "../utils/messages";

export async function startLinking(
  msg: Message,
  state: ConversationState,
): Promise<ConversationState> {
  await msg.reply(LINK_INSTRUCTIONS);
  return { ...state, mode: { kind: "linking", awaiting: "code" } };
}

export async function tryConsumeCode(
  msg: Message,
  code: string,
  whatsappId: string,
  state: ConversationState,
): Promise<{ linked: boolean; newState: ConversationState }> {
  const record = await prisma.whatsappLinkCode.findUnique({ where: { code } });

  if (!record || record.consumedAt || record.expiresAt < new Date()) {
    await msg.reply(LINK_CODE_WRONG);
    return { linked: false, newState: state };
  }

  const phone = whatsappIdToE164(whatsappId);

  await prisma.$transaction([
    prisma.whatsappLinkCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { phone, whatsappId, whatsappLinkedAt: new Date() },
    }),
  ]);

  await bindUser(whatsappId, record.userId);

  const user = await prisma.user.findUnique({
    where: { id: record.userId },
    select: { name: true, plan: true, grade: true },
  });

  await msg.reply(welcomeLinked(user?.name ?? "Student", user?.plan ?? "FREE", user?.grade));

  return { linked: true, newState: { ...state, mode: { kind: "idle" } } };
}
