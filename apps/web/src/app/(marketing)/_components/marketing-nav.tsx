"use client";

import { ArrowRight01Icon, Cancel01Icon, Menu01Icon, Moon01Icon, Sun01Icon, Computer01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@pass/ui/components/button";
import { cn } from "@/lib/utils";
import { isLoggedIn } from "@/lib/auth";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
] as const;

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();
  const { theme, setTheme } = useTheme();

  function cycleTheme() {
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  }

  const themeIcon = !mounted ? Sun01Icon : theme === "dark" ? Moon01Icon : theme === "light" ? Sun01Icon : Computer01Icon;
  const themeLabel = !mounted ? "Toggle theme" : theme === "dark" ? "Dark mode" : theme === "light" ? "Light mode" : "System theme";

  useEffect(() => {
    setMounted(true);
    setAuthed(isLoggedIn());

    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close drawer on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-200",
          scrolled
            ? "border-b border-border/70 bg-background/80 backdrop-blur-md"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6 md:h-[72px] md:px-10">
          <Link href="/" className="flex items-center gap-2.5 -m-2 p-2">
            <Image src="/icon.png" alt="" width={28} height={28} className="rounded-md" />
            <span className="text-base font-semibold tracking-tight">Pass</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href as never}
                className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={cycleTheme}
              aria-label={themeLabel}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <HugeiconsIcon icon={themeIcon} className="h-4 w-4" />
            </button>

            {/* Hydration-safe: render neutral until mounted */}
            {mounted && authed ? (
              <Link href="/dashboard">
                <Button size="sm" className="rounded-lg">
                  Dashboard
                  <HugeiconsIcon icon={ArrowRight01Icon} className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
                >
                  Log in
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="rounded-lg">
                    Start free
                    <HugeiconsIcon icon={ArrowRight01Icon} className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu trigger */}
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <HugeiconsIcon icon={Menu01Icon} className="h-5 w-5" />
          </button>
        </nav>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
            className="fixed inset-0 z-[60] md:hidden bg-background"
          >
            <div className="flex h-16 items-center justify-between px-6">
              <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
                <Image src="/icon.png" alt="" width={28} height={28} className="rounded-md" />
                <span className="text-base font-semibold tracking-tight">Pass</span>
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="h-5 w-5" />
              </button>
            </div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.3, delay: 0.05 }}
              className="px-6 pt-6"
            >
              <nav className="flex flex-col gap-1">
                {LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href as never}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-lg font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-6 flex items-center gap-3 px-3">
                <span className="text-sm text-muted-foreground">Theme</span>
                <div className="flex gap-1">
                  {(["light", "dark", "system"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTheme(t)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                        theme === t
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {authed ? (
                  <Link href="/dashboard" onClick={() => setOpen(false)}>
                    <Button className="w-full" size="lg">
                      Dashboard
                      <HugeiconsIcon icon={ArrowRight01Icon} className="ml-1.5 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/signup" onClick={() => setOpen(false)}>
                      <Button className="w-full" size="lg">
                        Start free
                        <HugeiconsIcon icon={ArrowRight01Icon} className="ml-1.5 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/login" onClick={() => setOpen(false)}>
                      <Button variant="outline" className="w-full" size="lg">
                        Log in
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
