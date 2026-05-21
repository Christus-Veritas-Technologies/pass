import type { Metadata } from "next";
import { SectionEyebrow } from "../_components/section-eyebrow";
import { SectionHeading, SectionLede } from "../_components/section-heading";
import { ScrollReveal } from "../_components/scroll-reveal";

export const metadata: Metadata = {
  title: "Privacy Policy — Pass",
  description:
    "How Pass collects, uses, and protects your personal data. We are committed to keeping your information safe.",
  alternates: { canonical: "https://pass.co.zw/privacy" },
  openGraph: {
    type: "website",
    url: "https://pass.co.zw/privacy",
    siteName: "Pass",
    title: "Privacy Policy — Pass",
    description: "How Pass collects, uses, and protects your personal data.",
    locale: "en_ZW",
  },
};

const LAST_UPDATED = "21 May 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ScrollReveal as="section" className="mt-14">
      <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{title}</h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed text-foreground/75">{children}</div>
    </ScrollReveal>
  );
}

export default function PrivacyPage() {
  return (
    <article className="bg-background">
      <section className="px-6 pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="mx-auto max-w-3xl">
          <ScrollReveal>
            <SectionEyebrow>Legal</SectionEyebrow>
            <SectionHeading as="h1" className="mt-4 text-4xl md:text-5xl">
              Privacy Policy
            </SectionHeading>
            <SectionLede className="mt-5 max-w-2xl">
              We take your privacy seriously. This policy explains what data we collect, why we
              collect it, and how we keep it safe.
            </SectionLede>
            <p className="mt-4 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          </ScrollReveal>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-6 pb-24">
        <Section title="1. Who we are">
          <p>
            Pass (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is an educational technology
            platform operated from Zimbabwe. We provide ZIMSEC past-paper study tools and AI-assisted
            tutoring through our website at pass.co.zw and our mobile application.
          </p>
          <p>
            For privacy matters, contact us at{" "}
            <a
              href="mailto:hello@pass.co.zw"
              className="font-medium text-foreground underline underline-offset-4 hover:opacity-70"
            >
              hello@pass.co.zw
            </a>
            .
          </p>
        </Section>

        <Section title="2. Data we collect">
          <p>We collect only what we need to provide the service:</p>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <strong className="text-foreground">Account information</strong> — your name, email
              address, and password hash when you register. If you sign in with Google, we receive
              your name and email from Google.
            </li>
            <li>
              <strong className="text-foreground">Study activity</strong> — which papers you open,
              answers you submit, AI explanations you request, and session durations. This powers
              personalised feedback and progress tracking.
            </li>
            <li>
              <strong className="text-foreground">Payment information</strong> — when you subscribe,
              we receive a transaction reference and status from Paynow. We do not store your card
              or mobile money PIN details.
            </li>
            <li>
              <strong className="text-foreground">WhatsApp identifier</strong> — if you link your
              WhatsApp account, we store your WhatsApp chat ID to route messages to your account.
            </li>
            <li>
              <strong className="text-foreground">Device and usage data</strong> — browser type,
              operating system, approximate location (country), and pages visited. Collected via
              server logs and, where applicable, analytics tools.
            </li>
          </ul>
        </Section>

        <Section title="3. How we use your data">
          <ul className="ml-5 list-disc space-y-2">
            <li>To create and manage your account and authenticate you securely.</li>
            <li>To deliver the study features you request — past papers, AI grading, and projects.</li>
            <li>To process subscription payments through Paynow.</li>
            <li>To send transactional emails (password resets, payment confirmations).</li>
            <li>To improve the product — we analyse aggregate, anonymised usage patterns.</li>
            <li>
              To enforce our Terms of Service and protect against fraud or misuse.
            </li>
          </ul>
          <p>We do not sell your personal data to third parties.</p>
        </Section>

        <Section title="4. Third parties we share data with">
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <strong className="text-foreground">Anthropic</strong> — your study questions and AI
              chat messages are sent to Anthropic&apos;s API to generate responses. Anthropic processes
              this data under their own privacy policy and does not train on API inputs by default.
            </li>
            <li>
              <strong className="text-foreground">Paynow Zimbabwe</strong> — payment transaction data
              is shared with Paynow to process EcoCash, OneMoney, and card payments.
            </li>
            <li>
              <strong className="text-foreground">Cloudflare</strong> — we use Cloudflare for CDN,
              DNS, and R2 object storage (uploaded files). Cloudflare may process request metadata.
            </li>
            <li>
              <strong className="text-foreground">Prisma / Supabase</strong> — our database
              infrastructure provider stores your account and study data on servers within their
              secure cloud environment.
            </li>
            <li>
              <strong className="text-foreground">Google</strong> — if you use &quot;Sign in with
              Google&quot;, Google authenticates you and shares your name and email with us.
            </li>
          </ul>
        </Section>

        <Section title="5. Data retention">
          <p>
            We keep your account data for as long as your account is active. If you delete your
            account, we delete your personal data within 30 days, except where we are required to
            retain it by law (e.g. payment records for tax purposes, which we keep for 7 years).
          </p>
          <p>
            Anonymised, aggregated study statistics may be retained indefinitely for product
            improvement purposes.
          </p>
        </Section>

        <Section title="6. Your rights">
          <p>You have the right to:</p>
          <ul className="ml-5 list-disc space-y-2">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your account and associated data.</li>
            <li>Object to or restrict processing in certain circumstances.</li>
            <li>Receive a copy of your data in a portable format.</li>
          </ul>
          <p>
            To exercise any of these rights, email us at{" "}
            <a
              href="mailto:hello@pass.co.zw"
              className="font-medium text-foreground underline underline-offset-4 hover:opacity-70"
            >
              hello@pass.co.zw
            </a>
            . We will respond within 30 days.
          </p>
        </Section>

        <Section title="7. Cookies and local storage">
          <p>
            We use a session cookie (&quot;pass_session&quot;) solely to keep you logged in between
            page loads. We do not use advertising cookies or tracking pixels.
          </p>
          <p>
            Our mobile application uses device secure storage (not accessible to other apps) to store
            your authentication token.
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            Passwords are hashed using bcrypt before storage. All data is transmitted over HTTPS.
            Authentication tokens are short-lived JWTs. We do not store payment card or mobile
            money credentials.
          </p>
          <p>
            Despite these measures, no system is completely secure. If you suspect your account has
            been compromised, contact us immediately at hello@pass.co.zw.
          </p>
        </Section>

        <Section title="9. Children">
          <p>
            Pass is designed for secondary school students. We do not knowingly collect personal
            data from children under 13. If you believe a child under 13 has created an account,
            contact us and we will delete the data promptly.
          </p>
        </Section>

        <Section title="10. Changes to this policy">
          <p>
            We may update this policy from time to time. When we do, we will update the &quot;Last
            updated&quot; date at the top and, for material changes, notify you by email. Your
            continued use of Pass after changes constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            If you have questions or concerns about this policy, reach us at{" "}
            <a
              href="mailto:hello@pass.co.zw"
              className="font-medium text-foreground underline underline-offset-4 hover:opacity-70"
            >
              hello@pass.co.zw
            </a>{" "}
            or on WhatsApp at +263 77 510 1506.
          </p>
        </Section>
      </div>
    </article>
  );
}
