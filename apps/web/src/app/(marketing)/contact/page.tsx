import type { Metadata } from "next";
import {
  Mail01Icon,
  MessageDone01Icon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SectionEyebrow } from "../_components/section-eyebrow";
import { SectionHeading, SectionLede } from "../_components/section-heading";
import { ScrollReveal } from "../_components/scroll-reveal";

export const metadata: Metadata = {
  title: "Contact — Pass",
  description:
    "Get in touch with the Pass team. We're based in Zimbabwe and reply within one business day.",
  alternates: { canonical: "https://pass.co.zw/contact" },
  openGraph: {
    type: "website",
    url: "https://pass.co.zw/contact",
    siteName: "Pass",
    title: "Contact — Pass",
    description: "Get in touch with the Pass team.",
    locale: "en_ZW",
  },
};

const FAQS = [
  {
    q: "How do I cancel my subscription?",
    a: "Email us at hello@pass.co.zw with your account email and we'll cancel it before your next renewal. We aim to respond within one business day.",
  },
  {
    q: "I paid but my plan hasn't upgraded.",
    a: "Paynow payments sometimes take a few minutes to confirm. If it's been longer than 10 minutes, email us with your Paynow transaction reference and we'll resolve it manually.",
  },
  {
    q: "A past paper has an error or is missing questions.",
    a: "Let us know via email or WhatsApp with the paper name and year. We review and re-ingest papers regularly.",
  },
  {
    q: "Can I get a refund?",
    a: "Digital subscriptions are non-refundable once a billing period has started. If something went wrong on our end (double charge, payment not matching plan), contact us and we'll make it right.",
  },
  {
    q: "I forgot my password and can't access the email I registered with.",
    a: "Email us from any address with your account name or any details that help us verify it's you. We'll assist with account recovery.",
  },
  {
    q: "Is Pass available offline?",
    a: "The mobile app caches recently-viewed papers for offline reading. AI features require an internet connection.",
  },
];

export default function ContactPage() {
  return (
    <article className="bg-background">
      <section className="px-6 pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="mx-auto max-w-3xl">
          <ScrollReveal>
            <SectionEyebrow>Get in touch</SectionEyebrow>
            <SectionHeading as="h1" className="mt-4 text-4xl md:text-5xl">
              Contact us
            </SectionHeading>
            <SectionLede className="mt-5 max-w-2xl">
              We&apos;re a small team based in Harare. We read every message and respond within one
              business day.
            </SectionLede>
          </ScrollReveal>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-6 pb-24">
        {/* Contact channels */}
        <ScrollReveal>
          <div className="grid gap-4 sm:grid-cols-2">
            <a
              href="mailto:hello@pass.co.zw"
              className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/5">
                <HugeiconsIcon icon={Mail01Icon} className="h-5 w-5 text-foreground" />
              </span>
              <div>
                <p className="font-semibold text-foreground">Email</p>
                <p className="mt-1 text-sm text-muted-foreground">hello@pass.co.zw</p>
                <p className="mt-1 text-xs text-muted-foreground">Replies within one business day</p>
              </div>
            </a>

            <a
              href="https://wa.me/263775101506"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/5">
                <HugeiconsIcon icon={WhatsappIcon} className="h-5 w-5 text-foreground" />
              </span>
              <div>
                <p className="font-semibold text-foreground">WhatsApp</p>
                <p className="mt-1 text-sm text-muted-foreground">+263 77 510 1506</p>
                <p className="mt-1 text-xs text-muted-foreground">Study on WhatsApp or get support</p>
              </div>
            </a>
          </div>
        </ScrollReveal>

        {/* Contact form */}
        <ScrollReveal className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Send us a message
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Fill in the form below and we&apos;ll reply to your email.
          </p>
          <form
            action={`mailto:hello@pass.co.zw`}
            method="get"
            className="mt-6 space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-foreground"
                >
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Tinashe Moyo"
                  className="mt-1.5 block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="tinashe@example.com"
                  className="mt-1.5 block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium text-foreground"
              >
                Subject
              </label>
              <input
                id="subject"
                name="subject"
                type="text"
                required
                placeholder="e.g. Payment issue, Missing paper, General question"
                className="mt-1.5 block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-foreground"
              >
                Message
              </label>
              <textarea
                id="message"
                name="body"
                rows={5}
                required
                placeholder="Describe your question or issue in as much detail as you can."
                className="mt-1.5 block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-foreground px-6 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-80"
            >
              <HugeiconsIcon icon={MessageDone01Icon} className="h-4 w-4" />
              Send message
            </button>
          </form>
        </ScrollReveal>

        {/* FAQ */}
        <ScrollReveal className="mt-20">
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Common questions
          </h2>
          <div className="mt-6 divide-y divide-border">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="py-5">
                <p className="font-medium text-foreground">{q}</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/70">{a}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </article>
  );
}
