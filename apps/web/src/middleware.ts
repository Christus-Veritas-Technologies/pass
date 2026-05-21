import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that never require a session
const PUBLIC_PATHS = new Set([
  "/",
  "/pricing",
  "/about",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // OAuth callback pages and any /auth/* pages
  if (pathname.startsWith("/auth/")) return true;
  // Next.js API routes (server-side route handlers protect themselves)
  if (pathname.startsWith("/api/")) return true;
  // Next.js internals — should already be excluded by matcher but belt-and-suspenders
  if (pathname.startsWith("/_next/")) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  // pass_session is set by storeTokens() in lib/auth.ts alongside localStorage.
  // It acts as a lightweight gate so unauthenticated requests are redirected
  // before any JS hydrates — the AuthGuard component is the authoritative check.
  const session = request.cookies.get("pass_session");
  if (!session?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static assets
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)",
  ],
};
