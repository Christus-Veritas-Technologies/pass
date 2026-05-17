import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "../index.css";
import Providers from "@/components/providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pass — Study smarter. Pass faster.",
  description: "AI-powered ZIMSEC exam preparation for Zimbabwean students.",
  icons: { icon: "/icon.png", apple: "/icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
