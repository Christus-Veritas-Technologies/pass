/**
 * WhatsApp in-chat upgrade flow via Ecocash / OneMoney (Paynow mobile money).
 *
 * State machine:
 *   choose_plan → choose_method → enter_phone → awaiting_payment
 *
 * After initiating the Paynow mobile transaction, a background poller checks
 * every 5 seconds (up to 2 minutes). On success it upgrades the DB plan and
 * sends a WhatsApp confirmation.
 */

import type { Client, Message } from "whatsapp-web.js";
import prisma from "@pass/db";
import { Paynow } from "paynow";
import { env } from "@pass/env/server";
import { PLAN_PRICES, PLAN_DESCRIPTIONS } from "@pass/pricing";
import type { ConversationState } from "../types";
import { sendNotification } from "../../lib/notifications";

const RESULT_URL = "https://pass.co.zw/api/paynow/result";
const RETURN_URL = "https://pass.co.zw/pricing";

const PLAN_LABELS: Record<"STUDY" | "PASS", string> = {
  STUDY: "Study — $4.99/month",
  PASS: "Pass — $7.99/month",
};

export async function startUpgrade(
  msg: Message,
  state: ConversationState,
): Promise<ConversationState> {
  await msg.reply(
    `*Upgrade your Pass plan* 🚀\n\nChoose a plan:\n  1️⃣  *Study* — $4.99/month (12 papers, 500 AI replies)\n  2️⃣  *Pass*  — $7.99/month (20 papers, unlimited AI replies)\n\nReply *1* or *2*, or *cancel* to go back.`,
  );
  return { ...state, mode: { kind: "upgrading", step: "choose_plan" } };
}

export async function handleUpgradeReply(
  client: Client,
  msg: Message,
  text: string,
  whatsappId: string,
  userId: string,
  state: ConversationState,
): Promise<ConversationState> {
  if (state.mode.kind !== "upgrading") return state;
  const s = state.mode;
  const t = text.trim();

  // ── choose_plan ────────────────────────────────────────────────────────────
  if (s.step === "choose_plan") {
    let plan: "STUDY" | "PASS" | undefined;
    if (t === "1" || /\bstudy\b/i.test(t)) plan = "STUDY";
    if (t === "2" || /\bpass\b/i.test(t)) plan = "PASS";

    if (!plan) {
      await msg.reply("Please reply *1* for Study or *2* for Pass, or *cancel* to go back.");
      return state;
    }

    await msg.reply(
      `You chose *${PLAN_LABELS[plan]}*.\n\nHow would you like to pay?\n  1️⃣  EcoCash\n  2️⃣  OneMoney\n\nReply *1* or *2*, or *cancel* to go back.`,
    );
    return { ...state, mode: { ...s, step: "choose_method", plan } };
  }

  // ── choose_method ─────────────────────────────────────────────────────────
  if (s.step === "choose_method") {
    let method: "ecocash" | "onemoney" | undefined;
    if (t === "1" || /\becocash\b/i.test(t)) method = "ecocash";
    if (t === "2" || /\bonemoney\b/i.test(t)) method = "onemoney";

    if (!method) {
      await msg.reply("Please reply *1* for EcoCash or *2* for OneMoney, or *cancel* to go back.");
      return state;
    }

    // Pre-fill phone from profile if available
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    const prefilled = user?.phone ?? null;

    if (prefilled) {
      await msg.reply(
        `We have *${prefilled}* on file.\n\nReply *yes* to use it, or type a different number (e.g. 0771234567).`,
      );
    } else {
      await msg.reply(
        `Please send your ${method === "ecocash" ? "EcoCash" : "OneMoney"} number (e.g. 0771234567).`,
      );
    }
    return { ...state, mode: { ...s, step: "enter_phone", method, phone: prefilled ?? undefined } };
  }

  // ── enter_phone ───────────────────────────────────────────────────────────
  if (s.step === "enter_phone") {
    let phone: string;

    if (/^yes$/i.test(t) && s.phone) {
      phone = s.phone;
    } else {
      // Accept 07XXXXXXXX or +2637XXXXXXXX or 2637XXXXXXXX
      const clean = t.replace(/\s+/g, "");
      const match = /^(?:\+?263|0)(7[0-9]{8})$/.exec(clean);
      if (!match) {
        await msg.reply("That doesn't look like a valid Zimbabwean mobile number. Please try again (e.g. 0771234567).");
        return state;
      }
      phone = `+263${match[1]}`;
    }

    if (!s.plan || !s.method) {
      await msg.reply("Something went wrong. Reply *UPGRADE* to start again.");
      return { ...state, mode: { kind: "idle" } };
    }

    const amount = PLAN_PRICES[s.plan].MONTHLY;
    const description = PLAN_DESCRIPTIONS[s.plan].MONTHLY;

    // Create DB record
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const transaction = await prisma.paymentTransaction.create({
      data: {
        userId,
        amount,
        plan: s.plan,
        billingCycle: "MONTHLY",
        status: "pending",
      },
    });

    // Initiate Paynow mobile money
    const pn = new Paynow(
      env.PAYNOW_INTEGRATION_ID ?? "",
      env.PAYNOW_INTEGRATION_KEY ?? "",
    );
    pn.resultUrl = RESULT_URL;
    pn.returnUrl = RETURN_URL;

    const payment = pn.createPayment(transaction.id, user?.email ?? "student@pass.co.zw");
    payment.add(description, amount);

    let response;
    try {
      response = await pn.sendMobile(payment, phone, s.method);
    } catch (err) {
      console.error("[upgrade] Paynow sendMobile error:", err);
      await msg.reply("There was a problem connecting to the payment gateway. Please try again later or visit https://pass.co.zw/pricing to upgrade online.");
      return { ...state, mode: { kind: "idle" } };
    }

    if (!response.success || !response.pollUrl) {
      await msg.reply(
        `Payment initiation failed: ${response.error ?? "unknown error"}.\n\nYou can also upgrade at https://pass.co.zw/pricing`,
      );
      return { ...state, mode: { kind: "idle" } };
    }

    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        paynowRef: response.reference ?? transaction.id,
        pollUrl: response.pollUrl,
      },
    });

    await msg.reply(
      `✅ *Payment request sent!*\n\nCheck your phone for the ${s.method === "ecocash" ? "EcoCash" : "OneMoney"} prompt and approve $${amount.toFixed(2)}.\n\nI'll confirm once it goes through (this may take a minute).`,
    );

    // Start background poller
    pollUpgradePayment(client, whatsappId, userId, response.pollUrl, transaction.id, s.plan, pn);

    return { ...state, mode: { kind: "idle" } };
  }

  return state;
}

/**
 * Polls Paynow every 30 seconds for up to 15 minutes.
 * Upgrades the user's plan and sends a WhatsApp confirmation on success.
 */
function pollUpgradePayment(
  client: Client,
  whatsappId: string,
  userId: string,
  pollUrl: string,
  transactionId: string,
  plan: "STUDY" | "PASS",
  pn: Paynow,
): void {
  const MAX_ATTEMPTS = 30; // 30 × 30s = 15 min
  let attempts = 0;

  const timer = setInterval(async () => {
    attempts++;
    try {
      const status = await pn.pollTransaction(pollUrl);

      if (status.paid()) {
        clearInterval(timer);

        const startDate = new Date();
        const expiryDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1_000);

        await prisma.$transaction([
          prisma.paymentTransaction.update({
            where: { id: transactionId },
            data: { status: "paid", paidAt: new Date() },
          }),
          prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              plan,
              billingCycle: "MONTHLY",
              startDate,
              expiryDate,
              paynowRef: transactionId,
              paynowStatus: "paid",
            },
            update: {
              plan,
              billingCycle: "MONTHLY",
              status: "ACTIVE",
              startDate,
              expiryDate,
              paynowRef: transactionId,
              paynowStatus: "paid",
              renewalDue: false,
            },
          }),
          prisma.user.update({
            where: { id: userId },
            data: { plan },
          }),
        ]);

        const planName = plan === "STUDY" ? "Study" : "Pass";
        await client.sendMessage(
          whatsappId,
          `🎉 *Payment confirmed!* You're now on the *${planName}* plan.\n\nYour new limits are active immediately. Reply *usage* to see them, or just ask me anything.`,
        );
        sendNotification(userId, "payment_confirmed", {
          plan: planName,
          expiryDate: expiryDate.toISOString(),
        }).catch(() => undefined);
        return;
      }
    } catch (err) {
      console.error("[upgrade] poll error:", err);
    }

    if (attempts >= MAX_ATTEMPTS) {
      clearInterval(timer);
      await client.sendMessage(
        whatsappId,
        `⏳ I haven't received payment confirmation after 15 minutes. If you completed the payment, please wait a little longer — it sometimes takes time. You can also check your plan at https://pass.co.zw/pricing`,
      ).catch(() => undefined);
    }
  }, 30_000);
}
