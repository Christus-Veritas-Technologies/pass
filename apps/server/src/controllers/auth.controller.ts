import { randomBytes } from "crypto";
import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { z } from "zod";
import prisma from "@pass/db";
import { env } from "@pass/env/server";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { hashPassword, verifyPassword } from "../lib/password";
import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  fetchGoogleUser,
  isGoogleConfigured,
  verifyGoogleIdToken,
} from "../lib/google";
import { isEmailConfigured, sendPasswordResetEmail } from "../lib/email";
import { generateReferralCode, validateReferralCode, applyReferralReward } from "../lib/referrals";
import { sendNotification } from "../lib/notifications";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1),
  referralCode: z.string().max(12).optional(),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

const googleNativeSchema = z.object({
  idToken: z.string().min(1),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  // Create a placeholder session first to get the ID, then sign tokens with it.
  const session = await prisma.session.create({ data: { userId, refreshToken: "", expiresAt } });
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(userId, session.id),
    signRefreshToken(userId, session.id),
  ]);
  await prisma.session.update({ where: { id: session.id }, data: { refreshToken } });
  return { accessToken, refreshToken, session };
}

function safeUser(user: { id: string; email: string; name: string; plan: string; grade: string | null }) {
  return { id: user.id, email: user.email, name: user.name, plan: user.plan, grade: user.grade };
}

// ─── Email / password ────────────────────────────────────────────────────────

export async function signup(c: Context) {
  const body = await c.req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { email, password, name, referralCode } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return c.json({ error: "Email already registered" }, 409);

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, name, passwordHash } });

  // Auto-generate referral code and apply any incoming referral (non-fatal)
  generateReferralCode(user.id).catch(() => undefined);
  if (referralCode) {
    validateReferralCode(referralCode.toUpperCase()).then((ref) => {
      if (ref && ref.userId !== user.id) {
        applyReferralReward(ref.userId, user.id).catch(() => undefined);
      }
    }).catch(() => undefined);
  }

  const { accessToken, refreshToken } = await createSession(user.id);
  return c.json({ user: safeUser(user), accessToken, refreshToken }, 201);
}

export async function login(c: Context) {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return c.json({ error: "Invalid credentials" }, 401);

  const { accessToken, refreshToken } = await createSession(user.id);

  const ua = c.req.header("user-agent") ?? "";
  const device = /mobile|android|iphone/i.test(ua) ? "mobile app" : "web browser";
  sendNotification(user.id, "new_device_signin", { device }).catch(() => undefined);

  return c.json({ user: safeUser(user), accessToken, refreshToken });
}

export async function logout(c: Context) {
  const sessionId = c.get("sessionId") as string;
  await prisma.session.deleteMany({ where: { id: sessionId } });
  return c.json({ success: true });
}

export async function refresh(c: Context) {
  const body = await c.req.json().catch(() => null);
  const refreshToken = body?.refreshToken as string | undefined;
  if (!refreshToken) return c.json({ error: "Refresh token required" }, 400);

  let payload: Awaited<ReturnType<typeof verifyRefreshToken>>;
  try {
    payload = await verifyRefreshToken(refreshToken);
  } catch {
    return c.json({ error: "Invalid or expired refresh token" }, 401);
  }

  // Look up and validate session
  const session = await prisma.session.findUnique({ where: { id: payload.sessionId } });
  if (!session || session.userId !== payload.sub || session.refreshToken !== refreshToken) {
    return c.json({ error: "Session not found or revoked" }, 401);
  }
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return c.json({ error: "Session expired" }, 401);
  }

  // Rotate: delete old session, issue new pair
  await prisma.session.delete({ where: { id: session.id } });
  const { accessToken, refreshToken: newRefreshToken } = await createSession(session.userId);
  return c.json({ accessToken, refreshToken: newRefreshToken });
}

// ─── Google OAuth — web (redirect flow) ─────────────────────────────────────

export async function googleInit(c: Context) {
  if (!isGoogleConfigured()) return c.json({ error: "Google OAuth not configured" }, 503);

  // returnTo lets native apps (pass://) or custom web pages receive tokens after OAuth
  const { returnTo } = c.req.query() as { returnTo?: string };

  const statePayload = randomBytes(16).toString("hex");
  const stateData = returnTo ? `${statePayload}:${returnTo}` : statePayload;
  const encodedState = Buffer.from(stateData).toString("base64url");

  setCookie(c, "oauth_state", statePayload, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 600,
    path: "/",
  });

  return c.redirect(buildGoogleAuthUrl(encodedState));
}

export async function googleCallback(c: Context) {
  if (!isGoogleConfigured()) return c.json({ error: "Google OAuth not configured" }, 503);

  const { code, state, error } = c.req.query() as {
    code?: string;
    state?: string;
    error?: string;
  };

  if (error) return c.redirect(`${env.APP_URL}/login?error=google_denied`);

  const storedState = getCookie(c, "oauth_state");
  deleteCookie(c, "oauth_state");

  if (!code || !state) {
    return c.redirect(`${env.APP_URL}/login?error=invalid_state`);
  }

  // Decode state and extract optional returnTo
  let stateToken: string;
  let returnTo: string | undefined;
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const colonIdx = decoded.indexOf(":");
    if (colonIdx === -1) {
      stateToken = decoded;
    } else {
      stateToken = decoded.slice(0, colonIdx);
      returnTo = decoded.slice(colonIdx + 1);
    }
  } catch {
    return c.redirect(`${env.APP_URL}/login?error=invalid_state`);
  }

  if (stateToken !== storedState) {
    return c.redirect(`${env.APP_URL}/login?error=invalid_state`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const googleUser = await fetchGoogleUser(tokens.access_token);
    const { user, isNew } = await findOrCreateGoogleUser(googleUser);
    const { accessToken, refreshToken } = await createSession(user.id);

    // Native app redirect: pass://auth/callback?accessToken=...&refreshToken=...
    if (returnTo?.startsWith("pass://")) {
      const url = new URL(returnTo);
      url.searchParams.set("accessToken", accessToken);
      url.searchParams.set("refreshToken", refreshToken);
      url.searchParams.set("isNew", isNew ? "1" : "0");
      return c.redirect(url.toString());
    }

    // Web app: tokens in URL fragment (stays out of server logs and referrer headers)
    return c.redirect(
      `${env.APP_URL}/auth/callback#access=${accessToken}&refresh=${encodeURIComponent(refreshToken)}`,
    );
  } catch (err) {
    console.error("Google callback error:", err);
    if (returnTo?.startsWith("pass://")) {
      return c.redirect(`${returnTo}?error=google_failed`);
    }
    return c.redirect(`${env.APP_URL}/login?error=google_failed`);
  }
}

// ─── Google OAuth — native (ID token from expo-auth-session) ─────────────────

export async function googleNative(c: Context) {
  if (!isGoogleConfigured()) return c.json({ error: "Google OAuth not configured" }, 503);

  const body = await c.req.json().catch(() => null);
  const parsed = googleNativeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  try {
    const googleUser = await verifyGoogleIdToken(parsed.data.idToken);
    const { user, isNew } = await findOrCreateGoogleUser(googleUser);
    const { accessToken, refreshToken } = await createSession(user.id);
    return c.json({ user: safeUser(user), accessToken, refreshToken, isNew }, isNew ? 201 : 200);
  } catch (err) {
    console.error("Google native auth error:", err);
    return c.json({ error: "Google authentication failed" }, 401);
  }
}

async function findOrCreateGoogleUser(googleUser: { id: string; email: string; name: string }) {
  // 1. Match by googleId
  let user = await prisma.user.findUnique({ where: { googleId: googleUser.id } });
  if (user) return { user, isNew: false };

  // 2. Match by email — link the Google ID to an existing account
  user = await prisma.user.findUnique({ where: { email: googleUser.email } });
  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: googleUser.id },
    });
    return { user, isNew: false };
  }

  // 3. Create new account
  user = await prisma.user.create({
    data: { email: googleUser.email, name: googleUser.name, googleId: googleUser.id },
  });
  generateReferralCode(user.id).catch(() => undefined);
  return { user, isNew: true };
}

// ─── Forgot / reset password ─────────────────────────────────────────────────

export async function forgotPassword(c: Context) {
  const body = await c.req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Always return success — never reveal whether the email exists
  if (!user) return c.json({ success: true });

  // Invalidate any existing tokens for this user
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } });

  if (isEmailConfigured()) {
    await sendPasswordResetEmail(user.email, token);
  } else {
    const resetUrl = `${env.APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
    console.log(`[pass] Password reset link for ${user.email}: ${resetUrl}`);
  }

  return c.json({ success: true });
}

export async function resetPassword(c: Context) {
  const body = await c.req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { token, password } = parsed.data;

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record || record.used || record.expiresAt < new Date()) {
    return c.json({ error: "Invalid or expired reset token" }, 400);
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
    // Revoke all active sessions — force re-login with new password
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  return c.json({ success: true });
}
