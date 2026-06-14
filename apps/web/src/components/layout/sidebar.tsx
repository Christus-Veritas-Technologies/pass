"use client";

import {
  AiChat01Icon,
  BookOpen01Icon,
  ComputerIcon,
  Download02Icon,
  Folder01Icon,
  GraduationScrollIcon,
  Home01Icon,
  Moon01Icon,
  Sun01Icon,
  Tag01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Separator } from "@pass/ui/components/separator";
import { cn } from "@/lib/utils";
import { getAccessToken } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home01Icon },
  { href: "/chat", label: "Pass AI", icon: AiChat01Icon },
  { href: "/study", label: "Study", icon: GraduationScrollIcon },
  { href: "/resources", label: "Resources", icon: BookOpen01Icon },
  { href: "/projects", label: "Projects", icon: Folder01Icon },
  { href: "/pricing", label: "Pricing", icon: Tag01Icon },
  { href: "/profile", label: "Profile", icon: UserIcon },
] as const;

interface SidebarProps {
  onClose?: () => void;
}

const THEME_OPTIONS = [
  { value: "light", icon: Sun01Icon, label: "Light" },
  { value: "dark", icon: Moon01Icon, label: "Dark" },
  { value: "system", icon: ComputerIcon, label: "System" },
] as const;

function useIsAmbassador() {
  const [isAmbassador, setIsAmbassador] = useState(false);
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d?.user?.isAmbassador) setIsAmbassador(true); })
      .catch(() => {});
  }, []);
  return isAmbassador;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const isAmbassador = useIsAmbassador();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Image src="/icon.png" alt="Pass" width={32} height={32} className="rounded-lg" />
        <span className="text-base font-bold tracking-tight">Pass</span>
      </div>

      <Separator />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <HugeiconsIcon icon={icon} className="h-[18px] w-[18px] shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Ambassador badge */}
      {isAmbassador && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/20">
          <span className="text-base leading-none">🌟</span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Ambassador</p>
            <p className="text-[9px] text-amber-600/80 dark:text-amber-500/80">1 000 of everything</p>
          </div>
        </div>
      )}

      {/* Download app */}
      <div className="px-3 pb-2">
        <a
          href="https://expo.dev/artifacts/eas/gSiNyUF3gUaecEi589943u.apk"
          download
          className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <HugeiconsIcon icon={Download02Icon} className="h-[18px] w-[18px] shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold leading-tight">Download Android app</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Get the APK</p>
          </div>
        </a>
      </div>

      {/* Theme toggle */}
      <div className="px-3 pb-4 pt-2">
        <Separator className="mb-3" />
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Theme
        </p>
        <div className="flex gap-1">
          {THEME_OPTIONS.map(({ value, icon, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-label={`${label} theme`}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-medium transition-colors",
                theme === value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <HugeiconsIcon icon={icon} className="h-3.5 w-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
