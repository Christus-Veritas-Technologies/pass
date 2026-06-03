import { BankIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";

const COLUMNS: Array<{ heading: string; links: Array<{ label: string; href: string; external?: boolean }> }> = [
  {
    heading: "Product",
    links: [
      { label: "Past papers", href: "/#features" },
      { label: "AI tutor", href: "/#features" },
      { label: "Projects", href: "/#features" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Help centre", href: "/contact" },
      { label: "Contact", href: "/contact" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
  {
    heading: "Get the app",
    links: [
      { label: "Android (APK)", href: "https://expo.dev/artifacts/eas/oneZDFT7Tqw5UzNDiQdjkk.apk", external: true },
      { label: "iOS (coming)", href: "/about" },
      { label: "Web", href: "/login" },
    ],
  },
];

const PAYMENTS = [
  { src: "/payment-methods/ecocash.png", label: "EcoCash" },
  { src: "/payment-methods/onemoney.png", label: "OneMoney" },
  { src: "/payment-methods/omari.png", label: "Omari" },
  { src: "/payment-methods/innbucks.png", label: "InnBucks" },
];

export function MarketingFooter() {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-6 pt-20 pb-10 md:px-10">
        {/* Sitemap columns */}
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image src="/icon.png" alt="" width={28} height={28} className="rounded-md" />
              <span className="text-base font-semibold tracking-tight">Pass</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-background/70 leading-relaxed">
              ZIMSEC past papers and an AI tutor that grades, explains, and writes projects.
              Built in Zimbabwe.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-background/50">
                {col.heading}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) =>
                  link.external ? (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-background/80 transition-colors hover:text-background"
                      >
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.label}>
                      <Link
                        href={link.href as never}
                        className="text-sm text-background/80 transition-colors hover:text-background"
                      >
                        {link.label}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* Payments strip */}
        <div className="mt-16 border-y border-background/10 py-8">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-background/60">
            We accept
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-5">
            <div className="flex h-9 items-center gap-2 rounded-lg bg-background/5 px-3 text-xs text-background/70">
              <HugeiconsIcon icon={BankIcon} className="h-4 w-4" />
              Bank Transfer
            </div>
            {PAYMENTS.map(({ src, label }) => (
              <div
                key={label}
                className="flex h-9 items-center gap-2 rounded-lg bg-white px-3 transition-opacity"
                title={label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={label} className="h-6 w-auto object-contain" />
                <span className="text-xs font-medium text-zinc-700">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 text-sm text-background/60 sm:flex-row">
          <p>Pass &copy; {new Date().getFullYear()} &middot; Made in Zimbabwe.</p>
          <div className="flex items-center gap-5">
            <a href="#" className="transition-colors hover:text-background">X</a>
            <a href="#" className="transition-colors hover:text-background">Instagram</a>
            <a href="#" className="transition-colors hover:text-background">Facebook</a>
            <a href="#" className="transition-colors hover:text-background">YouTube</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
