import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "@pass/env/server";

export interface TokenPayload extends JWTPayload {
  sub: string;
  sessionId: string;
}

const accessSecret = new TextEncoder().encode(env.JWT_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

// Access tokens are stateless (not checked against the session on each request),
// so a leaked token is usable until it expires. Keep the window short — both
// clients transparently refresh on 401. Refresh tokens are DB-backed and bounded
// by the session's expiresAt (7 days), so revocation (logout) takes effect within
// the access-token lifetime.
export function signAccessToken(userId: string, sessionId: string): Promise<string> {
  return new SignJWT({ sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(accessSecret);
}

export function signRefreshToken(userId: string, sessionId: string): Promise<string> {
  return new SignJWT({ sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify<{ sessionId: string }>(token, accessSecret);
  return payload as TokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify<{ sessionId: string }>(token, refreshSecret);
  return payload as TokenPayload;
}
