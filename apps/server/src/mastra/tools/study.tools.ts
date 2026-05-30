/**
 * Tools available to the Pass chat tutor (passAgent).
 *
 * Read/inform tools only — they surface ZIMSEC paper data and the student's own
 * account/plan info so the tutor can answer "how many papers do I have left",
 * "do you have 2023 Biology", "how much is the Pass plan" without leaving chat.
 *
 * Secure multi-step transactions (entering a password, paying via Paynow) are NOT
 * tools — they stay in the deterministic WhatsApp FSM. The signup/signin/upgrade
 * tools here only hand the student the exact command to type, so the agent can
 * route them into that secure flow.
 *
 * The student's identity (`userId`) is read from the request context, never from
 * model-supplied input — the model cannot query another student's account.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import prisma from "@pass/db";
import { PLANS, PLAN_LIMITS } from "@pass/pricing";
import { currentMonthKey } from "../../lib/planLimits";
import type { PlanKey } from "../../lib/planLimits";

/** Key under which the WhatsApp router injects the authenticated user id. */
export const USER_ID_CTX_KEY = "userId";

function readUserId(context: { requestContext?: { get: (k: string) => unknown } } | undefined): string | null {
  const v = context?.requestContext?.get(USER_ID_CTX_KEY);
  return typeof v === "string" && v.length > 0 ? v : null;
}

// ─── Paper lookup ──────────────────────────────────────────────────────────────

export const lookupResourceTool = createTool({
  id: "lookup-resource",
  description:
    "Fetch a single ZIMSEC past paper by its ID (title, subject, grade, year, question count).",
  inputSchema: z.object({
    resourceId: z.string().describe("The ID of the resource to look up"),
  }),
  execute: async ({ resourceId }) => {
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    return resource ?? { error: "Resource not found" };
  },
});

export const getSessionProgressTool = createTool({
  id: "get-session-progress",
  description:
    "Get the current paper-study session state, including previously attempted questions and their evaluations.",
  inputSchema: z.object({
    sessionId: z.string().describe("The ID of the paper session"),
  }),
  execute: async ({ sessionId }) => {
    const session = await prisma.paperSession.findUnique({
      where: { id: sessionId },
      include: { resource: true, questionAttempts: { orderBy: { questionNumber: "asc" } } },
    });
    return session ?? { error: "Session not found" };
  },
});

// ─── Find papers (browse without leaving chat) ──────────────────────────────────

export const findPapersTool = createTool({
  id: "find-papers",
  description:
    "Search the ZIMSEC past-paper library. Use when a student asks whether a paper exists, e.g. 'do you have 2023 Biology' or 'what Form 4 papers are there'. Returns a count and up to 10 matching papers.",
  inputSchema: z.object({
    subject: z.string().optional().describe("Subject, e.g. Biology, Mathematics"),
    grade: z.string().optional().describe("Grade, e.g. O-Level, A-Level, Form 4, Grade 7"),
    year: z.number().optional().describe("Paper year, e.g. 2023"),
  }),
  execute: async ({ subject, grade, year }) => {
    const where: Record<string, unknown> = { type: "PAST_PAPER" };
    if (subject) where.subject = { contains: subject, mode: "insensitive" };
    if (grade) where.grade = { contains: grade, mode: "insensitive" };
    if (year) where.year = year;

    const [total, papers] = await Promise.all([
      prisma.resource.count({ where }),
      prisma.resource.findMany({
        where,
        orderBy: [{ subject: "asc" }, { year: "desc" }],
        take: 10,
        select: { title: true, subject: true, grade: true, year: true, questionCount: true },
      }),
    ]);

    return {
      total,
      showing: papers.length,
      papers,
      hint: "To study or download a paper, the student should reply *papers* to open the interactive list.",
    };
  },
});

// ─── Account status (the student's own usage) ──────────────────────────────────

export const getAccountStatusTool = createTool({
  id: "get-account-status",
  description:
    "Get the CURRENT student's plan, monthly usage and remaining limits (papers, projects, AI replies, downloads) plus any bonus credits. Use for 'how many papers do I have left', 'what's my plan', 'check my account'.",
  inputSchema: z.object({}),
  execute: async (_input, context) => {
    const userId = readUserId(context);
    if (!userId) return { error: "Not signed in. Ask the student to reply *signin* or *signup* first." };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, bonusPapers: true, bonusProjects: true },
    });
    if (!user) return { error: "Account not found." };

    const limits = PLAN_LIMITS[user.plan as PlanKey];
    const usage = await prisma.monthlyUsage.findUnique({
      where: { userId_month: { userId, month: currentMonthKey() } },
    });

    const fmt = (used: number, limit: number) =>
      limit === Infinity ? `${used} used (unlimited)` : `${used}/${limit} used`;

    return {
      plan: user.plan,
      thisMonth: {
        papers: fmt(usage?.papersUsed ?? 0, limits.papers),
        projects: fmt(usage?.projectsUsed ?? 0, limits.projects),
        aiReplies: fmt(usage?.aiMessagesUsed ?? 0, limits.aiMessages),
        downloads: fmt(usage?.downloadsUsed ?? 0, limits.downloads),
      },
      bonusCredits: { papers: user.bonusPapers, projects: user.bonusProjects },
      resetsMonthly: true,
    };
  },
});

// ─── Plan / pricing info ───────────────────────────────────────────────────────

export const getPlanInfoTool = createTool({
  id: "get-plan-info",
  description:
    "Get Pass pricing and plan limits (Free, Study, Pass) — monthly/annual prices and what each plan includes. Use for 'how much is the Pass plan', 'what do I get if I upgrade'.",
  inputSchema: z.object({}),
  execute: async () => {
    const plans = (["FREE", "STUDY", "PASS"] as const).map((key) => {
      const p = PLANS[key];
      const limits = PLAN_LIMITS[key];
      return {
        name: p.name,
        priceMonthlyUsd: p.prices.MONTHLY,
        priceAnnualUsd: p.prices.ANNUAL,
        papersPerMonth: limits.papers,
        projectsPerMonth: limits.projects,
        downloadsPerMonth: limits.downloads === Infinity ? "unlimited" : limits.downloads,
      };
    });
    return { plans, upgradeHint: "To upgrade, the student should reply *upgrade*." };
  },
});

// ─── FSM-routing tools (hand the student the exact command) ─────────────────────

export const startSignupTool = createTool({
  id: "start-signup",
  description:
    "Use when an UNLINKED student wants to create a Pass account. Returns the command they must type. You do NOT collect their email or password yourself.",
  inputSchema: z.object({}),
  execute: async () => ({
    action: "signup",
    instruction: "Tell the student to reply with the single word *signup* to start creating their free Pass account.",
  }),
});

export const startSigninTool = createTool({
  id: "start-signin",
  description:
    "Use when an UNLINKED student says they already have a Pass account and want to log in. Returns the command they must type. You do NOT collect their password yourself.",
  inputSchema: z.object({}),
  execute: async () => ({
    action: "signin",
    instruction: "Tell the student to reply with the single word *signin* to log into their existing account.",
  }),
});

export const startUpgradeTool = createTool({
  id: "start-upgrade",
  description:
    "Use when a student wants to upgrade their plan or pay. Returns the command they must type. You do NOT collect payment details yourself.",
  inputSchema: z.object({}),
  execute: async () => ({
    action: "upgrade",
    instruction: "Tell the student to reply with the single word *upgrade* to choose a plan and pay via EcoCash or OneMoney.",
  }),
});

/** All tools the chat tutor can call. */
export const passChatTools = {
  lookupResource: lookupResourceTool,
  getSessionProgress: getSessionProgressTool,
  findPapers: findPapersTool,
  getAccountStatus: getAccountStatusTool,
  getPlanInfo: getPlanInfoTool,
  startSignup: startSignupTool,
  startSignin: startSigninTool,
  startUpgrade: startUpgradeTool,
};
