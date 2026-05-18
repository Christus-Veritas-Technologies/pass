"use client";

import {
  BookOpen01Icon,
  Folder01Icon,
  GraduationScrollIcon,
  Home01Icon,
  Tag01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@pass/ui/components/separator";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home01Icon },
  { href: "/study", label: "Study", icon: GraduationScrollIcon },
  { href: "/resources", label: "Resources", icon: BookOpen01Icon },
  { href: "/projects", label: "Projects", icon: Folder01Icon },
  { href: "/pricing", label: "Pricing", icon: Tag01Icon },
  { href: "/profile", label: "Profile", icon: UserIcon },
] as const;

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();

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
    </div>
  );
}
