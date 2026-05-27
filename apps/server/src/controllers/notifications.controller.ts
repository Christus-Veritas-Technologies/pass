import type { Context } from "hono";
import { z } from "zod";
import prisma from "@pass/db";

// ─── Web Push ────────────────────────────────────────────────────────────────

const webPushSubSchema = z.object({
  endpoint: z.string().url(),
  p256dh:   z.string().min(1),
  auth:     z.string().min(1),
});

export async function subscribeWebPush(c: Context): Promise<Response> {
  const userId = c.get("userId") as string;
  const body = await c.req.json().catch(() => null);
  const parsed = webPushSubSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  await prisma.webPushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    create: { userId, ...parsed.data },
    update: { userId, p256dh: parsed.data.p256dh, auth: parsed.data.auth },
  });

  return c.json({ success: true }, 201);
}

export async function unsubscribeWebPush(c: Context): Promise<Response> {
  const userId = c.get("userId") as string;
  const body = await c.req.json().catch(() => null);
  const endpoint = body?.endpoint as string | undefined;
  if (!endpoint) return c.json({ error: "endpoint required" }, 400);

  await prisma.webPushSubscription.deleteMany({ where: { userId, endpoint } });
  return c.json({ success: true });
}

// ─── Native Push ─────────────────────────────────────────────────────────────

const nativePushSchema = z.object({
  token:    z.string().min(1),
  platform: z.enum(["ios", "android"]),
});

export async function registerNativePush(c: Context): Promise<Response> {
  const userId = c.get("userId") as string;
  const body = await c.req.json().catch(() => null);
  const parsed = nativePushSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  await prisma.devicePushToken.upsert({
    where: { token: parsed.data.token },
    create: { userId, ...parsed.data },
    update: { userId },
  });

  return c.json({ success: true }, 201);
}

export async function unregisterNativePush(c: Context): Promise<Response> {
  const userId = c.get("userId") as string;
  const body = await c.req.json().catch(() => null);
  const token = body?.token as string | undefined;
  if (!token) return c.json({ error: "token required" }, 400);

  await prisma.devicePushToken.deleteMany({ where: { userId, token } });
  return c.json({ success: true });
}

// ─── Notification Settings ────────────────────────────────────────────────────

const settingsSchema = z.object({
  emailEnabled:      z.boolean().optional(),
  webPushEnabled:    z.boolean().optional(),
  nativePushEnabled: z.boolean().optional(),
  referralAlerts:    z.boolean().optional(),
  loginAlerts:       z.boolean().optional(),
  paymentAlerts:     z.boolean().optional(),
  renewalAlerts:     z.boolean().optional(),
});

export async function getNotificationSettings(c: Context): Promise<Response> {
  const userId = c.get("userId") as string;
  const settings = await prisma.notificationSettings.findUnique({ where: { userId } });
  return c.json({
    settings: settings ?? {
      emailEnabled: true, webPushEnabled: true, nativePushEnabled: true,
      referralAlerts: true, loginAlerts: true, paymentAlerts: true, renewalAlerts: true,
    },
  });
}

export async function updateNotificationSettings(c: Context): Promise<Response> {
  const userId = c.get("userId") as string;
  const body = await c.req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const settings = await prisma.notificationSettings.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: parsed.data,
  });

  return c.json({ settings });
}
