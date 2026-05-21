import type { Metadata } from "next";
import { SectionEyebrow } from "../_components/section-eyebrow";
import { SectionHeading, SectionLede } from "../_components/section-heading";
import { ScrollReveal } from "../_components/scroll-reveal";

export const metadata: Metadata = {
  title: "Terms of Service — Pass",
  description:
    "The terms and conditions governing your use of Pass — Zimbabwe's ZIMSEC past-paper study platform.",
  alternates: { canonical: "https://pass.co.zw/terms" },
  openGraph: {
    type: "website",
    url: "https://pass.co.zw/terms",
    siteName: "Pass",
    title: "Terms of Service — Pass",
    description: "Terms and conditions for using Pass.",
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

export default function TermsPage() {
  return (
    <article className="bg-background">
      <section className="px-6 pt-32 pb-12 md:pt-40 md:pb-16">
        <div className="mx-auto max-w-3xl">
          <ScrollReveal>
            <SectionEyebrow>Legal</SectionEyebrow>
            <SectionHeading as="h1" className="mt-4 text-4xl md:text-5xl">
              Terms of Service
            </SectionHeading>
            <SectionLede className="mt-5 max-w-2xl">
              By creating an account or using Pass, you agree to these terms. Please read them
              carefully.
            </SectionLede>
            <p className="mt-4 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          </ScrollReveal>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-6 pb-24">
        <Section title="1. About Pass">
          <p>
            Pass is an educational platform providing ZIMSEC past examination papers, AI-assisted
            tutoring, and project generation tools. It is operated from Zimbabwe and available at
            pass.co.zw and through our mobile application.
          </p>
          <p>
            References to &quot;Pass&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot; mean
            the Pass platform. &quot;You&quot; means the person accessing or using Pass.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>
            You must be at least 13 years old to use Pass. If you are under 18, you confirm that a
            parent or legal guardian has reviewed and consented to these terms on your behalf.
          </p>
          <p>
            By using Pass, you confirm that the information you provide when registering is accurate
            and that you will keep it up to date.
          </p>
        </Section>

        <Section title="3. Acceptable use">
          <p>Pass is for personal, educational use only. You agree not to:</p>
          <ul className="ml-5 list-disc space-y-2">
            <li>Share your account credentials with others or allow multiple people to use one account.</li>
            <li>
              Use Pass to cheat in live examinations or circumvent official ZIMSEC examination
              regulations.
            </li>
            <li>
              Scrape, copy, or redistribute past-paper content, AI-generated answers, or any other
              content from Pass without our written permission.
            </li>
            <li>
              Attempt to reverse-engineer, decompile, or interfere with any part of the platform.
            </li>
            <li>
              Use automated tools, bots, or scripts to access or interact with Pass in ways not
              intended by its design.
            </li>
            <li>Upload or transmit content that is harmful, illegal, or infringes third-party rights.</li>
          </ul>
        </Section>

        <Section title="4. AI-generated content disclaimer">
          <p>
            Pass uses AI to generate model answers, marking rubrics, and study explanations. This
            content is provided for educational guidance only.
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>AI-generated answers may contain errors or omissions.</li>
            <li>
              They are not a substitute for official ZIMSEC marking schemes, which take precedence
              in all examination contexts.
            </li>
            <li>
              We do not guarantee that AI-generated content meets the exact standard required by
              ZIMSEC examiners.
            </li>
          </ul>
          <p>
            Where official marking guides have been attached to a paper, those take precedence over
            AI-generated rubrics.
          </p>
        </Section>

        <Section title="5. Subscriptions and payments">
          <p>
            Pass offers a free tier and paid subscription plans (Study and Pass). Paid subscriptions
            are billed monthly and processed via Paynow Zimbabwe, supporting EcoCash, OneMoney, and
            bank card payments.
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              Prices are displayed in USD. Payments may be settled in ZWG at the prevailing exchange
              rate at the time of transaction, as determined by Paynow.
            </li>
            <li>
              Subscriptions renew automatically each month unless cancelled before the renewal date.
            </li>
            <li>
              <strong className="text-foreground">No refunds</strong> — digital subscriptions are
              consumed immediately upon activation. We do not offer refunds once a billing period
              has started, except where required by applicable law.
            </li>
            <li>
              If a payment fails, your account reverts to the free tier until a successful payment
              is made.
            </li>
          </ul>
          <p>
            To cancel your subscription, contact us at{" "}
            <a
              href="mailto:hello@pass.co.zw"
              className="font-medium text-foreground underline underline-offset-4 hover:opacity-70"
            >
              hello@pass.co.zw
            </a>{" "}
            before your next renewal date.
          </p>
        </Section>

        <Section title="6. Intellectual property">
          <p>
            ZIMSEC examination papers are reproduced for educational purposes. All original content
            on Pass — including the AI tutoring system, interface design, and product text — is our
            intellectual property and may not be reproduced without permission.
          </p>
          <p>
            Any content you submit to Pass (such as answers or project topics) remains yours. By
            submitting it, you grant us a limited licence to process it for the purpose of
            delivering the service (e.g. sending it to the AI for grading).
          </p>
        </Section>

        <Section title="7. Account termination">
          <p>
            You may delete your account at any time by contacting us at hello@pass.co.zw. We may
            suspend or terminate accounts that violate these terms, with or without notice.
          </p>
          <p>
            On termination, your access to paid features ends immediately. Data deletion follows our
            Privacy Policy.
          </p>
        </Section>

        <Section title="8. Limitation of liability">
          <p>
            Pass is provided &quot;as is&quot;. To the fullest extent permitted by law, we exclude
            liability for:
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>Examination results or academic outcomes.</li>
            <li>Errors in AI-generated content.</li>
            <li>Service interruptions or data loss.</li>
            <li>Any indirect or consequential loss arising from your use of Pass.</li>
          </ul>
          <p>Our total liability to you in any 12-month period shall not exceed the amount you paid us in that period.</p>
        </Section>

        <Section title="9. Changes to these terms">
          <p>
            We may update these terms from time to time. We will notify you of material changes by
            email or by a notice in the app at least 14 days before they take effect. Continued use
            of Pass after that date constitutes acceptance of the new terms.
          </p>
        </Section>

        <Section title="10. Governing law">
          <p>
            These terms are governed by the laws of Zimbabwe. Any disputes shall be subject to the
            jurisdiction of the courts of Zimbabwe.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            Questions about these terms? Email us at{" "}
            <a
              href="mailto:hello@pass.co.zw"
              className="font-medium text-foreground underline underline-offset-4 hover:opacity-70"
            >
              hello@pass.co.zw
            </a>
            .
          </p>
        </Section>
      </div>
    </article>
  );
}
