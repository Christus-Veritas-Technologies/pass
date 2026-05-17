"use client";

import { Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background px-4 lg:hidden">
      <button
        onClick={onMenuClick}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Open menu"
      >
        <HugeiconsIcon icon={Menu01Icon} className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <Image src="/icon.png" alt="Pass" width={28} height={28} className="rounded-md" />
        <span className="text-sm font-bold tracking-tight">Pass</span>
      </div>
    </header>
  );
}
