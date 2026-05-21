import { Inter, Instrument_Serif } from "next/font/google";
import type { ReactNode } from "react";
import { MarketingNav } from "./_components/marketing-nav";
import { MarketingFooter } from "./_components/marketing-footer";
import { PLANS } from "@pass/pricing";

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      name: "Pass",
      url: "https://pass.co.zw",
      logo: "https://pass.co.zw/icon.png",
      description:
        "AI-powered ZIMSEC exam preparation for Zimbabwean students.",
      address: { "@type": "PostalAddress", addressCountry: "ZW" },
      sameAs: [
        "https://twitter.com/passcozw",
        "https://www.facebook.com/passcozw",
        "https://www.instagram.com/passcozw",
      ],
    },
    {
      "@type": "SoftwareApplication",
      name: "Pass",
      operatingSystem: "Web, Android",
      applicationCategory: "EducationalApplication",
      offers: [
        { "@type": "Offer", name: PLANS.FREE.name,  price: String(PLANS.FREE.prices.MONTHLY),  priceCurrency: "USD" },
        { "@type": "Offer", name: PLANS.STUDY.name, price: String(PLANS.STUDY.prices.MONTHLY), priceCurrency: "USD" },
        { "@type": "Offer", name: PLANS.PASS.name,  price: String(PLANS.PASS.prices.MONTHLY),  priceCurrency: "USD" },
      ],
    },
  ],
};

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
      className={`light ${inter.variable} ${serif.variable} font-marketing-sans min-h-screen bg-background text-foreground antialiased`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-background focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>
      <MarketingNav />
      <main id="main">{children}</main>
      <MarketingFooter />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
    </div>
  );
}
