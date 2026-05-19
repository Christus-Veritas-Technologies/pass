"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { storeTokens } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // The server redirects to /auth/callback#access=<token>&refresh=<token>
    // Hash fragments are not sent to the server — read them client-side via
    // window.location.hash.
    const hash = window.location.hash.slice(1); // strip leading "#"
    const params = new URLSearchParams(hash);

    const access = params.get("access");
    const refresh = params.get("refresh");

    if (access && refresh) {
      try {
        // URLSearchParams.get() already URL-decodes values — no need to
        // call decodeURIComponent again even though the server used encodeURIComponent.
        storeTokens({
          accessToken: access,
          refreshToken: refresh,
        });
        router.push("/dashboard");
      } catch (error) {
        console.error("Auth callback error:", error);
        router.push("/login?error=callback_failed");
      }
    } else {
      // Also try query params as a fallback (in case redirect format changes)
      const qp = new URLSearchParams(window.location.search);
      const qAccess = qp.get("access");
      const qRefresh = qp.get("refresh");

      if (qAccess && qRefresh) {
        try {
          storeTokens({ accessToken: qAccess, refreshToken: qRefresh });
          router.push("/dashboard");
        } catch {
          router.push("/login?error=callback_failed");
        }
      } else {
        router.push("/login?error=no_tokens");
      }
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="mb-4 inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
