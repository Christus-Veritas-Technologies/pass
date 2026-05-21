import { Inter, Instrument_Serif } from "next/font/google";
import type { ReactNode } from "react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-marketing-sans",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-marketing-serif",
  display: "swap",
});

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${inter.variable} ${serif.variable} font-marketing-sans min-h-screen bg-background text-foreground antialiased`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-background focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>
      <main id="main">{children}</main>
    </div>
  );
}
