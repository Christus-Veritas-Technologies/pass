import type { Metadata } from "next";
import { PLANS } from "@pass/pricing";

const startingPrice = PLANS.STUDY.prices.MONTHLY;

export const metadata: Metadata = {
  title: "Pricing — Pass",
  description:
    `Free forever for 5 papers a month. Or unlock the full ZIMSEC past paper library from $${startingPrice}/month. Pay with EcoCash, OneMoney, or bank transfer.`,
  alternates: { canonical: "https://pass.co.zw/pricing" },
  openGraph: {
    type: "website",
    url: "https://pass.co.zw/pricing",
    siteName: "Pass",
    title: "Pricing — Pass",
    description:
      `Free forever for 5 papers a month. Or unlock the full ZIMSEC past paper library from $${startingPrice}/month.`,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Pass pricing" }],
    locale: "en_ZW",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
