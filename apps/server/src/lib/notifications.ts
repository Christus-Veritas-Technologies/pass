/**
 * Unified notification fan-out.
 * Sends to all configured channels (email, web push, native push)
 * respecting per-user NotificationSettings.
 */

import prisma from "@pass/db";
import { isWebPushConfigured, webpush } from "./webPush";

export type NotificationEvent =
  | "referral_reward"
  | "new_device_signin"
  | "payment_confirmed"
  | "subscription_expiring"
  | "subscription_expired";

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
}

function buildPayload(event: NotificationEvent, data: Record<string, unknown>): NotificationPayload {
  switch (event) {
    case "referral_reward":
      return {
        title: "Referral reward! 🎉",
        body: `${data.refereeName ?? "Someone"} signed up with your referral code. You've earned +2 papers and +1 project credit.`,
        url: "/profile",
      };
    case "new_device_signin":
      return {
        title: "New sign-in detected",
        body: `Your Pass account was just signed into via ${data.device ?? "a new device"}.`,
        url: "/profile",
      };
    case "payment_confirmed":
      return {
        title: "Payment confirmed ✅",
        body: `Your ${data.plan} plan is now active.`,
        url: "/profile",
      };
    case "subscription_expiring":
      return {
        title: "Subscription expiring soon",
        body: `Your ${data.plan} plan expires in ${data.daysLeft} days. Renew to keep access.`,
        url: "/pricing",
      };
    case "subscription_expired":
      return {
        title: "Subscription expired",
        body: `Your ${data.plan} plan has expired. You've been moved to the free plan.`,
        url: "/pricing",
      };
  }
}

function isEmailEvent(event: NotificationEvent, settings: { paymentAlerts: boolean; renewalAlerts: boolean; loginAlerts: boolean; referralAlerts: boolean }): boolean {
  if (event === "payment_confirmed") return settings.paymentAlerts;
  if (event === "subscription_expiring" || event === "subscription_expired") return settings.renewalAlerts;
  if (event === "new_device_signin") return settings.loginAlerts;
  if (event === "referral_reward") return settings.referralAlerts;
  return true;
}

function isPushEvent(event: NotificationEvent, settings: { paymentAlerts: boolean; renewalAlerts: boolean; loginAlerts: boolean; referralAlerts: boolean }): boolean {
  return isEmailEvent(event, settings);
}

async function sendWebPush(userId: string, payload: NotificationPayload): Promise<void> {
  if (!isWebPushConfigured()) return;

  const subs = await prisma.webPushSubscription.findMany({ where: { userId } });
  const staleIds: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          staleIds.push(sub.id);
        }
      }
    }),
  );

  if (staleIds.length) {
    await prisma.webPushSubscription.deleteMany({ where: { id: { in: staleIds } } });
  }
}

async function sendNativePush(userId: string, payload: NotificationPayload): Promise<void> {
  const tokens = await prisma.devicePushToken.findMany({ where: { userId } });
  if (!tokens.length) return;

  const staleIds: string[] = [];

  const messages = tokens.map((t) => ({
    to: t.token,
    title: payload.title,
    body: payload.body,
    data: { url: payload.url },
  }));

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    if (res.ok) {
      const result = await res.json() as { data: Array<{ status: string; message?: string }> };
      result.data?.forEach((item, i) => {
        if (item.status === "error" && item.message?.includes("InvalidToken")) {
          const token = tokens[i];
          if (token) staleIds.push(token.id);
        }
      });
    }
  } catch {
    // Non-fatal
  }

  if (staleIds.length) {
    await prisma.devicePushToken.deleteMany({ where: { id: { in: staleIds } } });
  }
}

export async function sendNotification(
  userId: string,
  event: NotificationEvent,
  data: Record<string, unknown> = {},
): Promise<void> {
  const [user, rawSettings] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    prisma.notificationSettings.findUnique({ where: { userId } }),
  ]);

  if (!user) return;

  const settings = rawSettings ?? {
    emailEnabled: true,
    webPushEnabled: true,
    nativePushEnabled: true,
    referralAlerts: true,
    loginAlerts: true,
    paymentAlerts: true,
    renewalAlerts: true,
  };

  const payload = buildPayload(event, data);
  const eventAllowed = isPushEvent(event, settings);

  const tasks: Promise<void>[] = [];

  if (settings.emailEnabled && eventAllowed) {
    tasks.push(sendEmailNotification(user.email, event, data).catch(() => undefined));
  }
  if (settings.webPushEnabled && eventAllowed) {
    tasks.push(sendWebPush(userId, payload).catch(() => undefined));
  }
  if (settings.nativePushEnabled && eventAllowed) {
    tasks.push(sendNativePush(userId, payload).catch(() => undefined));
  }

  await Promise.allSettled(tasks);
}

async function sendEmailNotification(
  email: string,
  event: NotificationEvent,
  data: Record<string, unknown>,
): Promise<void> {
  // Import email helpers lazily to avoid circular deps
  const { sendEmail } = await import("./emails");
  switch (event) {
    case "payment_confirmed":
      await sendEmail(email, "Your Pass plan is now active!", {
        template: "payment_confirmed",
        plan: data.plan as string | undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate as string) : undefined,
      });
      break;
    case "subscription_expiring":
      await sendEmail(email, "Your Pass subscription is expiring soon", {
        template: "renewal_reminder",
        plan: data.plan as string | undefined,
        daysLeft: data.daysLeft as number | undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate as string) : undefined,
      });
      break;
    case "subscription_expired":
      await sendEmail(email, "Your Pass subscription has expired", {
        template: "subscription_expired",
        plan: data.plan as string | undefined,
      });
      break;
    case "referral_reward":
      await sendEmail(email, "You earned referral bonus credits! 🎉", {
        template: "referral_reward",
        refereeName: data.refereeName,
      });
      break;
    case "new_device_signin":
      await sendEmail(email, "New sign-in to your Pass account", {
        template: "new_device_signin",
        device: data.device,
      });
      break;
  }
}
