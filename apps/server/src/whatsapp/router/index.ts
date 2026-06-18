/**
 * Central message dispatcher.
 * Called once per inbound message (after mutex serialisation).
 *
 * Quota check happens early so we know whether to use NLP (full mode)
 * or regex-only pattern matching (rigid mode when quota exhausted).
 */

import type { Message, Client } from "whatsapp-web.js";
import prisma from "@pass/db";
import type { ConversationState } from "../types";
import { loadState, saveState, unlinkUser } from "../state/repo";
import { getLinkedUser } from "../middleware/ensureLinked";
import { matchHardIntent } from "./hardIntents";
import { sendWelcomeUnlinked, sendHelp, sendUsageCard } from "../flows/welcome";
import { startLinking, tryConsumeCode } from "../flows/linking";
import { startSignup, handleSignupReply, startSignin, handleSigninReply } from "../flows/auth";
import { showPapers, startPaperBrowse, handlePaperBrowseSetup, setPaperListCache, getPaperFromCache, matchItem, getAvailableGrades, getAvailableSubjects } from "../flows/paperBrowse";
import { startPaper, poseNextQuestion, gradeStudentAnswer, explainQuestion } from "../flows/paperStudy";
import { startProjectBrief, handleProjectBriefReply, repromptProjectBrief } from "../flows/projectBrief";
import { generateProject } from "../flows/projectGenerate";
import { sendSampleProject } from "../flows/sendSampleProject";
import { sendProjectPdf } from "../media/sendProject";
import { sendPaperPdf } from "../media/sendPaper";
import { handleAiChat } from "../flows/aiChat";
import { handleMediaMessage } from "../flows/mediaAnalysis";
import { startUpgrade, handleUpgradeReply } from "../flows/upgrade";
import { routeWithNL, type NlAction } from "../flows/nlRouter";
import { detectFlowSwitch } from "./interrupt";
import { getAiMessageUsage, checkProjectsQuota } from "../../lib/aiQuota";
import {
  CANCEL_OK,
  LOGOUT_OK,
  WELCOME_UNLINKED,
  RATE_LIMIT,
  WHAT_NEXT,
  unlinkedFeatureNudge,
  projectsQuotaMessage,
  aiQuotaMessage,
  downloadsQuotaMessage,
  PROJECT_NO_SAMPLE,
  FLOW_SWITCH_NOTE,
  STUDY_SWITCH_NOTE,
  studyEscapeMenu,
  projectReviewMessage,
  PROJECT_CONFIRM_PROMPT,
  PROJECT_CONFIRM_RETRY,
} from "../utils/messages";

const RATE_WINDOW_MS   = 60_000;
const RATE_MAX_PER_MIN = 30;

// ── Unlinked feature hint detector ───────────────────────────────────────────
// Pure regex — no AI call — so it works even before a user has signed up.
// Returns the feature the user appears to want, or null for ambiguous messages.

type UnlinkedFeatureHint = "papers" | "project" | "ai_chat" | "upgrade";

function detectUnlinkedFeatureHint(text: string): UnlinkedFeatureHint | null {
  const t = text.toLowerCase();

  // Upgrade / payment intent (check before papers — "pay for papers" → upgrade)
  if (/\b(upgrade|pay|subscri|premium|ecocash|onemoney|pricing|buy\s+(plan|pass|study))\b/.test(t))
    return "upgrade";

  // Project intent
  if (/\b(project|hbc|heritage[\s-]based|assignment|school\s+report)\b/.test(t))
    return "project";

  // Paper / study intent — subjects, grades, or explicit paper keywords
  if (
    /\b(paper|study|exam|past|practis|practice|attempt|o[\s-]?level|a[\s-]?level|form\s*[1-6]|grade\s*[1-9]|zimsec|maths?|mathematics|physics|chemistry|biology|geography|history|commerce|economics|accounting|agriculture|english\s+language|literature|shona|ndebele|sociology|computer\s+science|combined\s+science|heritage\s+studies|food\s+(and\s+)?nutrition|religious|questions?)\b/.test(t)
  )
    return "papers";

  // General question / AI chat intent
  if (
    /\b(explain|how|what|why|when|where|define|meaning|understand|difference|describe|tell\s+me|teach|help\s+me)\b/.test(t) ||
    /\?/.test(t)
  )
    return "ai_chat";

  return null;
}

/**
 * Perform a routed NL action. Used by the idle fallthrough AND by mid-flow
 * interrupts (so "I'd rather do X" mid-flow behaves exactly like asking for X
 * from idle). Returns the new conversation state; the caller persists it.
 */
async function dispatchNlAction(
  client: Client,
  msg: Message,
  whatsappId: string,
  userId: string,
  action: NlAction,
  state: ConversationState,
): Promise<ConversationState> {
  dbg("dispatchNlAction", action.kind);
  switch (action.kind) {
    case "study_paper": {
      // If the NL router extracted subject + grade, go straight to the list.
      // Otherwise start the interactive grade→subject setup (or subject-only step).
      const { newState, paperIds } = await startPaperBrowse(msg, state, {
        subject: action.subject,
        grade: action.grade,
      });
      setPaperListCache(whatsappId, paperIds);
      return newState;
    }
    case "generate_project": {
      const pqc = await checkProjectsQuota(userId);
      if (!pqc.allowed) {
        await msg.reply(projectsQuotaMessage(pqc.plan, pqc.limit));
        return state;
      }
      return await startProjectBrief(msg, state, action);
    }
    case "sample_project": {
      const sent = await sendSampleProject(client, whatsappId, { subject: action.subject, grade: action.grade });
      await msg.reply(sent ? WHAT_NEXT : PROJECT_NO_SAMPLE);
      return state;
    }
    case "show_usage": {
      await sendUsageCard(msg, userId);
      return state;
    }
    case "upgrade_plan": {
      return await startUpgrade(msg, state);
    }
    case "answer_question":
    default: {
      const quota = await getAiMessageUsage(userId);
      if (!quota.allowed) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
        await msg.reply(aiQuotaMessage(user?.plan ?? "FREE", quota.limit));
        return state;
      }
      const question = action.kind === "answer_question" ? action.question : (msg.body ?? "");
      return await handleAiChat(msg, question, userId, state);
    }
  }
}

const DEV = process.env.NODE_ENV === "development";
const dbg = (...args: unknown[]) => { if (DEV) console.log("[wa:dbg]", ...args); };

export async function handleMessage(client: Client, msg: Message): Promise<void> {
  console.log("[whatsapp] Handling message...");

  // Only process direct 1-on-1 chat messages.
  // Silently drop everything else: groups, broadcasts, status updates, channels.
  const from = msg.from ?? "";
  if (
    from.endsWith("@g.us")            || // WhatsApp groups
    from.endsWith("@broadcast")        || // Broadcast lists / status
    from.endsWith("@newsletter")       || // WhatsApp channels
    from.endsWith("@lid")              || // Linked Device contacts (msg.getChat() is unsupported)
    from === "status@broadcast"        || // Status updates
    msg.isStatus                       || // Status flag
    msg.broadcast                         // Broadcast flag
  ) { dbg("dropped — not a 1-on-1 message", { from, isStatus: msg.isStatus }); return; }

  const whatsappId = msg.from;
  const text = (msg.body ?? "").trim();

  if (!msg.hasMedia && !text) { dbg("dropped — empty body, no media"); return; }

  dbg("loadState start", whatsappId);
  let state = await loadState(whatsappId);
  dbg("loadState done", { mode: state.mode.kind });

  // Rate limiting (per-minute)
  const now = Date.now();
  const windowStart = new Date(state.lastMessageAt).getTime();
  if (now - windowStart < RATE_WINDOW_MS) {
    state.messageCountThisMinute = (state.messageCountThisMinute ?? 0) + 1;
  } else {
    state.messageCountThisMinute = 1;
  }
  if (state.messageCountThisMinute > RATE_MAX_PER_MIN) {
    dbg("rate limit hit", state.messageCountThisMinute);
    await msg.reply(RATE_LIMIT);
    await saveState(whatsappId, state);
    return;
  }

  const hard = matchHardIntent(text, state.mode);
  dbg("hardIntent", hard.kind, { text });

  // ── Global hard intents (always free, no AI, no quota check) ─────────────

  if (hard.kind === "help") {
    dbg("→ help");
    state = { ...state, mode: { kind: "idle" } };
    await sendHelp(msg);
    await saveState(whatsappId, state);
    return;
  }

  if (hard.kind === "cancel") {
    dbg("→ cancel");
    state = { ...state, mode: { kind: "idle" } };
    await msg.reply(CANCEL_OK);
    await saveState(whatsappId, state);
    return;
  }

  // ── Logout: unlink account then show welcome ───────────────────────────────
  if (hard.kind === "logout") {
    dbg("→ logout");
    await unlinkUser(whatsappId);
    await msg.reply(LOGOUT_OK);
    await msg.reply(WELCOME_UNLINKED);
    return;
  }

  // ── Sample project: works for everyone (no account / no AI / no quota) ──────
  if (hard.kind === "sample") {
    dbg("→ sample");
    if (state.mode.kind === "project_brief") {
      const { subject, grade } = state.mode.collected;
      const sent = await sendSampleProject(client, whatsappId, { subject, grade });
      if (!sent) await msg.reply(PROJECT_NO_SAMPLE);
      state = await repromptProjectBrief(msg, state);
      await saveState(whatsappId, state);
      return;
    }
    const sent = await sendSampleProject(client, whatsappId);
    await msg.reply(sent ? WHAT_NEXT : PROJECT_NO_SAMPLE);
    await saveState(whatsappId, state);
    return;
  }

  // ── Unlinked path ─────────────────────────────────────────────────────────

  dbg("getLinkedUser start", whatsappId);
  const userId = await getLinkedUser(whatsappId);
  dbg("getLinkedUser done", { userId: userId ?? "null (unlinked)" });

  if (!userId) {
    dbg("unlinked path", { hardKind: hard.kind, modeKind: state.mode.kind });

    // WhatsApp-native signup flow
    if (hard.kind === "signup" || state.mode.kind === "signing_up") {
      dbg("→ signup");
      state = state.mode.kind === "signing_up"
        ? await handleSignupReply(msg, text, whatsappId, state)
        : await startSignup(msg, state);
      await saveState(whatsappId, state);
      return;
    }

    // WhatsApp-native signin flow
    if (hard.kind === "signin" || state.mode.kind === "signing_in") {
      dbg("→ signin");
      state = state.mode.kind === "signing_in"
        ? await handleSigninReply(msg, text, whatsappId, state)
        : await startSignin(msg, state);
      await saveState(whatsappId, state);
      return;
    }

    if (hard.kind === "link_code" && hard.code) {
      dbg("→ link_code");
      const { newState } = await tryConsumeCode(msg, hard.code, whatsappId, state);
      await saveState(whatsappId, newState);
      return;
    }

    if (hard.kind === "link" || state.mode.kind === "linking") {
      dbg("→ link");
      if (state.mode.kind === "linking" && hard.kind === "link_code" && hard.code) {
        const { newState } = await tryConsumeCode(msg, hard.code, whatsappId, state);
        await saveState(whatsappId, newState);
        return;
      }
      state = await startLinking(msg, state);
      await saveState(whatsappId, state);
      return;
    }

    // Greetings from new users: immediately begin signup.
    if (hard.kind === "greeting") {
      dbg("→ startSignup (greeting, unlinked)");
      state = await startSignup(msg, state);
      dbg("startSignup done");
      await saveState(whatsappId, state);
      return;
    }

    // Context-aware nudge
    const featureHint = detectUnlinkedFeatureHint(text);
    dbg("featureHint", featureHint);
    if (featureHint) {
      await msg.reply(unlinkedFeatureNudge(featureHint));
    } else {
      await sendWelcomeUnlinked(msg);
    }
    await saveState(whatsappId, state);
    return;
  }

  dbg("linked path", { userId, modeKind: state.mode.kind, hardKind: hard.kind });

  // ── Media messages (images / PDFs) — handle before text routing ─────────────
  if (msg.hasMedia) {
    dbg("→ handleMediaMessage");
    state = await handleMediaMessage(msg, userId, state);
    dbg("handleMediaMessage done");
    state.lastMessageAt = new Date().toISOString();
    await saveState(whatsappId, state);
    return;
  }

  // Each feature enforces its own AI-message quota at call-time (see
  // dispatchNlAction and gradeStudentAnswer) — there is no blanket wall here.

  if (hard.kind === "greeting") {
    dbg("→ sendHelp (greeting, linked)");
    state = { ...state, mode: { kind: "idle" } };
    await sendHelp(msg);
    await saveState(whatsappId, state);
    return;
  }

  if (hard.kind === "usage") {
    dbg("→ sendUsageCard");
    await sendUsageCard(msg, userId);
    await saveState(whatsappId, state);
    return;
  }

  if (hard.kind === "link") {
    dbg("→ already linked reply");
    await msg.reply("Your account is already linked 👍\nReply *usage* to see your plan, or just ask me anything.");
    await saveState(whatsappId, state);
    return;
  }

  if (hard.kind === "upgrade") {
    dbg("→ startUpgrade");
    state = await startUpgrade(msg, state);
    await saveState(whatsappId, state);
    return;
  }

  if (hard.kind === "project") {
    dbg("→ startProjectBrief (hard)");
    state = await startProjectBrief(msg, state);
    await saveState(whatsappId, state);
    return;
  }

  // ── PDF resend: user asks for their last project as a PDF ─────────────────
  if (hard.kind === "send_pdf") {
    const lastProject = await prisma.project.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    if (!lastProject || !lastProject.content) {
      await msg.reply("You don't have any projects yet. Send *project* to generate one 📝");
    } else {
      await msg.reply(`Sending your latest project as PDF: *${lastProject.topic}* ⏳`);
      await sendProjectPdf(client, whatsappId, lastProject);
    }
    await saveState(whatsappId, state);
    return;
  }

  // ── Session history: list last 5 completed sessions ───────────────────────
  if (hard.kind === "history") {
    const sessions = await prisma.paperSession.findMany({
      where: { userId, completedAt: { not: null } },
      include: { resource: true, questionAttempts: true },
      orderBy: { completedAt: "desc" },
      take: 5,
    });
    if (sessions.length === 0) {
      await msg.reply("You haven't completed any study sessions yet.\n\nReply *papers* to start studying 📚");
    } else {
      const lines = sessions.map((s, i) => {
        const date = s.completedAt ? new Date(s.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "?";
        return `${i + 1}. *${s.resource.title}*\n   ${date} · ${s.questionsAnswered} q answered`;
      });
      await msg.reply(`📋 *Your last ${sessions.length} session${sessions.length !== 1 ? "s" : ""}:*\n\n${lines.join("\n\n")}\n\nReply *papers* to study again.`);
    }
    await saveState(whatsappId, state);
    return;
  }

  // ── Global mid-flow interrupt ──────────────────────────────────────────────
  dbg("interrupt check", { modeKind: state.mode.kind });
  // If the user clearly wants a different feature partway through a flow, cancel
  // the flow and switch — no need to type "cancel". paper_study is handled in its
  // own block below (the grader decides whether a message is an answer). Raw-data
  // steps (project outline, passwords) honour only anchored keyword switches.
  {
    const m = state.mode;
    const isInterruptibleFlow =
      m.kind === "signing_up" || m.kind === "signing_in" || m.kind === "upgrading" ||
      m.kind === "browsing_papers" || m.kind === "paper_browse_setup" ||
      m.kind === "paper_action_choice" || m.kind === "project_brief" ||
      m.kind === "project_confirm" ||
      // While awaiting an answer the grader decides (answers can look command-ish);
      // between questions a clear switch is handled here.
      (m.kind === "paper_study" && !m.awaitingAnswer);
    if (isInterruptibleFlow) {
      const isRawDataStep =
        (m.kind === "project_brief" && m.awaiting === "outline") ||
        (m.kind === "signing_up" && m.step === "password") ||
        (m.kind === "signing_in" && m.step === "password");
      const switchAction = await detectFlowSwitch(text, m, hard, !isRawDataStep);
      if (switchAction) {
        state = { ...state, mode: { kind: "idle" } };
        await msg.reply(FLOW_SWITCH_NOTE);
        state = await dispatchNlAction(client, msg, whatsappId, userId, switchAction, state);
        await saveState(whatsappId, state);
        return;
      }
    }
  }

  // ── Mode-specific routing ─────────────────────────────────────────────────

  // A user can complete signup/signin and become "linked" while the state machine
  // is still mid-flow (e.g. awaiting a referral code after password is set).
  // Without these guards the messages fall through to NL/AI routing and produce
  // an empty reply because the AI has nothing useful to say.
  if (state.mode.kind === "signing_up") {
    state = await handleSignupReply(msg, text, whatsappId, state);
    await saveState(whatsappId, state);
    return;
  }

  if (state.mode.kind === "signing_in") {
    state = await handleSigninReply(msg, text, whatsappId, state);
    await saveState(whatsappId, state);
    return;
  }

  if (state.mode.kind === "upgrading") {
    state = await handleUpgradeReply(client, msg, text, whatsappId, userId, state);
    await saveState(whatsappId, state);
    return;
  }

  if (state.mode.kind === "paper_study") {
    const s = state.mode;

    if (hard.kind === "start" && s.questionNumber === 0) {
      state = await poseNextQuestion(msg, state, 1);
      await saveState(whatsappId, state);
      return;
    }

    if (hard.kind === "explain" || (hard.kind === "none" && /^explain\b/i.test(text))) {
      await explainQuestion(msg, hard.explainQn ?? 0, userId, state);
      await saveState(whatsappId, state);
      return;
    }

    if (hard.kind === "next" && !s.awaitingAnswer) {
      state = await poseNextQuestion(msg, state);
      await saveState(whatsappId, state);
      return;
    }

    if (s.awaitingAnswer) {
      const { state: graded, offTopic } = await gradeStudentAnswer(msg, text, userId, state);
      if (offTopic) {
        // The message wasn't an answer. Figure out what they actually want.
        const action = await routeWithNL(text);
        if (action.kind !== "answer_question") {
          // Clear, concrete intent → leave the paper and switch.
          await msg.reply(STUDY_SWITCH_NOTE);
          const next = await dispatchNlAction(client, msg, whatsappId, userId, action, { ...graded, mode: { kind: "idle" } });
          await saveState(whatsappId, next);
          return;
        }
        // Ambiguous → offer a clear exit, but keep them in the paper.
        await msg.reply(studyEscapeMenu(s.questionNumber));
        await saveState(whatsappId, graded);
        return;
      }
      state = graded;
      await saveState(whatsappId, state);
      return;
    }

    await msg.reply(`Reply with your answer, *next* to move on, *explain* for help, or *cancel* to exit.`);
    await saveState(whatsappId, state);
    return;
  }

  // paper_browse_setup: interactive grade → subject picker
  if (state.mode.kind === "paper_browse_setup") {
    const { newState, paperIds } = await handlePaperBrowseSetup(msg, text, state);
    setPaperListCache(whatsappId, paperIds);
    await saveState(whatsappId, newState);
    return;
  }

  if (state.mode.kind === "browsing_papers") {
    // download_paper: "download 2", "send 3" — send the PDF file directly
    if (hard.kind === "download_paper" && hard.n !== undefined) {
      const paperId = getPaperFromCache(whatsappId, hard.n);
      if (!paperId) {
        await msg.reply(`I couldn't find paper #${hard.n}. Reply *papers* to see the list again.`);
        await saveState(whatsappId, state);
        return;
      }
      const resource = await prisma.resource.findUnique({ where: { id: paperId } });
      if (!resource) {
        await msg.reply("That paper isn't available. Try another.");
        await saveState(whatsappId, state);
        return;
      }
      await msg.reply(`⏳ Sending *${resource.title}* as a PDF…`);
      const result = await sendPaperPdf(client, whatsappId, resource, userId);
      if (typeof result === "object" && result.kind === "quota_exceeded") {
        await msg.reply(downloadsQuotaMessage(result.plan, result.limit));
      } else if (result === "no_file") {
        await msg.reply(`📄 The PDF for this paper isn't available for download, but you can study it question-by-question.\n\nReply *${hard.n}* to start studying it.`);
      } else {
        // Successful download — clear context so the next message is fresh.
        state = { ...state, mode: { kind: "idle" } };
        await msg.reply(WHAT_NEXT);
      }
      await saveState(whatsappId, state);
      return;
    }

    if (hard.kind === "number_select" && hard.n !== undefined) {
      const paperId = getPaperFromCache(whatsappId, hard.n);
      if (!paperId) {
        await msg.reply(`I couldn't find paper #${hard.n}. Try a different number or reply *papers* to see the list again.`);
        await saveState(whatsappId, state);
        return;
      }
      const resource = await prisma.resource.findUnique({ where: { id: paperId } });
      if (!resource) {
        await msg.reply("That paper isn't available. Try another.");
        await saveState(whatsappId, state);
        return;
      }
      // Ask study or download
      await msg.reply(
        `📄 *${resource.title}* (${resource.year})\n${resource.grade} · ${resource.subject}\n\n` +
        `What would you like to do?\n\n` +
        `*1.* Study — question by question with AI feedback\n` +
        `*2.* Download — get the full PDF sent to you`,
      );
      state = { ...state, mode: { kind: "paper_action_choice", paperId: resource.id, paperTitle: resource.title } };
      await saveState(whatsappId, state);
      return;
    }

    if (hard.kind === "more") {
      const s = state.mode;
      const { newState, paperIds } = await showPapers(msg, s.filter, s.page + 1, state);
      setPaperListCache(whatsappId, paperIds);
      await saveState(whatsappId, newState);
      return;
    }
  }

  // ── Paper action choice: study or download ────────────────────────────────
  if (state.mode.kind === "paper_action_choice") {
    const { paperId } = state.mode;
    const resource = await prisma.resource.findUnique({ where: { id: paperId } });
    if (!resource) {
      await msg.reply("Sorry, that paper is no longer available. Reply *papers* to browse again.");
      state = { ...state, mode: { kind: "idle" } };
      await saveState(whatsappId, state);
      return;
    }

    const t = text.toLowerCase().trim();
    const wantsStudy   = t === "1" || /^stud/i.test(t);
    const wantsDownload = t === "2" || /^(down|send|get|pdf)/i.test(t);

    if (wantsStudy) {
      state = await startPaper(client, msg, resource, userId, state);
      await saveState(whatsappId, state);
      return;
    }

    if (wantsDownload) {
      await msg.reply(`⏳ Sending *${resource.title}* as a PDF…`);
      const result = await sendPaperPdf(client, whatsappId, resource, userId);
      if (typeof result === "object" && result.kind === "quota_exceeded") {
        await msg.reply(downloadsQuotaMessage(result.plan, result.limit));
      } else if (result === "no_file") {
        await msg.reply(`📄 The PDF for this paper isn't available for download. You can study it instead — reply *1* to start.`);
      } else {
        // Successful download — clear context so the next message starts fresh.
        state = { ...state, mode: { kind: "idle" } };
        await msg.reply(WHAT_NEXT);
      }
      await saveState(whatsappId, state);
      return;
    }

    await msg.reply("Reply *1* to study this paper or *2* to download the PDF.");
    await saveState(whatsappId, state);
    return;
  }

  // ── browsing_papers free-text fallback ────────────────────────────────────
  // When the user types something that isn't a number/command while browsing
  // (e.g. "A level", "Biology", "Form 4"), try to interpret it as a
  // grade/subject filter. This prevents the text falling to the AI, which has
  // no paper-browsing context and produces confusing responses.
  if (state.mode.kind === "browsing_papers") {
    const currentFilter = state.mode.filter;
    // Try as a grade (e.g. "A level", "form 6", "O-Level")
    const grades = await getAvailableGrades();
    const matchedGrade = matchItem(text, grades);
    if (matchedGrade) {
      const { newState, paperIds } = await startPaperBrowse(msg, state, {
        subject: currentFilter.subject, // keep existing subject filter
        grade: matchedGrade,
      });
      setPaperListCache(whatsappId, paperIds);
      await saveState(whatsappId, newState);
      return;
    }
    // Try as a subject (e.g. "maths", "biology")
    const subjects = currentFilter.grade
      ? await getAvailableSubjects(currentFilter.grade)
      : [];
    const matchedSubject = matchItem(text, subjects);
    if (matchedSubject) {
      const { newState, paperIds } = await showPapers(
        msg,
        { ...currentFilter, subject: matchedSubject },
        0,
        state,
      );
      setPaperListCache(whatsappId, paperIds);
      await saveState(whatsappId, newState);
      return;
    }
    // Not a grade or subject — offer a clear guide
    await msg.reply(
      `Reply a *number* to study a paper, *download N* for the PDF, or *more* for the next page.\n\nTo filter, tell me the level or subject (e.g. _"A level"_, _"Biology"_).`,
    );
    await saveState(whatsappId, state);
    return;
  }

  // project_brief: slot collection is free (no AI quota); NLP extraction uses Haiku
  // but is not counted toward the user's AI message quota.
  if (state.mode.kind === "project_brief") {
    const { state: newState, ready } = await handleProjectBriefReply(msg, text, state, true);
    if (ready) {
      // Don't generate immediately — show a review card and wait for an explicit
      // GENERATE so the student can catch a wrong grade/subject before the slow run.
      await msg.reply(projectReviewMessage(ready));
      await msg.reply(PROJECT_CONFIRM_PROMPT);
      await saveState(whatsappId, { ...newState, mode: { kind: "project_confirm", slots: ready } });
    } else {
      await saveState(whatsappId, newState);
    }
    return;
  }

  // project_confirm: brief complete, awaiting GENERATE / EDIT / CANCEL.
  if (state.mode.kind === "project_confirm") {
    const t = text.trim().toLowerCase();
    if (/^(generate|yes|y|yep|yeah|go|confirm|ok|okay|proceed|start|sure)\b/.test(t)) {
      const finalState = await generateProject(client, msg, state.mode.slots, userId, state);
      await saveState(whatsappId, finalState);
    } else if (/^(edit|change|redo|back|no|wrong)\b/.test(t)) {
      const restarted = await startProjectBrief(msg, { ...state, mode: { kind: "idle" } });
      await saveState(whatsappId, restarted);
    } else if (/^(cancel|exit|quit|stop|menu)\b/.test(t)) {
      await msg.reply(CANCEL_OK);
      await saveState(whatsappId, { ...state, mode: { kind: "idle" } });
    } else {
      await msg.reply(PROJECT_CONFIRM_RETRY);
      await saveState(whatsappId, state);
    }
    return;
  }

  if (hard.kind === "papers") {
    const { newState, paperIds } = await startPaperBrowse(msg, state);
    setPaperListCache(whatsappId, paperIds);
    await saveState(whatsappId, newState);
    return;
  }

  // ── Main menu number dispatcher (idle mode, no AI needed) ───────────────────

  // ai_chat mode has no mode-specific handler, so numbers fall straight to NL
  // routing and confuse the AI. Treat it the same as idle for menu navigation.
  const isMenuContext = state.mode.kind === "idle" || state.mode.kind === "ai_chat";
  if (hard.kind === "number_select" && isMenuContext && hard.n !== undefined) {
    switch (hard.n) {
      case 1: {
        const { newState, paperIds } = await startPaperBrowse(msg, state);
        setPaperListCache(whatsappId, paperIds);
        await saveState(whatsappId, newState);
        return;
      }
      case 2: {
        state = await startProjectBrief(msg, state);
        await saveState(whatsappId, state);
        return;
      }
      case 4: {
        await sendUsageCard(msg, userId);
        await saveState(whatsappId, state);
        return;
      }
      case 5: {
        state = await startUpgrade(msg, state);
        await saveState(whatsappId, state);
        return;
      }
      case 6: {
        const { newState: ns, paperIds: ids } = await startPaperBrowse(msg, state);
        setPaperListCache(whatsappId, ids);
        await saveState(whatsappId, ns);
        return;
      }
      // 3 (ask a question) falls through to NL/AI routing below
    }
  }

  // ── Natural-language AI routing (idle / browsing fallthrough) ─────────────
  dbg("→ routeWithNL", { text });
  const action = await routeWithNL(text);
  dbg("routeWithNL done", { actionKind: action.kind });
  state = await dispatchNlAction(client, msg, whatsappId, userId, action, state);
  dbg("dispatchNlAction done");
  await saveState(whatsappId, state);
}
