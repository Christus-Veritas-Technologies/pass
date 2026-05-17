import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center gap-6">
      <Image src="/icon.png" alt="Pass" width={52} height={52} className="rounded-2xl" />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">404</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          This page doesn&apos;t exist or has been moved.
        </p>
      </div>

      <Link
        href="/dashboard"
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
