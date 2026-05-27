"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isLoggedIn } from "@/lib/auth";
import { initWebPush } from "@/lib/webPush";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    if (VAPID_KEY) {
      initWebPush(VAPID_KEY).catch(() => undefined);
    }
  }, [router]);

  if (!isLoggedIn()) return null;

  return <>{children}</>;
}
