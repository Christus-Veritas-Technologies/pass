# pass.co.zw — Landing Page Plan

> A deep, implementation-ready plan for the public marketing site at `/`, `/pricing`, and `/about`. Adapts Mobbin's clean editorial layout for a Zimbabwean edtech audience (ZIMSEC A-Level, O-Level, Grade 7 students and their parents).

---

## 0. Codebase audit — what's already here

Findings that anchor every decision below.

| Area | What we found | Implication |
|---|---|---|
| Framework | Next.js 16 (`apps/web`), React 19, Tailwind 4, `typedRoutes: true`, `reactCompiler: true` | Use App Router, type-safe `Link`s, server components by default. |
| Brand color | `--brand: oklch(0.484 0.263 277)` (indigo) → primary CTA. Login brand panel pairs indigo-950 → violet-900. | Hero & CTA sections reuse this exact gradient. |
| Radius | `--radius: 0.75rem` (12px), plus `--radius-2xl/3xl/4xl` modifiers | Cards = `rounded-xl`, hero pills = `rounded-full`, screenshot frames = `rounded-3xl`. |
| Font stack | System sans (`ui-sans-serif, system-ui, …`) in `globals.css` `@theme inline` | Add Inter (body) + Geist (display) via `next/font` for the marketing pages only. Don't pollute the app. |
| Icons | `@hugeicons/react` everywhere in the app | User requested Lucide — add `lucide-react` and use it on marketing pages. Keep app on hugeicons. Two icon libs is acceptable since marketing is a self-contained surface. |
| Animation | `framer-motion@^11` already installed; `animate-fade-up` keyframe + stagger helpers in `globals.css` | Use both — framer-motion for scroll-triggered + count-ups; CSS classes for simple on-mount fades. |
| Existing routes | `apps/web/src/app/page.tsx` redirects `/` → `/login`; `(app)/*` group has dashboard/papers/study/projects/resources/pricing/profile/checkout/payments behind `AuthGuard` | Move the in-app `/pricing` to the marketing group (it can serve both audiences). Replace `page.tsx` with a real landing. |
| Auth helpers | `getAccessToken()` from `@/lib/auth` reads localStorage | Marketing nav reads token client-side to switch CTAs ("Sign up" ↔ "Dashboard"). |
| Real data | `packages/papers/ingested.json` → **144 papers, 2,016 questions, 57 subjects, 3 grade levels (A-Level, O-Level, Grade 7)** | Stats bar uses these numbers. Round to clean marketing values: "140+ papers", "2,000+ questions", "55+ subjects". |
| Pricing source of truth | `apps/web/src/app/(app)/pricing/page.tsx` — FREE / STUDY ($2.99) / PASS ($5.99); annual saves 44% → $19.99 / $39.99 | Marketing pricing page mirrors these EXACTLY. Keep one source of truth (move the file, don't duplicate). |
| Payment partners | EcoCash, OneMoney, Omari, InnBucks, Bank Transfer (logos already in `apps/web/public/payment-methods/`) | Footer "Pay with" strip + pricing page partner row. |
| AI personality | `passAgent` in `apps/server/src/mastra/agents/pass.agent.ts` — encouraging, Zimbabwean context, evaluates answers against marking scheme, generates project reports | Frame AI feature copy around this: "knows the mark scheme", "speaks Zimbabwe". |
| Subjects | Mathematics, English Language, Combined Science, Chemistry, Biology, History, Geography, English Literature, Shona, Physics, Accounting, Agriculture, Art, Sociology, … 57 total | Subject cloud in feature section can show a rotating sample. |

---

## 1. Information architecture

### Pages

| URL | Purpose | Audience state |
|---|---|---|
| `/` | Marketing home — convert visitors to signup | Logged-out (primary); logged-in see "Dashboard" CTA instead of "Sign up" |
| `/pricing` | Plans, FAQ, payment partners | Both — replaces existing `(app)/pricing` |
| `/about` | Mission, why Zimbabwe, who's behind it | Both |

No separate `/features` page — feature deep-dives live on the home page as alternating sections. Adding a fourth page dilutes the funnel.

### Routing architecture — co-existence with `/app/*`

```
apps/web/src/app/
├── layout.tsx                  # Root layout — unchanged (Providers, <head>, body)
├── page.tsx                    # REPLACE — was redirect; becomes marketing home (renders from (marketing) group)
├── (marketing)/                # NEW route group — no URL segment
│   ├── layout.tsx              # Marketing shell — top nav + footer, no sidebar/AuthGuard
│   ├── _components/            # Shared marketing primitives (not a route)
│   │   ├── marketing-nav.tsx
│   │   ├── marketing-footer.tsx
│   │   ├── stat-counter.tsx
│   │   ├── section-eyebrow.tsx
│   │   ├── scroll-reveal.tsx
│   │   ├── gradient-orb.tsx
│   │   ├── subject-marquee.tsx
│   │   └── testimonial-card.tsx
│   ├── _sections/              # Home-page sections, one file each
│   │   ├── hero.tsx
│   │   ├── stats-bar.tsx
│   │   ├── feature-papers.tsx
│   │   ├── feature-ai.tsx
│   │   ├── feature-projects.tsx
│   │   ├── feature-progress.tsx
│   │   ├── how-it-works.tsx
│   │   ├── testimonials.tsx
│   │   ├── pricing-teaser.tsx
│   │   ├── faq.tsx
│   │   └── cta.tsx
│   ├── page.tsx                # Home — composes _sections in order
│   ├── pricing/
│   │   └── page.tsx            # MOVE from (app)/pricing; same plans, same data
│   └── about/
│       └── page.tsx            # NEW
├── (app)/                      # Unchanged — AuthGuard + sidebar shell
│   ├── layout.tsx
│   ├── dashboard/…
│   ├── papers/…
│   ├── study/…
│   ├── projects/…
│   ├── resources/…
│   ├── profile/…
│   ├── checkout/…
│   └── payments/…
│   # pricing/ — DELETED, lives in (marketing) now
├── login/                      # Unchanged
├── signup/                     # Unchanged
├── forgot-password/, reset-password/, onboarding/, auth/
├── sitemap.ts                  # NEW — Next.js metadata file
├── robots.ts                   # NEW — Next.js metadata file
├── opengraph-image.tsx         # NEW — dynamic OG image at /opengraph-image
└── icon.png/, favicon files    # Unchanged
```

**Why this works:** Next.js route groups (parenthesised folders) don't add a URL segment, so `(marketing)/page.tsx` resolves to `/` and `(marketing)/pricing/page.tsx` resolves to `/pricing`. The two layouts (`(marketing)/layout.tsx` vs `(app)/layout.tsx`) are isolated, so marketing pages don't pull in the sidebar, `AuthGuard`, or the in-app header.

**Sidebar link reconciliation:** `apps/web/src/components/layout/sidebar.tsx` currently links Pricing → `/pricing`. After the move, this still resolves correctly (same URL). No change needed. The pricing page itself uses `getAccessToken()` to decide whether to show "Get started" → `/signup` or "Upgrade" → `/checkout?plan=…`.

**Home-page conflict (the only real risk):** `apps/web/src/app/page.tsx` (the redirect) and `apps/web/src/app/(marketing)/page.tsx` both resolve to `/` — Next.js will error. The fix: **delete `apps/web/src/app/page.tsx`** when the marketing home goes live.

**Logged-in users hitting `/`:** Don't auto-redirect. Marketing copy is useful even after signup (parents, referrals). The marketing nav swaps the CTAs from "Log in / Start free" to "Dashboard" when `getAccessToken()` is truthy (client-only, hydration-safe — render a neutral placeholder during SSR).

---

## 2. Design system — exact values

### Color

All values are already defined in `packages/ui/src/styles/globals.css`. **Do not duplicate.** Use Tailwind utilities driven by the existing CSS vars.

| Role | Light | Dark | Tailwind class |
|---|---|---|---|
| Brand / primary | `oklch(0.484 0.263 277)` indigo | `oklch(0.62 0.21 277)` | `bg-primary`, `text-primary` |
| Background | `oklch(1 0 0)` white | `oklch(0.145 0 0)` near-black | `bg-background` |
| Foreground | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | `text-foreground` |
| Muted | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | `bg-muted`, `text-muted-foreground` |
| Border | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | `border-border` |

**Section rhythm (Mobbin-style dark/light alternation):**

1. **Hero** — light background with subtle gradient orbs (indigo-500/15, violet-500/15) blurred behind
2. **Stats bar** — `bg-foreground text-background` (full inversion — dark band crossing the page)
3. **Feature 1 (Papers)** — light
4. **Feature 2 (AI tutor)** — `bg-foreground text-background` again, OR `bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900` (matches login brand panel for cohesion)
5. **Feature 3 (Projects)** — light
6. **Feature 4 (Progress)** — light (subtle muted card backdrop)
7. **How it works** — light, three numbered steps
8. **Testimonials** — `bg-muted/40` (very faint tint)
9. **Pricing teaser** — light
10. **CTA** — full bleed `bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900` with grid-dot overlay (same recipe as `BrandPanel`)
11. **Footer** — `bg-foreground text-background` mode

### Typography

Install via `next/font` in the marketing layout only:

```ts
// apps/web/src/app/(marketing)/layout.tsx
import { Inter, Instrument_Serif } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-marketing-sans", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-marketing-serif", display: "swap" });
```

Apply `${inter.variable} ${serif.variable} font-marketing-sans` on the marketing layout's root `div`. Expose via Tailwind in `globals.css`:

```css
@theme inline {
  --font-marketing-sans: var(--font-marketing-sans), ui-sans-serif, system-ui, …;
  --font-marketing-serif: var(--font-marketing-serif), ui-serif, Georgia, serif;
}
```

| Element | Class | Notes |
|---|---|---|
| Hero h1 | `text-5xl md:text-7xl font-semibold tracking-[-0.04em] leading-[1.02]` | One italic serif word for editorial accent (e.g. "_smarter_") |
| Section eyebrow | `text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground` | "01 — Past papers" |
| Section h2 | `text-3xl md:text-5xl font-semibold tracking-[-0.03em]` | |
| Section lede | `text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed` | |
| Body | `text-base text-foreground/80 leading-relaxed` | |
| Big stat number | `text-5xl md:text-6xl font-semibold tabular-nums tracking-tight` | tabular-nums prevents jitter during count-up |

Inter is the body workhorse. Instrument Serif (free, Google) supplies the one-italic-word accent that gives the editorial Mobbin-ish feel without a paid font.

### Spacing

| Token | Use |
|---|---|
| Section vertical padding | `py-24 md:py-32` |
| Container max width | `max-w-7xl mx-auto px-6 md:px-10` |
| Gap between hero CTAs | `gap-3` |
| Card padding | `p-6 md:p-8` |
| Feature image / text gap | `gap-12 md:gap-20` |

### Iconography

- **Library:** `lucide-react` (add as dep of `apps/web`). No Hugeicons on marketing pages.
- **Sizing:** Inline icons `h-4 w-4`, feature badges `h-5 w-5`, stat icons `h-6 w-6`.
- **No emojis anywhere.** The dashboard's "Hi, Name 👋" is in the app — fine to keep; marketing copy has zero emojis.

### Animation specs

All scroll-triggered animations use `framer-motion` with `whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}`.

| Element | Animation | Trigger | Duration | Easing |
|---|---|---|---|---|
| Hero headline | y: 24 → 0, opacity 0 → 1 | mount | 600ms | `[0.23, 1, 0.32, 1]` (matches existing `--ease-ui`) |
| Hero subhead | same, delay 0.12s | mount | 600ms | same |
| Hero CTAs | same, delay 0.2s | mount | 500ms | same |
| Hero stats inline | same, delay 0.28s | mount | 500ms | same |
| Hero gradient orbs | subtle 8s loop — `scale: [1, 1.05, 1]`, `opacity: [0.6, 0.8, 0.6]` | mount, repeat | 8s | ease-in-out |
| Stats counter | number animates 0 → target over 1.2s when in viewport | `useInView` | 1200ms | `easeOut` |
| Feature section | image: x: -40 → 0; text: x: 40 → 0; both opacity 0 → 1 | viewport entry | 700ms | `[0.23, 1, 0.32, 1]` |
| Testimonial grid | stagger children 80ms; each: y: 16 → 0 | viewport entry | 500ms each | `[0.23, 1, 0.32, 1]` |
| CTA section background | conic-gradient slow rotation (40s loop) behind the content | mount | 40s | linear |
| Nav on scroll | adds `backdrop-blur` + faint border below 12px scroll position | scroll | 200ms | ease |
| Buttons | hover: scale 1 → 1.02, shadow grows; active: scale 0.98 | hover/press | 150ms | `[0.23, 1, 0.32, 1]` |

**Reduced motion:** wrap framer-motion calls so `useReducedMotion()` shortcuts the variants to instant. Required for accessibility.

---

## 3. Page-by-page content (full copy, ready to paste)

### 3.1 — `/` (Home)

#### 3.1.1 Top nav

Sticky, transparent at top, blurs + borders on scroll.

```
[Pass logo + wordmark]        Features  Pricing  About        Log in  [Start free →]
```

- Logo: `/icon.png` 28×28 + "Pass" wordmark, `text-base font-semibold tracking-tight`
- Links: `text-sm font-medium text-foreground/70 hover:text-foreground`
  - **Features** → `#features` (anchor, smooth scroll)
  - **Pricing** → `/pricing`
  - **About** → `/about`
- Right side (logged-out): "Log in" (ghost) + "Start free" (filled primary, with `ArrowRight` icon)
- Right side (logged-in, detected via `getAccessToken()` client-side): single "Dashboard →" button

Mobile: hamburger → full-screen drawer (`Sheet` from shadcn or a custom motion drawer) with the same links stacked.

#### 3.1.2 Hero

**Eyebrow:** `Built for ZIMSEC — A-Level, O-Level, Grade 7`

**Headline:**
> Study *smarter*. Pass faster.

(The word "smarter" set in Instrument Serif italic, the rest in Inter semibold. Mirrors the existing brand panel headline so the brand stays consistent everywhere.)

**Subheadline:**
> The fastest way to prep for ZIMSEC. Practice every past paper with an AI tutor that grades your work, explains the mark scheme, and writes your projects — all from Harare to Hwange.

**Primary CTA:** `Start free` → `/signup` (with `ArrowRight` icon)

**Secondary CTA:** `See how it works` → smooth scroll to `#how-it-works`

**Inline trust line under CTAs:** `text-xs text-muted-foreground` — "No credit card. 5 papers free every month. Cancel anytime."

**Hero visual:**
`[PLACEHOLDER: Hero product mock — composited screenshot showing the Study screen (question view) on the left and the AI tutor explanation card floating on the right with a soft drop shadow. Use a 16:10 frame, rounded-3xl, ring-1 ring-foreground/10. The composition lives inside a "browser chrome" wrapper (three dots top-left). Behind it: two blurred radial gradient orbs — indigo-500/40 top-right, violet-500/40 bottom-left.]`

For the v1 implementation: render an actual screenshot of the live `/papers/[id]` page in a Chrome headless capture, dropped into `apps/web/public/landing/hero-product.png`. Until that exists, use a literal placeholder div with the dimensions and a "Demo coming soon" note inside.

#### 3.1.3 Stats bar (full-width dark band)

`bg-foreground text-background py-16`

Four columns, with a vertical divider between each (`divide-x divide-white/10`):

| Number | Label |
|---|---|
| **140+** | Past papers |
| **2,000+** | Marked questions |
| **55+** | ZIMSEC subjects |
| **3** | Levels — A, O, Grade 7 |

Each number animates from 0 on viewport entry (1.2s ease-out, `tabular-nums`). The `+` suffix appears after the count finishes.

Below the row, a thin centered line: `text-xs uppercase tracking-widest text-background/50` — "Updated for the 2025 syllabus"

#### 3.1.4 Feature 1 — Past papers, every subject

Layout: image left, text right. Eyebrow + h2 + lede + bullet list.

**Eyebrow:** `01 — Past papers`

**Headline:**
> Every ZIMSEC paper you'll ever sit. In one place.

**Lede:**
> No more digging through WhatsApp groups for last year's Maths paper. We've collected and parsed every recent past paper, by subject and level, ready to practice the moment you open the app.

**Bullets (with `Check` icon, `text-primary`):**
- Mathematics, Sciences, Languages, Humanities — 55+ subjects
- Searchable by subject, year, grade, and topic
- View the original PDF or work through it question-by-question
- New papers added every month

**Image:** `[PLACEHOLDER: Screenshot of /papers — the filter chips + paper grid. 16:10, rounded-2xl, ring-1.]` Save to `apps/web/public/landing/feature-papers.png`.

**Subject cloud under the bullets:** Auto-rotating chip carousel showing a random sample of 10 subjects from the real list (Mathematics, Combined Science, Shona, History, Geography, English Literature, Accounting, Agriculture, Physics, Biology). Marquee animation, 30s loop, `motion.div` with infinite `x` translate.

#### 3.1.5 Feature 2 — AI tutor (dark section, indigo gradient)

`bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 text-white` with the grid-dot pattern overlay (same as `BrandPanel`).

Layout: text left, image right.

**Eyebrow** (`text-indigo-300`): `02 — AI Tutor`

**Headline:**
> An AI that knows the *mark scheme*.

(Italic serif "mark scheme".)

**Lede** (`text-indigo-200`):
> Stuck on a question? Pass AI walks you through it like a patient tutor — pointing out where marks are earned, why your answer fell short, and how to nail the next one. Trained on ZIMSEC mark schemes. Speaks Zimbabwe.

**Bullets:**
- Instant marking against the official scheme
- Step-by-step explanations, not just answers
- Exam technique tips for each question type
- Encouraging, never condescending

**Image:** `[PLACEHOLDER: Screenshot of the AI explanation card — a question, the student's answer, and the AI breakdown beneath. Frame on a tilted card with subtle 3D rotation. 4:5 portrait orientation.]` Save to `apps/web/public/landing/feature-ai.png`.

#### 3.1.6 Feature 3 — Projects

Layout: image left, text right. Back to light background.

**Eyebrow:** `03 — Projects`

**Headline:**
> Turn a topic into a finished project. In minutes.

**Lede:**
> ZIMSEC projects are 25% of your grade in many subjects. Pass writes them in proper format — introduction, methodology, findings, references — for Agriculture, Commerce, Geography, and more. You edit, you submit.

**Bullets:**
- ZIMSEC project format per subject and grade
- Streamed live as it writes — pause or restart anytime
- Download as PDF or copy as markdown
- Up to 12 generated projects per month on Pass

**Image:** `[PLACEHOLDER: Screenshot of /projects mid-generation — the streaming text on the right panel, the project list on the left. 16:10.]` Save to `apps/web/public/landing/feature-projects.png`.

#### 3.1.7 Feature 4 — Progress

Smaller section — single column, centered, with a card grid below.

**Eyebrow:** `04 — Progress`

**Headline:**
> See yourself getting better.

**Lede:**
> Streaks, weekly goals, papers attempted, accuracy by subject. Pass tracks the small wins that add up to a strong exam day.

**Card grid (3 columns on desktop, 1 on mobile):**

Each card is a faux dashboard widget rendered in code (not a screenshot), echoing the real dashboard's stat cards.

| Card | Icon | Stat | Label |
|---|---|---|---|
| Streak | `Flame` (lucide) `text-orange-500` | 14d | Day streak |
| Papers done | `FileCheck` `text-violet-600` | 28 | Papers attempted |
| Weekly goal | `Target` `text-blue-600` | 4/5 | Weekly goal (with progress bar) |

These cards animate in with a stagger when scrolled to.

#### 3.1.8 How it works (3 numbered steps)

Section id `#how-it-works`. Three centered columns, each with a big numeral, headline, blurb.

| # | Title | Body |
|---|---|---|
| 01 | Sign up free | Make an account in 30 seconds. No credit card. 5 papers and 2 AI projects every month — forever. |
| 02 | Pick a paper, start practising | Choose your subject and level. Work through questions, get them marked by AI, see exactly where the marks come from. |
| 03 | Stay sharp until exam day | Build a streak, track your weekly goal, and walk into ZIMSEC knowing you've already seen these questions. |

#### 3.1.9 Testimonials (6 quote cards)

Section title eyebrow: `Loved across Zimbabwe`

Section h2: `From Harare to Hwange.`

3×2 grid on desktop, single column on mobile. Each card: `rounded-2xl border bg-card p-6 md:p-7`. Quote in serif italic, author below in sans.

> **"My Maths jumped two grades in one term. The AI explained mistakes the way my teacher couldn't."**
> — Tanaka M., Form 4, Prince Edward School (Harare)

> **"Used to dread Combined Science. Now I do a paper every Saturday morning before chores."**
> — Rumbidzai N., Form 3, Dominican Convent (Bulawayo)

> **"As a parent, I finally see exactly what my son is studying and where he's stuck. Worth every cent."**
> — Mr. Chigumira, parent of two A-Level students

> **"I generated my Agriculture project in 20 minutes. Spent the rest of the week actually understanding it."**
> — Tinashe G., Lower 6, St. George's College (Harare)

> **"I teach Form 5 Geography. I recommend Pass to every student — the past paper coverage is unmatched."**
> — Mrs. Moyo, teacher, Mutare

> **"Cheaper than two combies a week. And it works on my mum's old phone."**
> — Privilege S., Form 6, Gokomere High (Masvingo)

(All names are realistic Zimbabwean names; pair Shona, Ndebele, and English given names with schools that exist. If marketing/legal wants real consented testimonials before launch, swap these out — flag as v1 placeholders.)

#### 3.1.10 Pricing teaser

Eyebrow: `Pricing`

Headline: `One price. Every subject. Cancel anytime.`

Lede: `Free forever for 5 papers a month. Or unlock the full library from $2.99/month.`

Compact three-card row mirroring the full pricing page (Free / Study / Pass), with the same "Most popular" ring on Study. Each card has only: name, price, 3 top features, CTA → "See full pricing" linking to `/pricing`.

#### 3.1.11 FAQ (collapsed accordion, 6 items)

Eyebrow: `Common questions`

| Q | A |
|---|---|
| Is Pass really free? | Yes — the Free plan gives you 5 past papers and 2 AI-generated projects every single month. No credit card, no trial countdown. |
| Which subjects do you cover? | Every major ZIMSEC subject for O-Level and A-Level, plus Grade 7. Mathematics, Sciences, Languages (English, Shona, Ndebele), Humanities (History, Geography), Commerce, Accounting, Agriculture, and more — 55+ in total. |
| How does the AI know the mark scheme? | We've parsed the official ZIMSEC mark scheme for every paper in the library. Pass AI grades your answer against that scheme — it's not just guessing. |
| Can I use Pass on my phone? | Yes. The web app works on any phone with a browser, and we have a native Android app on the Play Store (iOS coming). It's designed for low-data Zimbabwean networks. |
| How do I pay? | EcoCash, OneMoney, Omari, InnBucks, or direct bank transfer. All ZWL. We don't ask for international cards. |
| What if I'm not happy? | Cancel anytime from your profile. You keep access until the end of the period you've already paid for. |

#### 3.1.12 Final CTA section (dark, full bleed)

Background: `bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900`, grid-dot overlay, two glow orbs, a slow conic-gradient sweep behind. Mirrors the login `BrandPanel` so the brand snaps shut neatly.

**Eyebrow:** `text-indigo-300` — `ZIMSEC 2026 starts in months.`

**Headline:** `text-white text-5xl md:text-7xl font-semibold tracking-tight`
> Don't walk in unprepared.

**Subheadline:** `text-indigo-200 text-lg max-w-xl mx-auto`
> Join thousands of students already practising on Pass. Start free — your first paper is one click away.

**CTAs (centered):**
- Primary (white-on-indigo, large): `Start free →`
- Secondary (ghost, white border): `See pricing`

#### 3.1.13 Footer

`bg-foreground text-background py-16`

Top row (4 columns on desktop, 2 on mobile):

| Product | Company | Resources | Get the app |
|---|---|---|---|
| Past papers | About | Help centre | iOS (coming) |
| AI tutor | Careers | Contact | Android |
| Projects | Press | Status | Web |
| Pricing | Privacy | Changelog |  |
|  | Terms |  |  |

Mid divider row — `border-y border-white/10 py-8`. Centered eyebrow `text-xs uppercase tracking-widest text-background/60`: **"We accept"**. Below, a horizontal strip showing: EcoCash, OneMoney, Omari, InnBucks, Bank Transfer (using the existing logos in `apps/web/public/payment-methods/`, each 32px tall, greyscale at 60% opacity, full color on hover).

Bottom row: logo + `Pass © 2026 — Made in Zimbabwe.` on the left, social icons (X, Instagram, TikTok, YouTube — `lucide-react` brand-agnostic icons, just simple links) on the right.

---

### 3.2 — `/pricing`

Reuse the existing copy from `apps/web/src/app/(app)/pricing/page.tsx` but re-skin for marketing context. Major changes:

1. Add marketing nav + footer (via `(marketing)/layout.tsx`).
2. Above the plans, add a hero band:
   - **Eyebrow:** `Pricing`
   - **Headline:** `Pay for what you need. Not a penny more.`
   - **Subheadline:** `Free forever. Or unlock the full library from $2.99/month. All prices in USD, billed in your choice of ZWL or USD.`
3. Keep the existing **billing toggle** (Monthly / Annual — Save 44%).
4. Keep the existing **three plan cards** (Free / Study / Pass) with their exact prices, features, and missing-feature crossouts. **Source of truth is the JSON in the existing file** — copy it verbatim into the new file.
5. Below the plans, add a **comparison table** (new). Rows = features, columns = plans. Faster scanning than the bullet lists.

   | Feature | Free | Study | Pass |
   |---|---|---|---|
   | Past papers / month | 5 | 12 | 20 |
   | AI projects / month | 2 | 7 | 12 |
   | AI answer marking | Basic | Detailed | Full worked solutions |
   | Resource downloads | ✓ | ✓ | ✓ |
   | Progress tracking | — | ✓ | Full analytics |
   | Support | Community | Email | Priority |

6. Keep the existing payment methods strip and FAQ.
7. Bottom CTA band — same as home page final CTA.

**Logged-in detection:** Component reads `getAccessToken()` on mount; if truthy, each plan card's CTA becomes "Upgrade" → `/checkout?plan=…&billing=…`; if falsy, "Get started" → `/signup?plan=…`.

---

### 3.3 — `/about`

Single-column editorial layout, `max-w-3xl mx-auto px-6`, `py-24 md:py-32`. Smaller hero than home.

**Eyebrow:** `About Pass`

**Headline:**
> Built in Zimbabwe. For Zimbabwean students.

**Lede:**
> Pass exists because the resources Zimbabwean students need to do well — past papers, mark schemes, patient tutoring — shouldn't depend on what WhatsApp group you're in or whether your school's photocopier is working.

**Body sections** (each a `<section className="mt-16">`):

##### Why we built this
> Every year, hundreds of thousands of Zimbabwean students sit ZIMSEC exams that decide whether they go to A-Level, to university, to their first job. The difference between a strong pass and a disappointing one is often just practice — and feedback. Past papers do the first half. Mark schemes do the second. We put them together with an AI tutor that explains every answer, then made it cost less than a week of combi fares.

##### Built for our networks
> A lot of edtech is built for fast Wi-Fi and the latest iPhone. Pass is built for the phone you actually have, on the network you actually use. It loads quickly on 3G. It works on a five-year-old Android. It accepts EcoCash and OneMoney because that's how people actually pay here.

##### Who we are
> A small team of Zimbabwean engineers, teachers, and designers. We grew up writing ZIMSEC. We know what works. We know what doesn't.

(If real team bios are available at implementation time, add a simple grid of headshots + names + roles below this section. Until then, leave the prose alone — don't fabricate people.)

##### What's next
> More past papers (we add new ones every month). More subjects in indigenous languages. A native iOS app. Mark scheme uploads from teachers. We're just getting started.

**Closing CTA card:**
> ### Try Pass for free
> Five papers a month, two projects, every subject. No credit card.
> [ Start free → ]   [ See pricing ]

**Stat strip above the closing CTA** (4 stats, same numbers as home stats bar — reinforces credibility):
140+ papers · 2,000+ questions · 55+ subjects · 3 levels

---

## 4. Images & media plan

### Stock photography (Unsplash / Pexels)

Each entry: where it goes → exact search query → expected use.

| Slot | Query | Use |
|---|---|---|
| Hero background hint (decorative dot grid or single faint photo) | — | Prefer pure CSS gradient orbs — no stock photo in the hero. The product mockup is the hero visual. |
| About page header band (optional, subtle) | `unsplash: "african students studying classroom natural light"` — pick a horizontal one with desaturated tones | Half-height band behind the about hero, opacity 30%, foreground-tint overlay |
| Feature 4 (Progress) faint photo background of one card | `unsplash: "zimbabwe student writing exam"` | Optional, single image at low opacity behind the central card. Skip if it competes with the data viz. |
| Testimonial section background | none — keep it `bg-muted/40` | Photo backgrounds make quote cards harder to read |
| About — "Built for our networks" inset | `unsplash: "harare cbd street market mobile phone"` or `pexels: "africa woman smartphone outdoor"` | Small inset, `rounded-2xl`, max-height 400px, full-bleed left edge |
| About — "Who we are" inset | `unsplash: "african tech team office laptop"` | Same treatment as above |

**Implementation:** Download into `apps/web/public/landing/stock/<slug>.jpg` during the implementation pass. Use `next/image` with `priority` only on the hero, `loading="lazy"` everywhere else. Add proper `alt` text describing each scene. Credit photographers in a hidden `<meta>` if their license requires it.

### Product screenshots

Saved into `apps/web/public/landing/` as PNG (or JPEG if files exceed ~250KB). All sized 1920×1200 for retina sharpness, rendered at half size on screen.

| File | Source screen | Notes |
|---|---|---|
| `hero-product.png` | Composited: `/papers/[id]` study view + AI explanation card | Build manually in Figma if needed |
| `feature-papers.png` | `/papers` (filters + grid) |  |
| `feature-ai.png` | AI explanation modal/card in the study view | Portrait crop |
| `feature-projects.png` | `/projects` mid-generation (streaming) |  |

Until each PNG exists, render a clearly labeled placeholder div with the aspect ratio, dashed border, and a comment in code:

```tsx
{/* TODO landing-images: replace with /landing/feature-papers.png once captured */}
<div className="aspect-[16/10] rounded-2xl border-2 border-dashed border-border bg-muted flex items-center justify-center text-xs text-muted-foreground">
  [PLACEHOLDER: screenshot of /papers — filter chips + paper grid]
</div>
```

**Do not invent fake UI** in Figma and pass it off as a real screenshot. Either capture the live app or leave a placeholder.

### Video

**Skip a hero video for v1.** A static product composite + scroll-triggered features performs better on Zimbabwean networks and avoids the production overhead of recording + hosting an embed. Add a `[PLACEHOLDER: 30s app demo video]` comment near the hero for future iteration, but do not implement.

### Logo / brand assets

Already present: `apps/web/public/icon.png`, `favicon.svg`, `apple-touch-icon.png`, `web-app-manifest-*.png`. Reuse these. No new logo work needed.

---

## 5. SEO

### `<title>` and `<meta>` per page

| Page | `<title>` | `<meta name="description">` |
|---|---|---|
| `/` | `Pass — ZIMSEC past papers + AI tutor. Built in Zimbabwe.` | `Practice every ZIMSEC past paper with an AI tutor that explains every answer. A-Level, O-Level, Grade 7. Start free, pay with EcoCash or OneMoney.` |
| `/pricing` | `Pricing — Pass` | `Free forever for 5 papers a month. Or unlock the full ZIMSEC past paper library from $2.99/month. Pay with EcoCash, OneMoney, or bank transfer.` |
| `/about` | `About Pass — Built in Zimbabwe for Zimbabwean students` | `Why we built Pass — patient AI tutoring, every ZIMSEC past paper, made for the phones and networks Zimbabwean students actually use.` |

Set via Next.js `metadata` export per page. Each page also sets `metadataBase: new URL('https://pass.co.zw')` in the root layout if not already set.

### Open Graph + Twitter

In each page's `metadata`:

```ts
openGraph: {
  type: "website",
  url: "https://pass.co.zw/",
  siteName: "Pass",
  title: "Pass — ZIMSEC past papers + AI tutor",
  description: "<same as meta description>",
  images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Pass — Study smarter. Pass faster." }],
  locale: "en_ZW",
},
twitter: {
  card: "summary_large_image",
  title: "Pass — ZIMSEC past papers + AI tutor",
  description: "<same>",
  images: ["/opengraph-image"],
}
```

Implement `apps/web/src/app/opengraph-image.tsx` using Next.js's `ImageResponse` API — a 1200×630 PNG generated server-side with the headline "Study smarter. Pass faster." on the indigo gradient, brand logo top-left, stat row at bottom. Keep it 100% within the Next.js ImageResponse capabilities (no external fonts that can't be bundled — Inter has a Google Fonts URL that works).

### JSON-LD structured data

Inject into the root marketing layout:

```ts
const ld = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "name": "Pass",
      "url": "https://pass.co.zw",
      "logo": "https://pass.co.zw/icon.png",
      "description": "AI-powered ZIMSEC exam preparation for Zimbabwean students.",
      "address": { "@type": "PostalAddress", "addressCountry": "ZW" },
      "sameAs": ["https://twitter.com/passcozw", "https://www.facebook.com/passcozw", "https://www.instagram.com/passcozw"]
    },
    {
      "@type": "SoftwareApplication",
      "name": "Pass",
      "operatingSystem": "Web, Android",
      "applicationCategory": "EducationalApplication",
      "offers": [
        { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "USD" },
        { "@type": "Offer", "name": "Study", "price": "2.99", "priceCurrency": "USD" },
        { "@type": "Offer", "name": "Pass",  "price": "5.99", "priceCurrency": "USD" }
      ],
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "243"
      }
    }
  ]
};
```

Render as `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />` in the marketing layout. (Skip `aggregateRating` until there are real, verifiable reviews — Google penalises fake structured data. Flag this for legal/marketing approval before shipping.)

### `sitemap.ts`

`apps/web/src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://pass.co.zw";
  const now = new Date();
  return [
    { url: `${base}/`,        lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/about`,   lastModified: now, changeFrequency: "yearly",  priority: 0.6 },
    { url: `${base}/login`,   lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${base}/signup`,  lastModified: now, changeFrequency: "yearly",  priority: 0.5 },
  ];
}
```

### `robots.ts`

`apps/web/src/app/robots.ts`:

```ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/app/*", "/dashboard", "/papers", "/study", "/projects", "/resources", "/profile", "/checkout", "/payments", "/api/"] }
    ],
    sitemap: "https://pass.co.zw/sitemap.xml",
  };
}
```

Note: The authenticated routes don't sit under `/app/` URL prefix — they're at `/dashboard`, `/papers`, etc. — so list each explicitly. The `(app)` route group does not appear in the URL.

### Keyword strategy

Primary targets (high intent, Zimbabwe):
- `zimsec past papers`
- `zimsec a level past papers`
- `zimsec o level past papers pdf`
- `zimsec mathematics past papers`
- `zimsec combined science past papers`
- `zimsec grade 7 past papers`
- `zimsec marking scheme`
- `zimsec project ideas`

Secondary (informational):
- `how to pass zimsec`
- `best study app zimbabwe`
- `online tutor zimbabwe`
- `ai tutor zimbabwe`

Distribution rules:
- Hero h1 contains "ZIMSEC", "A-Level", "O-Level", "Grade 7"
- Each feature h2 includes one keyword
- About page covers "ZIMSEC", "Zimbabwe", "exam preparation" naturally
- Footer text "Made in Zimbabwe" + `addressCountry: ZW` for local SEO
- Page URL slugs stay short (`/`, `/pricing`, `/about` — perfect)

Do **not** keyword-stuff. Mention each term once or twice where it's natural.

---

## 6. Component tree (full file list to create)

```
apps/web/src/app/
├── page.tsx                                  DELETE (was redirect to /login)
├── opengraph-image.tsx                       NEW
├── sitemap.ts                                NEW
├── robots.ts                                 NEW
└── (marketing)/
    ├── layout.tsx                            NEW
    ├── page.tsx                              NEW (home)
    ├── pricing/page.tsx                      NEW (move from (app)/pricing)
    ├── about/page.tsx                        NEW
    ├── _components/
    │   ├── marketing-nav.tsx                 NEW
    │   ├── marketing-footer.tsx              NEW
    │   ├── cta-button.tsx                    NEW (primary + secondary variants)
    │   ├── stat-counter.tsx                  NEW (count-up on viewport entry)
    │   ├── section-eyebrow.tsx               NEW
    │   ├── section-heading.tsx               NEW (h2 + lede)
    │   ├── scroll-reveal.tsx                 NEW (motion wrapper)
    │   ├── gradient-orb.tsx                  NEW (decorative blurred orb)
    │   ├── subject-marquee.tsx               NEW (looping subject chips)
    │   ├── testimonial-card.tsx              NEW
    │   ├── faq-accordion.tsx                 NEW (lightweight; uses framer-motion height anim)
    │   ├── pricing-card.tsx                  NEW (extract from existing pricing page)
    │   ├── chrome-frame.tsx                  NEW (browser-window chrome around screenshots)
    │   └── progress-card.tsx                 NEW (fake dashboard widget for feature 4)
    └── _sections/
        ├── hero.tsx                          NEW
        ├── stats-bar.tsx                     NEW
        ├── feature-papers.tsx                NEW
        ├── feature-ai.tsx                    NEW
        ├── feature-projects.tsx              NEW
        ├── feature-progress.tsx              NEW
        ├── how-it-works.tsx                  NEW
        ├── testimonials.tsx                  NEW
        ├── pricing-teaser.tsx                NEW
        ├── faq.tsx                           NEW
        └── cta.tsx                           NEW

apps/web/src/app/(app)/
└── pricing/                                  DELETE (moved to (marketing)/pricing)

apps/web/public/landing/
├── hero-product.png                          NEW asset (or placeholder)
├── feature-papers.png                        NEW
├── feature-ai.png                            NEW
├── feature-projects.png                      NEW
└── stock/                                    NEW dir for downloaded Unsplash images

apps/web/package.json                         EDIT — add `lucide-react`
packages/ui/src/styles/globals.css            EDIT — declare --font-marketing-sans / --font-marketing-serif theme vars
```

### Marketing layout skeleton (for reference, not to copy literally)

```tsx
// apps/web/src/app/(marketing)/layout.tsx
import { Inter, Instrument_Serif } from "next/font/google";
import { MarketingNav } from "./_components/marketing-nav";
import { MarketingFooter } from "./_components/marketing-footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-marketing-sans", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-marketing-serif", display: "swap" });

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} ${serif.variable} font-marketing-sans min-h-screen bg-background text-foreground antialiased`}>
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(/* see SEO section */) }} />
    </div>
  );
}
```

---

## 7. Responsiveness

Mobile-first. Every section listed above scales as follows:

| Breakpoint | Behavior |
|---|---|
| `< 640px` (default) | Single column. Feature image stacks above text. Nav collapses to hamburger. Stats bar becomes 2×2. Hero headline drops to `text-5xl`. |
| `≥ 768px` (`md:`) | Two-column feature layouts engage. Stats bar becomes 4-wide. Hero text grows. |
| `≥ 1024px` (`lg:`) | Full Mobbin-style alternating layout. Max content width caps at `max-w-7xl`. |
| `≥ 1280px` (`xl:`) | Hero gains breathing room — increase orb sizes and headline to `text-7xl`. |

Touch targets: all CTAs `min-h-11` on mobile (44px Apple HIG minimum). Nav links `py-3` in the mobile drawer.

---

## 8. Accessibility checklist

- All images: meaningful `alt` text or `alt=""` if purely decorative (gradient orbs, dot patterns)
- Color contrast: indigo primary on white passes WCAG AA (verified in existing app). Re-check `text-muted-foreground` on `bg-background` at small sizes — bump to `text-foreground/70` if any combination falls below 4.5:1
- Focus rings: every interactive element gets `focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2`. The existing `Button` already does this.
- Semantic HTML: `<header>`, `<nav>`, `<main>`, `<section>` with `aria-labelledby` per section, `<footer>`
- Headings: exactly one `<h1>` per page; sections use `<h2>`; cards use `<h3>` only if they have a heading
- Reduced motion: `useReducedMotion()` from framer-motion gates every motion variant — falls back to static
- Skip link: visible-on-focus "Skip to content" link at the top of the marketing layout, jumps to `<main id="main">`
- Keyboard: FAQ accordion is keyboard-toggleable (Enter/Space). Subject marquee pauses on focus.

---

## 9. Performance budget

| Metric | Target | How |
|---|---|---|
| LCP | < 2.5s on 3G | Hero image gets `priority`, served as WebP, preloaded; gradient orbs are CSS not images |
| CLS | < 0.1 | All images have explicit `width`/`height`; fonts loaded with `display: swap` and font-loading guard |
| TBT | < 200ms | Sections are server components where possible; only sections with `motion`, hover state, or hooks go `"use client"` (hero, stats counter, nav, FAQ, marquee) |
| Total JS | < 200KB gzipped above fold | Lazy-load testimonials, pricing teaser, FAQ via dynamic imports if bundle grows |
| Image bytes | < 300KB hero, < 150KB others | Use `next/image` with quality 80, WebP/AVIF auto-served |

The existing `reactCompiler: true` setting will help — memoises automatically, no manual `useMemo`/`useCallback` needed.

---

## 10. Implementation commit plan

Each chunk is a focused, reviewable commit. Branch off the current `feat/wizardly-kilby-9c4b59` worktree.

1. **`Add lucide-react dep + marketing font tokens`**
   - `apps/web/package.json`: add `lucide-react`
   - `packages/ui/src/styles/globals.css`: add `--font-marketing-sans` / `--font-marketing-serif` theme vars
   - `bun install`

2. **`Scaffold marketing route group with empty layout and pages`**
   - Create `(marketing)/layout.tsx` (nav placeholder, font setup, footer placeholder)
   - Create `(marketing)/page.tsx` returning a single `<main>"home"</main>`
   - Create `(marketing)/pricing/page.tsx` and `(marketing)/about/page.tsx` as stubs
   - Delete `apps/web/src/app/page.tsx` (the old redirect)
   - Verify routes render in dev

3. **`Move pricing page from (app) to (marketing)`**
   - Copy `apps/web/src/app/(app)/pricing/page.tsx` content into `(marketing)/pricing/page.tsx`
   - Replace static "Get started" / "Upgrade" CTAs with `getAccessToken()`-driven logic
   - Delete `apps/web/src/app/(app)/pricing/page.tsx`
   - Verify sidebar Pricing link still resolves (it will — same URL)

4. **`Build marketing nav and footer`**
   - `_components/marketing-nav.tsx` — sticky, scroll-blur, mobile drawer, auth-aware CTAs
   - `_components/marketing-footer.tsx` — 4-col sitemap, payment partners strip, social row

5. **`Add shared marketing primitives`**
   - `cta-button`, `section-eyebrow`, `section-heading`, `scroll-reveal`, `gradient-orb`, `chrome-frame`
   - Pure presentational; no data

6. **`Build hero section with product mockup placeholder`**
   - `_sections/hero.tsx`
   - `chrome-frame` around a placeholder div for the product screenshot
   - Two animated gradient orbs (framer-motion infinite loop)

7. **`Build stats bar with count-up animation`**
   - `_sections/stats-bar.tsx` + `_components/stat-counter.tsx`
   - Real numbers: 140+, 2000+, 55+, 3
   - `useInView` triggers counter

8. **`Build feature sections (Papers, AI, Projects, Progress)`**
   - Four section files in `_sections/`
   - Alternating image-left/image-right, light/dark
   - `subject-marquee` lives inside `feature-papers`
   - `progress-card` × 3 inside `feature-progress`

9. **`Build how-it-works + testimonials + pricing teaser + faq + cta`**
   - Remaining five section files
   - `testimonial-card`, `faq-accordion`, `pricing-card` primitives
   - Final CTA reuses the gradient + dot-grid + orbs

10. **`Compose home page from sections`**
    - `(marketing)/page.tsx` imports and stacks every `_section`
    - Add `metadata` export for `/`

11. **`Build /about page`**
    - Editorial single-column layout
    - Optional stock image insets (placeholder until images are downloaded)

12. **`Add OG image, sitemap, robots, JSON-LD`**
    - `app/opengraph-image.tsx`
    - `app/sitemap.ts`
    - `app/robots.ts`
    - JSON-LD script inside marketing layout
    - Verify with `next build` that all metadata files are detected

13. **`Capture and integrate product screenshots`**
    - Manually screenshot `/papers`, `/study`, `/projects` from a running dev instance
    - Drop into `apps/web/public/landing/`
    - Replace placeholders in the section files

14. **`Download and integrate stock photos`**
    - Pull Unsplash photos per the queries above
    - Save into `apps/web/public/landing/stock/`
    - Replace placeholders in `/about`

15. **`Polish: reduced motion, focus rings, alt text audit, contrast pass`**
    - Add `useReducedMotion` gates everywhere
    - `axe-core` pass (manual run in dev tools)
    - Lighthouse pass — fix any remaining LCP/CLS issues

16. **`Tighten copy after read-through, fix typos, link-check`** (only if anything needs touching after preview)

PR title: **`feat: marketing site (home, pricing, about) for pass.co.zw`**

---

## 11. Open questions to confirm before/during implementation

These don't block the plan, but flag them when implementing — better to ask than guess.

1. **Real testimonials vs placeholders** — Are there any real student/parent quotes (with consent) we can use, or should we ship the realistic-but-fabricated placeholders and clearly label them as such in code comments? **Default if unanswered:** ship placeholders, leave a TODO comment.
2. **`aggregateRating` in JSON-LD** — Fake review counts trigger Google penalties. Skip until real reviews exist. **Default:** omit from v1.
3. **Native iOS launch state** — Footer mentions "iOS (coming)". Confirm timing or drop it.
4. **Pricing in USD vs ZWL on the page** — The existing pricing page shows USD. ZWL conversion happens at checkout via Paynow. Marketing copy should match: USD shown, "billed in ZWL" footnote.
5. **Social media handles** — Confirm `passcozw` is the actual handle across X, Instagram, Facebook, TikTok before wiring footer links. Defaults guessed; verify.
6. **Logo treatment in the marketing nav** — Reuse `/icon.png` (square) + wordmark? Or commission a horizontal lockup? **Default:** icon + wordmark beside, as in the existing sidebar.
7. **Hero product mockup composition** — Single screenshot or a Figma composite of two screens? **Default:** single annotated screenshot of `/papers/[id]` with the AI panel visible. Cleaner than a composite for v1.
8. **OG image content** — Plain text on gradient is safe; a screenshot baked in is richer but harder to maintain. **Default:** text + logo on gradient via `ImageResponse`.

---

## 12. Definition of done

Ship-ready means **all** of:

- `bun run dev` shows `/`, `/pricing`, `/about` with no console errors
- Every CTA links somewhere real (no `href="#"`)
- Lighthouse mobile score ≥ 90 on Performance, Accessibility, SEO, Best Practices for each page
- All three pages have unique `<title>`, `<meta description>`, OG tags
- `next build` succeeds with no warnings; `sitemap.xml` and `robots.txt` are served correctly
- Sidebar Pricing link (in the authenticated app) still resolves to the marketing pricing page
- Logged-in users see "Dashboard" in the marketing nav; logged-out users see "Log in / Start free"
- Pricing CTAs route to `/checkout` for logged-in, `/signup` for logged-out
- Mobile drawer opens, traps focus, closes on link tap
- `prefers-reduced-motion` users see no motion
- No emojis appear on any marketing page
- All `[PLACEHOLDER: ...]` boxes are replaced by real assets OR remain as visible TODOs with code comments explaining the gap
- The screenshots actually match the current state of the in-app screens (re-capture if they've drifted by the time we ship)

---

*End of plan. Approve to begin implementation per the commit plan in §10.*
