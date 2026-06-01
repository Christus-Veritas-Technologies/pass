"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

function isChunkError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    /Failed to load chunk|Loading chunk \d+ failed|Cannot find module/i.test(error.message)
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunkError = isChunkError(error);

  // Chunk errors mean the browser has cached references to old JS bundles that
  // no longer exist after a deployment. A hard reload fetches fresh HTML + chunks.
  useEffect(() => {
    if (chunkError) {
      window.location.reload();
    }
  }, [chunkError]);

  if (chunkError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center gap-4">
        <Image src="/icon.png" alt="Pass" width={52} height={52} className="rounded-2xl" />
        <p className="text-sm text-muted-foreground">Reloading page…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center gap-6">
      <Image src="/icon.png" alt="Pass" width={52} height={52} className="rounded-2xl" />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-destructive">Error</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Something went wrong</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          {error.message || "An unexpected error occurred. Try again or head back to your dashboard."}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-xl border border-border px-5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
