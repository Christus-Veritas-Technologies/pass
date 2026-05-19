"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { storeTokens } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const access = searchParams.get("access");
    const refresh = searchParams.get("refresh");

    if (access && refresh) {
      try {
        // Parse the JWT tokens (they're in the URL hash/query)
        storeTokens({
          accessToken: access,
          refreshToken: refresh,
        });

        // Redirect to dashboard
        router.push("/dashboard");
      } catch (error) {
        console.error("Auth callback error:", error);
        router.push("/login?error=callback_failed");
      }
    } else {
      // No tokens in callback
      router.push("/login?error=no_tokens");
    }
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="mb-4 inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
