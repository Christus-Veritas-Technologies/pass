/**
 * WhatsApp-native email+password signup and signin flows.
 *
 * Users can create or access a Pass account entirely within WhatsApp
 * without needing to visit the web or native app first.
 */

import type { Message } from "whatsapp-web.js";
import prisma from "@pass/db";
import { hashPassword, verifyPassword } from "../../lib/password";
import { bindUser } from "../state/repo";
import { whatsappIdToE164 } from "../utils/phone";
import { welcomeLinked } from "../utils/messages";
import { validateReferralCode, applyReferralReward } from "../../lib/referrals";
import { sendNotification } from "../../lib/notifications";
import type { ConversationState } from "../types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Partially masks an email for display: "ab***@domain.com" */
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(0, local.length - visible.length))}@${domain}`;
}

// ─── Sign-up ──────────────────────────────────────────────────────────────────

export async function startSignup(
  msg: Message,
  state: ConversationState,
): Promise<ConversationState> {
  await msg.reply(
    `Let's create your Pass account 📚\n\nWhat's your *email address*?`,
  );
  return { ...state, mode: { kind: "signing_up", step: "email" } };
}

export async function handleSignupReply(
  msg: Message,
  text: string,
  whatsappId: string,
  state: ConversationState,
): Promise<ConversationState> {
  if (state.mode.kind !== "signing_up") return state;
  const s = state.mode;
  const t = text.trim();

  if (s.step === "email") {
    if (!EMAIL_RE.test(t)) {
      await msg.reply("That doesn't look like a valid email address. Please try again.");
      return state;
    }
    const existing = await prisma.user.findUnique({ where: { email: t.toLowerCase() } });
    if (existing) {
      await msg.reply(
        `An account with *${t}* already exists.\n\nReply *signin* to log in, or use a different email address.`,
      );
      return { ...state, mode: { kind: "idle" } };
    }
    await msg.reply(`Great! What's your *name*?`);
    return { ...state, mode: { ...s, step: "name", email: t.toLowerCase() } };
  }

  if (s.step === "name") {
    if (!t) {
      await msg.reply("Please enter your name.");
      return state;
    }
    await msg.reply(
      `Almost there! Choose a *password* (at least 8 characters).\n\n_Use a unique password not used elsewhere — WhatsApp messages are end-to-end encrypted but may appear as plaintext in notifications._`,
    );
    return { ...state, mode: { ...s, step: "password", name: t } };
  }

  if (s.step === "password") {
    if (t.length < 8) {
      await msg.reply("Password must be at least 8 characters. Please try again.");
      return state;
    }

    // Check whether this WhatsApp number is already tied to an existing account.
    // This prevents two accounts from sharing the same phone/WA number.
    const phone = whatsappIdToE164(whatsappId);
    const conflict = await prisma.user.findFirst({
      where: {
        OR: [
          { whatsappId },
          ...(phone ? [{ phone }] : []),
        ],
      },
      select: { email: true },
    });
    if (conflict) {
      await msg.reply(
        `This WhatsApp number is already linked to an account (*${maskEmail(conflict.email)}*).\n\n` +
        `Reply *signin* to log into that account, or contact support if you think this is a mistake.`,
      );
      return { ...state, mode: { kind: "idle" } };
    }

    const passwordHash = await hashPassword(t);
    const user = await prisma.user.create({
      data: {
        email:           s.email!,
        name:            s.name!,
        passwordHash,
        phone,          // already derived above
        whatsappId,
        whatsappLinkedAt: new Date(),
      },
    });
    await bindUser(whatsappId, user.id);

    // Auto-generate referral code for new user
    try {
      const { generateReferralCode } = await import("../../lib/referrals");
      await generateReferralCode(user.id);
    } catch {
      // Non-fatal
    }

    await msg.reply(
      `${welcomeLinked(user.name, user.plan, user.grade)}\n\nGot a referral code? Reply with it to earn bonus credits, or reply *skip* to continue.`,
    );
    return { ...state, mode: { kind: "signing_up", step: "referral_code", newUserId: user.id } };
  }

  if (s.step === "referral_code") {
    if (/^skip$/i.test(t)) {
      await msg.reply("You're all set! What would you like to do first? Reply *help* for options.");
      return { ...state, mode: { kind: "idle" } };
    }
    const ref = await validateReferralCode(t.toUpperCase());
    if (!ref) {
      await msg.reply("That referral code doesn't look right. Reply *skip* to continue without one.");
      return state;
    }
    if (ref.userId === s.newUserId) {
      await msg.reply("You can't use your own referral code! Reply *skip* to continue.");
      return state;
    }
    await applyReferralReward(ref.userId, s.newUserId!);
    await msg.reply("✅ Referral applied! Your referrer has earned bonus credits. You're all set 🎉");
    return { ...state, mode: { kind: "idle" } };
  }

  return state;
}

// ─── Sign-in ──────────────────────────────────────────────────────────────────

export async function startSignin(
  msg: Message,
  state: ConversationState,
): Promise<ConversationState> {
  await msg.reply(`Welcome back! What's your *email address*?`);
  return { ...state, mode: { kind: "signing_in", step: "email" } };
}

export async function handleSigninReply(
  msg: Message,
  text: string,
  whatsappId: string,
  state: ConversationState,
): Promise<ConversationState> {
  if (state.mode.kind !== "signing_in") return state;
  const s = state.mode;
  const t = text.trim();

  if (s.step === "email") {
    if (!EMAIL_RE.test(t)) {
      await msg.reply("That doesn't look like a valid email. Please try again, or reply *cancel* to go back.");
      return state;
    }
    const user = await prisma.user.findUnique({ where: { email: t.toLowerCase() } });
    if (!user) {
      await msg.reply(
        `No account found for *${t}*.\n\nReply *signup* to create one, or try a different email.`,
      );
      return { ...state, mode: { kind: "idle" } };
    }
    if (!user.passwordHash) {
      await msg.reply(
        `Your account uses Google sign-in. To link WhatsApp, please visit *pass.co.zw → Settings → Connect WhatsApp* and use the 6-digit code instead.`,
      );
      return { ...state, mode: { kind: "idle" } };
    }
    await msg.reply(`What's your *password*?`);
    return { ...state, mode: { ...s, step: "password", email: t.toLowerCase() } };
  }

  if (s.step === "password") {
    const user = await prisma.user.findUnique({ where: { email: s.email! } });
    if (!user || !user.passwordHash) {
      await msg.reply("Something went wrong. Reply *signin* to try again.");
      return { ...state, mode: { kind: "idle" } };
    }
    const ok = await verifyPassword(t, user.passwordHash);
    if (!ok) {
      await msg.reply("Incorrect password. Please try again, or reply *cancel* to go back.");
      return state;
    }

    // Check if this WhatsApp number is already linked to a DIFFERENT account.
    const phone = whatsappIdToE164(whatsappId);
    const conflict = await prisma.user.findFirst({
      where: {
        AND: [
          { id: { not: user.id } },
          { OR: [{ whatsappId }, ...(phone ? [{ phone }] : [])] },
        ],
      },
      select: { email: true },
    });
    if (conflict) {
      await msg.reply(
        `This WhatsApp number is already linked to a different account (*${maskEmail(conflict.email)}*).\n\n` +
        `To log into *that* account, reply *cancel* and then *signin* with its email.\n` +
        `To move this WhatsApp number to the current account, please visit *pass.co.zw → Settings* to unlink it first.`,
      );
      return { ...state, mode: { kind: "idle" } };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { phone, whatsappId, whatsappLinkedAt: new Date() },
    });
    await bindUser(whatsappId, user.id);
    sendNotification(user.id, "new_device_signin", { device: "WhatsApp" }).catch(() => undefined);

    await msg.reply(welcomeLinked(user.name, user.plan, user.grade));
    return { ...state, mode: { kind: "idle" } };
  }

  return state;
}
