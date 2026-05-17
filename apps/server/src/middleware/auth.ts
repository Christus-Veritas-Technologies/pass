import type { Context, Next } from "hono";
import { verifyAccessToken } from "../lib/jwt";

export async function requireAuth(c: Context, next: Next) {
  const authorization = c.req.header("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const token = authorization.slice(7);
  try {
    const payload = await verifyAccessToken(token);
    c.set("userId", payload.sub);
    c.set("sessionId", payload.sessionId);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}
