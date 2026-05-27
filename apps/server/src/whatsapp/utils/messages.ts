/**
 * All canned bot strings in one place.
 * Keeping copy centralised makes it easy to translate later (Shona / Ndebele).
 */

import { progressBar, formatResetDate, nextResetDate } from "./format";

// ─── Welcome / help ───────────────────────────────────────────────────────────

export const WELCOME_UNLINKED = `Hi! I'm *Pass* 📚 — your ZIMSEC study buddy on WhatsApp.

I can help you:
  • study A-Level and O-Level past exam papers, question by question
  • get AI explanations for any exam question or concept
  • generate a full ZIMSEC project report as a PDF
  • upgrade your plan to unlock more papers and AI replies

To get started:
  • Reply *signup* — create a new Pass account right here
  • Reply *signin* — log in to an existing account
  • Reply *link* — link using a code from the web or app`;

export const LINK_INSTRUCTIONS = `Great. Open Pass on the web or in the app, go to
*Settings → Connect WhatsApp* and you'll see a 6-digit code.
Send that code here.`;

export const LINK_CODE_WRONG = `That code is wrong or expired — generate a new one in
*Settings → Connect WhatsApp* and send it here.`;

export function welcomeLinked(name: string, plan: string, grade?: string | null): string {
  const planStr = plan.charAt(0) + plan.slice(1).toLowerCase();
  const gradeStr = grade ? ` • ${grade}` : "";
  return `✅ Linked to *${name}* (${planStr} plan${gradeStr}).

Try one of these:
  • _"study a Maths paper"_
  • _"generate a Biology project on photosynthesis"_
  • _"explain Pythagoras' theorem"_

Or just ask me anything.`;
}

export const HELP_MESSAGE = `*Pass — quick guide* 📚

1️⃣  *Study a past paper* — attempt questions one by one with AI feedback
2️⃣  *Generate an HBC project* — full ZIMSEC project report as PDF
3️⃣  *Ask a question* — AI explanations for any ZIMSEC topic
4️⃣  *Usage & limits* — see your plan and what's left this month
5️⃣  *Upgrade plan* — unlock more papers and AI replies
6️⃣  *Browse papers* — download any past-paper PDF

Reply a number or just type what you want.
Reply *cancel* at any time to exit the current flow.`;

// ─── Usage card ───────────────────────────────────────────────────────────────

export function usageCard(opts: {
  plan: string;
  papersUsed: number;
  papersLimit: number;
  projectsUsed: number;
  projectsLimit: number;
  aiUsed: number;
  aiLimit: number;
}): string {
  const now = new Date();
  const monthName = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const reset = formatResetDate(nextResetDate());
  const planStr = opts.plan.charAt(0) + opts.plan.slice(1).toLowerCase();

  const aiLimitStr = opts.aiLimit === Infinity ? "∞" : String(opts.aiLimit);
  const papersBar   = progressBar(opts.papersUsed,   opts.papersLimit);
  const projectsBar = progressBar(opts.projectsUsed, opts.projectsLimit);
  const aiBar       = opts.aiLimit === Infinity ? "▓▓▓▓▓▓▓▓▓▓" : progressBar(opts.aiUsed, opts.aiLimit);

  return `*This month (${monthName})*

Plan: *${planStr}*
Papers:    ${opts.papersUsed} / ${opts.papersLimit} used   ${papersBar}
Projects:  ${opts.projectsUsed} / ${opts.projectsLimit} used   ${projectsBar}
AI chats:  ${opts.aiUsed} / ${aiLimitStr}     ${aiBar}

Resets on ${reset}.
Need more? https://pass.co.zw/pricing`;
}

// ─── Quota walls ─────────────────────────────────────────────────────────────

export function papersQuotaMessage(plan: string, limit: number): string {
  const reset = formatResetDate(nextResetDate());
  return `You've used all *${limit} papers* on the ${plan} plan this month (resets on ${reset}).

Upgrade to:
  • *Study* — 12 papers + 7 projects / month
  • *Pass*  — 20 papers + 12 projects / month

Reply *UPGRADE* or visit https://pass.co.zw/pricing to choose a plan.

You can still chat with me for free 👋`;
}

export function projectsQuotaMessage(plan: string, limit: number): string {
  const reset = formatResetDate(nextResetDate());
  return `You've used all *${limit} projects* on the ${plan} plan this month (resets on ${reset}).

Upgrade to:
  • *Study* — 7 projects / month
  • *Pass*  — 12 projects / month

Reply *UPGRADE* or visit https://pass.co.zw/pricing to choose a plan.`;
}

export function aiQuotaMessage(plan: string, limit: number): string {
  const reset = formatResetDate(nextResetDate());
  return `You've used all *${limit} AI replies* on the ${plan} plan this month (resets on ${reset}).

Reply *UPGRADE* or visit https://pass.co.zw/pricing to keep chatting.`;
}

// ─── Usage footer (soft warning at ≥ 50 %) ───────────────────────────────────

export function aiUsageFooter(used: number, limit: number, plan: string): string | null {
  if (limit === Infinity) return null;
  if (used / limit < 0.5) return null;
  const planStr = plan.charAt(0) + plan.slice(1).toLowerCase();
  return `\n───\n_${planStr} plan: ${used} of ${limit} AI replies used this month._`;
}

// ─── Paper study ──────────────────────────────────────────────────────────────

export function diagramSkipMessage(questionNumber: number, marks: number, pdfPage?: number | null): string {
  const pageHint = pdfPage ? ` on page ${pdfPage} of the PDF` : "";
  return `*Question ${questionNumber}* (${marks} marks) — _⏭ Contains a diagram_

This question refers to a figure${pageHint}. To keep things fair on WhatsApp, I'm skipping it — its ${marks} marks won't count toward your final score.

Moving on…`;
}

export function paperIntroMessage(opts: {
  title: string;
  questionCount: number;
  totalMarks: number;
  diagramCount: number;
}): string {
  const diagramNote =
    opts.diagramCount > 0
      ? `\n_${opts.diagramCount} question${opts.diagramCount > 1 ? "s" : ""} contain diagrams — we'll skip those and adjust your final mark accordingly._`
      : "";

  return `*${opts.title}*
${opts.questionCount} questions • ${opts.totalMarks} marks${diagramNote}

Ready? Reply *start* when you've got the paper open.`;
}

export function completionMessage(opts: {
  title: string;
  earned: number;
  consideredMarks: number;
  totalMarks: number;
  percentage: number;
  skippedCount: number;
  skippedMarks: number;
  breakdown: Array<{ qn: number; score?: number; maxScore: number; hasDiagram: boolean; topic?: string | null }>;
}): string {
  const emoji = opts.percentage >= 70 ? "🎉" : opts.percentage >= 50 ? "👍" : "💪";
  const diagramNote =
    opts.skippedCount > 0
      ? `\n_Final mark recalculated to exclude ${opts.skippedCount} diagram question${opts.skippedCount > 1 ? "s" : ""} worth ${opts.skippedMarks} marks. Original paper total: ${opts.totalMarks}._`
      : "";

  const lines = opts.breakdown.map((b) => {
    if (b.hasDiagram) return `  • Q${b.qn}: skipped (diagram, ${b.maxScore} marks)`;
    return `  • Q${b.qn}: ${b.score ?? 0} / ${b.maxScore}`;
  });

  const answered = opts.breakdown.filter((b) => !b.hasDiagram && b.score !== undefined);
  const worst = answered.sort((a, b) => (a.score ?? 0) / a.maxScore - (b.score ?? 0) / b.maxScore)[0];
  const weakNote = worst
    ? `\n💡 *Weakest area:* Q${worst.qn}${worst.topic ? ` — ${worst.topic}` : ""}.`
    : "";

  return `${emoji} *Paper complete!*

*${opts.title}*
Your score: *${opts.earned} / ${opts.consideredMarks}*  (${opts.percentage} %)${diagramNote}

*Breakdown:*
${lines.join("\n")}${weakNote}
Want me to explain a question? Reply *explain 3* (or any question number).

Or pick another paper: reply *papers*.`;
}

// ─── Project (HBC) ───────────────────────────────────────────────────────────

export const PROJECT_ASK_NAME = `Let's create your ZIMSEC Heritage-Based Curriculum project! 📚

*What is your full name?* (as it appears on your exam registration)`;

export const PROJECT_ASK_SCHOOL = `What is the name of your *school*?`;

export const PROJECT_ASK_CENTRE_CANDIDATE = `Got it! Please send your exam centre number and candidate number.
e.g. _Centre: 1234, Candidate: 5678_`;

export const PROJECT_ASK_CENTRE = `What is your *exam centre number*? (e.g. _1234_)`;

export const PROJECT_ASK_CANDIDATE = `And your *candidate number*? (e.g. _5678_)`;

export const PROJECT_ASK_GRADE = `Which grade are you in?

1️⃣  Grade 7
2️⃣  Form 4 (O-Level)
3️⃣  Form 6 (A-Level)

Reply a number or type the grade.`;

export const PROJECT_ASK_CATEGORY = `Choose a project category:

1️⃣  Culture & History — totems, liberation struggle, customs, languages
2️⃣  Indigenous Sciences — traditional medicine, farming, energy systems
3️⃣  Arts & Lifestyle — music, architecture, food, traditional games

Reply a number or type the category name.`;

export function projectConfirmMessage(slots: {
  studentName: string;
  schoolName: string;
  centreNumber: string;
  candidateNumber: string;
  grade: string;
  subject: string;
  category: string;
}): string {
  return `*Generating your HBC project…*

📋 *${slots.studentName}*${slots.schoolName ? `\nSchool: ${slots.schoolName}` : ""}
Centre: ${slots.centreNumber} · Candidate: ${slots.candidateNumber}
Grade: ${slots.grade} · Subject: ${slots.subject}
Category: ${slots.category}

🧠 _Choosing an authentic topic and writing all sections — this takes 30–60 seconds…_`;
}

export function projectDoneMessage(subject: string, topic: string, pages: number): string {
  return `✅ *Project complete!*

*${topic}*
${subject} · ${pages}-page formal HBC report

Includes: cover page, introduction, methodology, data presentation & analysis, recommendations & conclusion, and references. Review before submitting.`;
}

export function projectFallbackMessage(projectId: string): string {
  return `✅ Your project is saved — view it at https://pass.co.zw/projects/${projectId}

_(Could not attach the PDF right now, but the full text is in your Pass account.)_`;
}

// ─── Quota exhausted (hard limit — no further AI calls) ──────────────────────

export const AI_QUOTA_EXHAUSTED = `You've used all your AI messages for this month.

Upgrade to get more: reply *UPGRADE* or visit https://pass.co.zw/pricing

You can still use:
  • \`UPGRADE\` — upgrade your plan
  • \`HELP\`    — see the menu`;

// ─── Errors / misc ────────────────────────────────────────────────────────────

export const AI_ERROR         = `I'm having trouble thinking right now — try again in a minute 🙏`;
export const MEDIA_ONLY       = `I can only read text for now — could you type that out?`;
export const RATE_LIMIT       = `You're going faster than I can think 😅 — give me a moment.`;
export const PAPER_FILE_MISSING = `📄 _The PDF for this paper isn't uploaded yet — but you can still study it question by question below._`;
export const CANCEL_OK        = `Got it — cancelled. What would you like to do next? Reply *help* for options.`;
export const UNCLEAR          = `I'm not sure what you mean. Try _"study a paper"_, _"generate a project"_, or just ask me a question.`;
