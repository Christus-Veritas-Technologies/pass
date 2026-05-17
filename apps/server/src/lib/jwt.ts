import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "@pass/env/server";

export interface TokenPayload extends JWTPayload {
  sub: string;
  sessionId: string;
}

const accessSecret = new TextEncoder().encode(env.JWT_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export function signAccessToken(userId: string, sessionId: string): Promise<string> {
  return new SignJWT({ sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("15m")
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
