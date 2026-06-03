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

/**
 * Context-aware "you need an account" nudges for unlinked users.
 * Shown instead of the generic welcome when the user's message already
 * reveals what feature they want to use.
 */
export function unlinkedFeatureNudge(
  feature: "papers" | "project" | "ai_chat" | "upgrade",
): string {
  switch (feature) {
    case "papers":
      return `📚 You need a free *Pass* account to study past papers.

Reply *signup* to create one — it only takes 2 minutes and it's free.
Or reply *signin* if you already have an account.`;

    case "project":
      return `📝 You need a free *Pass* account to generate ZIMSEC HBC projects.

Reply *signup* to create one, or *signin* to log into your existing account.`;

    case "ai_chat":
      return `🤖 You need a free *Pass* account to get AI explanations.

Reply *signup* to create one in 2 minutes — no credit card needed.
Or reply *signin* if you already have an account.`;

    case "upgrade":
      return `💳 You need a *Pass* account before you can upgrade.

Reply *signup* to create a free account first, or *signin* to log in.`;
  }
}

export const LINK_INSTRUCTIONS = `Great. Open Pass on the web or in the app, go to
*Settings → Connect WhatsApp* and you'll see a 6-digit code.
Send that code here.`;

// ─── Paper browse setup messages ─────────────────────────────────────────────

export function paperBrowseAskGrade(grades: string[]): string {
  const list = grades.map((g, i) => `*${i + 1}.* ${g}`).join("\n");
  return `📚 *What level are you looking for?*\n\n${list}\n\nReply a number or type the level.`;
}

export function paperBrowseAskSubject(grade: string, subjects: string[]): string {
  const list = subjects.map((s, i) => `*${i + 1}.* ${s}`).join("\n");
  return `📚 *${grade} papers — what subject?*\n\n${list}\n\nReply a number or type the subject.\nReply *back* to change level.`;
}

export function paperBrowseNoSubjects(grade: string): string {
  return `We don't have any ${grade} papers yet 😕\n\nReply *papers* to browse other levels.`;
}

export function paperBrowseNoGradeMatch(input: string): string {
  return `I don't recognise "${input}" as a level. Please reply with a number from the list, or type the level name (e.g. O-Level, A-Level, Grade 7).`;
}

export function paperBrowseNoSubjectMatch(input: string, grade: string): string {
  return `I don't see "${input}" in the ${grade} subjects list. Please reply with a number from the list, or type the subject name.`;
}

export const LINK_CODE_WRONG = `That code is wrong or expired — generate a new one in
*Settings → Connect WhatsApp* and send it here.`;

export function welcomeLinked(name: string, plan: string, grade?: string | null, isAmbassador?: boolean): string {
  const planStr = plan.charAt(0) + plan.slice(1).toLowerCase();
  const gradeStr = grade ? ` • ${grade}` : "";
  const ambassadorSuffix = isAmbassador
    ? `\n\n🌟 *AMBASSADOR* — Thank you for representing Pass. You have 1 000 of every resource this month.`
    : "";
  return `✅ Linked to *${name}* (${planStr} plan${gradeStr}).

Try one of these:
  • _"study a Maths paper"_
  • _"generate a Biology project on photosynthesis"_
  • _"explain Pythagoras' theorem"_

Or just ask me anything.${ambassadorSuffix}`;
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
  downloadsUsed: number;
  downloadsLimit: number;
  isAmbassador?: boolean;
}): string {
  const now = new Date();
  const monthName = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const reset = formatResetDate(nextResetDate());
  const planStr = opts.plan.charAt(0) + opts.plan.slice(1).toLowerCase();

  const aiLimitStr  = opts.aiLimit       === Infinity ? "∞" : String(opts.aiLimit);
  const dlLimitStr  = opts.downloadsLimit === Infinity ? "∞" : String(opts.downloadsLimit);
  const papersBar   = progressBar(opts.papersUsed,    opts.papersLimit);
  const projectsBar = progressBar(opts.projectsUsed,  opts.projectsLimit);
  const aiBar       = opts.aiLimit       === Infinity ? "▓▓▓▓▓▓▓▓▓▓" : progressBar(opts.aiUsed,       opts.aiLimit);
  const dlBar       = opts.downloadsLimit === Infinity ? "▓▓▓▓▓▓▓▓▓▓" : progressBar(opts.downloadsUsed, opts.downloadsLimit);

  const ambassadorLine = opts.isAmbassador ? `\n🌟 *AMBASSADOR* — 1 000 of every resource/month` : "";
  return `*This month (${monthName})*

Plan: *${planStr}*
Papers:     ${opts.papersUsed} / ${opts.papersLimit} used   ${papersBar}
Projects:   ${opts.projectsUsed} / ${opts.projectsLimit} used   ${projectsBar}
Downloads:  ${opts.downloadsUsed} / ${dlLimitStr} used   ${dlBar}
AI chats:   ${opts.aiUsed} / ${aiLimitStr}     ${aiBar}

Resets on ${reset}.
Need more? https://pass.co.zw/pricing${ambassadorLine}`;
}

// ─── Quota walls ─────────────────────────────────────────────────────────────

/** Returns upgrade info for the next tier, or null if already on the top plan. */
function nextPlan(plan: string): {
  name: string; price: string;
  papers: string; projects: string; ai: string; downloads: string;
} | null {
  switch (plan.toUpperCase()) {
    case "FREE":
      return { name: "Study", price: "$4.99/month", papers: "12", projects: "7", ai: "500", downloads: "50" };
    case "STUDY":
      return { name: "Pass", price: "$7.99/month", papers: "20", projects: "12", ai: "unlimited", downloads: "unlimited" };
    default:
      return null; // Already on PASS — top plan
  }
}

export function papersQuotaMessage(plan: string, limit: number): string {
  const reset = formatResetDate(nextResetDate());
  const up = nextPlan(plan);
  if (!up) {
    return `📚 You've used all *${limit} papers* this month — you're already on our top *Pass* plan!\n\nYour quota resets on *${reset}*. Hang tight! 💪`;
  }
  return `📚 You've used all *${limit} papers* this month.

Upgrade to the *${up.name} plan* for just *${up.price}* and get *${up.papers} papers* per month.

Reply *UPGRADE* to upgrade now.`;
}

export function projectsQuotaMessage(plan: string, limit: number): string {
  const reset = formatResetDate(nextResetDate());
  const up = nextPlan(plan);
  if (!up) {
    return `📝 You've used all *${limit} projects* this month — you're already on our top *Pass* plan!\n\nYour quota resets on *${reset}*. Hang tight! 💪`;
  }
  return `📝 You've used all *${limit} projects* this month.

Upgrade to the *${up.name} plan* for just *${up.price}* and get *${up.projects} projects* per month.

Reply *UPGRADE* to upgrade now.`;
}

export function aiQuotaMessage(plan: string, limit: number): string {
  const reset = formatResetDate(nextResetDate());
  const up = nextPlan(plan);
  if (!up) {
    return `🤖 You've used all *${limit} AI replies* this month — you're already on our top *Pass* plan!\n\nYour quota resets on *${reset}*. Hang tight! 💪`;
  }
  return `🤖 You've used all *${limit} AI replies* this month.

Upgrade to the *${up.name} plan* for just *${up.price}* and get *${up.ai} AI replies* per month.

Reply *UPGRADE* to upgrade now.`;
}

export function downloadsQuotaMessage(plan: string, limit: number): string {
  const reset = formatResetDate(nextResetDate());
  const up = nextPlan(plan);
  if (!up) {
    return `📥 You've used all *${limit} downloads* this month — you're already on our top *Pass* plan!\n\nYour quota resets on *${reset}*. Hang tight! 💪`;
  }
  return `📥 You've used all *${limit} downloads* this month.

Upgrade to the *${up.name} plan* for just *${up.price}* and get *${up.downloads} downloads* per month.

Reply *UPGRADE* to upgrade now.`;
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
e.g. _Centre: 1234, Candidate: 5678_

Not registered yet? Reply *leave blank* — we'll use a placeholder and you can fill in the real numbers later.`;

export const PROJECT_ASK_CENTRE = `What is your *exam centre number*? (e.g. _1234_)

Not registered yet? Reply *leave blank*.`;

export const PROJECT_ASK_CANDIDATE = `And your *candidate number*? (e.g. _5678_)

Not registered yet? Reply *leave blank*.`;

export const PROJECT_NUMBER_BLANK_REMINDER = `_(Placeholder saved. Before you submit your project to school, update your centre and candidate numbers at pass.co.zw/projects — or ask your teacher once you receive them.)_`;

export const PROJECT_ASK_GRADE = `Which grade are you in?

1️⃣  Grade 7
2️⃣  Form 4 (O-Level)
3️⃣  Form 6 (A-Level)

Reply a number or type the grade.`;

export const PROJECT_ASK_SUBJECT = `Which subject is this project for? (e.g. *Biology*, *Combined Science*, *History*)

Just type the subject name.`;

export const PROJECT_ASK_TITLE = `Do you already have a topic for your project? ✏️

Type your topic below (e.g. _"The role of traditional medicine in rural healthcare"_), or reply *next* and Pass will choose one for you.`;

export const PROJECT_ASK_OUTLINE = `📋 *Project Outline (optional)*

Do you have a project outline, teacher guide, or any specific requirements for this project?

If yes, *type or paste it here* and Pass will follow it strictly.
Reply *skip* to let Pass structure the project freely.`;

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

/** Caption sent with a sample (example) project. Identity is already stripped. */
export function projectSampleCaption(subject: string, topic: string, pages: number): string {
  return `📄 *Sample project* — here's what a finished ${subject} project looks like.

*${topic}*
${pages}-page formal report. Student details have been removed.

This is just an example. Reply *project* whenever you're ready to make your own. ✍️`;
}

/** Shown when no past project is available to use as a sample. */
export const PROJECT_NO_SAMPLE = `I don't have a sample to show right now — but I can put together a fresh project for you. Reply *project* to start. ✍️`;

// ─── Quota exhausted (hard limit — no further AI calls) ──────────────────────

export const AI_QUOTA_EXHAUSTED = `🤖 You've used all your AI replies this month.

Upgrade to the *Study plan* for just *$4.99/month* and get 500 AI replies per month.

Reply *UPGRADE* to upgrade now.`;

// ─── Errors / misc ────────────────────────────────────────────────────────────

export const AI_ERROR         = `I'm having trouble thinking right now — try again in a minute 🙏`;
export const MEDIA_ONLY       = `I can only read text for now — could you type that out?`;
export const RATE_LIMIT       = `You're going faster than I can think 😅 — give me a moment.`;
export const PAPER_FILE_MISSING = `📄 _The PDF for this paper isn't uploaded yet — but you can still study it question by question below._`;
export const CANCEL_OK        = `Got it — cancelled ✅\n\n${HELP_MESSAGE}`;

/** Shown when we auto-cancel the current flow because the user clearly wants something else. */
export const FLOW_SWITCH_NOTE = `👍 No problem — switching you over. Anything you'd started is saved.`;

/** Study-specific note when leaving a paper to do something else. */
export const STUDY_SWITCH_NOTE = `👍 Leaving this paper — your answers so far are saved. Switching you over…`;

/** Escape menu when a mid-study message isn't an answer but isn't a clear other intent either. */
export function studyEscapeMenu(questionNumber: number): string {
  return `That didn't look like an answer to *Q${questionNumber}*. Reply *next* to skip, *cancel* to leave this paper, or send your answer to keep going.`;
}
export const WHAT_NEXT        = `✅ All done! What would you like to do next?\n\n${HELP_MESSAGE}`;
export const LOGOUT_OK        = `You've been logged out 👋 Your WhatsApp number is now unlinked from your Pass account.\n\nReply *signin* to log back in, or *signup* to create a new account.`;
export const UNCLEAR          = `I'm not sure what you mean. Try _"study a paper"_, _"generate a project"_, or just ask me a question.`;
