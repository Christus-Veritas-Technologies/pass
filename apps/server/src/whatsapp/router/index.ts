/**
 * Central message dispatcher.
 * Called once per inbound message (after mutex serialisation).
 *
 * Quota check happens early so we know whether to use NLP (full mode)
 * or regex-only pattern matching (rigid mode when quota exhausted).
 */

import type { Message, Client } from "whatsapp-web.js";
import prisma from "@pass/db";
import { loadState, saveState, unlinkUser } from "../state/repo";
import { getLinkedUser } from "../middleware/ensureLinked";
import { matchHardIntent } from "./hardIntents";
import { sendWelcomeUnlinked, sendHelp, sendUsageCard } from "../flows/welcome";
import { startLinking, tryConsumeCode } from "../flows/linking";
import { startSignup, handleSignupReply, startSignin, handleSigninReply } from "../flows/auth";
import { showPapers, setPaperListCache, getPaperFromCache } from "../flows/paperBrowse";
import { startPaper, poseNextQuestion, gradeStudentAnswer, explainQuestion } from "../flows/paperStudy";
import { startProjectBrief, handleProjectBriefReply } from "../flows/projectBrief";
import { generateProject } from "../flows/projectGenerate";
import { sendProjectPdf } from "../media/sendProject";
import { sendPaperPdf } from "../media/sendPaper";
import { handleAiChat } from "../flows/aiChat";
import { handleMediaMessage } from "../flows/mediaAnalysis";
import { startUpgrade, handleUpgradeReply } from "../flows/upgrade";
import { routeWithNL } from "../flows/nlRouter";
import { getAiMessageUsage, checkProjectsQuota } from "../../lib/aiQuota";
import {
  CANCEL_OK,
  LOGOUT_OK,
  WELCOME_UNLINKED,
  RATE_LIMIT,
  unlinkedFeatureNudge,
  projectsQuotaMessage,
  aiQuotaMessage,
  downloadsQuotaMessage,
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

export async function handleMessage(client: Client, msg: Message): Promise<void> {
  // Only process direct 1-on-1 chat messages.
  // Silently drop everything else: groups, broadcasts, status updates, channels.
  const from = msg.from ?? "";
  if (
    from.endsWith("@g.us")            || // WhatsApp groups
    from.endsWith("@broadcast")        || // Broadcast lists / status
    from.endsWith("@newsletter")       || // WhatsApp channels
    from === "status@broadcast"        || // Status updates
    msg.isStatus                       || // Status flag
    msg.broadcast                         // Broadcast flag
  ) return;

  const whatsappId = msg.from;
  // When media is present the body is the caption (may be empty).
  // We still need the text for hard-intent matching on text-only messages.
  const text = (msg.body ?? "").trim();

  // Drop truly empty messages that have no media and no text
  if (!msg.hasMedia && !text) return;

  let state = await loadState(whatsappId);

  // Rate limiting (per-minute)
  const now = Date.now();
  const windowStart = new Date(state.lastMessageAt).getTime();
  if (now - windowStart < RATE_WINDOW_MS) {
    state.messageCountThisMinute = (state.messageCountThisMinute ?? 0) + 1;
  } else {
    state.messageCountThisMinute = 1;
  }
  if (state.messageCountThisMinute > RATE_MAX_PER_MIN) {
    await msg.reply(RATE_LIMIT);
    await saveState(whatsappId, state);
    return;
  }

  const hard = matchHardIntent(text, state.mode);

  // ── Global hard intents (always free, no AI, no quota check) ─────────────

  if (hard.kind === "help") {
    await sendHelp(msg);
    await saveState(whatsappId, state);
    return;
  }

  if (hard.kind === "cancel") {
    state = { ...state, mode: { kind: "idle" } };
    await msg.reply(CANCEL_OK);
    await saveState(whatsappId, state);
    return;
  }

  // ── Logout: unlink account then show welcome ───────────────────────────────
  if (hard.kind === "logout") {
    await unlinkUser(whatsappId);
    await msg.reply(LOGOUT_OK);
    await msg.reply(WELCOME_UNLINKED);
    return;
  }

  // ── Unlinked path ─────────────────────────────────────────────────────────

  const userId = await getLinkedUser(whatsappId);

  if (!userId) {
    // WhatsApp-native signup flow
    if (hard.kind === "signup" || state.mode.kind === "signing_up") {
      state = state.mode.kind === "signing_up"
        ? await handleSignupReply(msg, text, whatsappId, state)
        : await startSignup(msg, state);
      await saveState(whatsappId, state);
      return;
    }

    // WhatsApp-native signin flow
    if (hard.kind === "signin" || state.mode.kind === "signing_in") {
      state = state.mode.kind === "signing_in"
        ? await handleSigninReply(msg, text, whatsappId, state)
        : await startSignin(msg, state);
      await saveState(whatsappId, state);
      return;
    }

    if (hard.kind === "link_code" && hard.code) {
      const { newState } = await tryConsumeCode(msg, hard.code, whatsappId, state);
      await saveState(whatsappId, newState);
      return;
    }

    if (hard.kind === "link" || state.mode.kind === "linking") {
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
    // If they already have an account the email step in handleSignupReply will
    // detect it and prompt them to sign in instead.
    if (hard.kind === "greeting") {
      state = await startSignup(msg, state);
      await saveState(whatsappId, state);
      return;
    }

    // Context-aware nudge: detect what feature they want and tell them to sign up
    // for it specifically, rather than showing the generic welcome every time.
    const featureHint = detectUnlinkedFeatureHint(text);
    if (featureHint) {
      await msg.reply(unlinkedFeatureNudge(featureHint));
    } else {
      await sendWelcomeUnlinked(msg);
    }
    await saveState(whatsappId, state);
    return;
  }

  // ── Media messages (images / PDFs) — handle before text routing ─────────────
  if (msg.hasMedia) {
    state = await handleMediaMessage(msg, userId, state);
    state.lastMessageAt = new Date().toISOString();
    await saveState(whatsappId, state);
    return;
  }

  // ── Linked path: read AI quota (used only at NL dispatch, not as a global wall) ──
  // Each feature enforces its own quota at call-time. This read is only used to
  // gate answer_question / ai_chat calls further down — never as a blanket block.
  const quota = await getAiMessageUsage(userId);

  if (hard.kind === "greeting") {
    state = { ...state, mode: { kind: "idle" } };
    await sendHelp(msg);
    await saveState(whatsappId, state);
    return;
  }

  if (hard.kind === "usage") {
    await sendUsageCard(msg, userId);
    await saveState(whatsappId, state);
    return;
  }

  if (hard.kind === "link") {
    await msg.reply("Your account is already linked 👍\nReply *usage* to see your plan, or just ask me anything.");
    await saveState(whatsappId, state);
    return;
  }

  if (hard.kind === "upgrade") {
    state = await startUpgrade(msg, state);
    await saveState(whatsappId, state);
    return;
  }

  if (hard.kind === "project") {
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
      state = await gradeStudentAnswer(msg, text, userId, state);
      await saveState(whatsappId, state);
      return;
    }

    await msg.reply(`Reply with your answer, *next* to move on, *explain* for help, or *cancel* to exit.`);
    await saveState(whatsappId, state);
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
        state = { ...state, mode: { kind: "idle" } };
      }
      await saveState(whatsappId, state);
      return;
    }

    await msg.reply("Reply *1* to study this paper or *2* to download the PDF.");
    await saveState(whatsappId, state);
    return;
  }

  // project_brief: slot collection is free (no AI quota); NLP extraction uses Haiku
  // but is not counted toward the user's AI message quota.
  if (state.mode.kind === "project_brief") {
    const { state: newState, ready } = await handleProjectBriefReply(msg, text, state, true);
    if (ready) {
      const finalState = await generateProject(client, msg, ready, userId, newState);
      await saveState(whatsappId, finalState);
    } else {
      await saveState(whatsappId, newState);
    }
    return;
  }

  if (hard.kind === "papers") {
    const { newState, paperIds } = await showPapers(msg, {}, 0, state);
    setPaperListCache(whatsappId, paperIds);
    await saveState(whatsappId, newState);
    return;
  }

  // ── Main menu number dispatcher (idle mode, no AI needed) ───────────────────

  if (hard.kind === "number_select" && state.mode.kind === "idle" && hard.n !== undefined) {
    switch (hard.n) {
      case 1: {
        const { newState, paperIds } = await showPapers(msg, {}, 0, state);
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
        const { newState: ns, paperIds: ids } = await showPapers(msg, {}, 0, state);
        setPaperListCache(whatsappId, ids);
        await saveState(whatsappId, ns);
        return;
      }
      // 3 (ask a question) falls through to NL/AI routing below
    }
  }

  // ── Natural-language AI routing (idle / browsing fallthrough) ─────────────
  // Each branch enforces its own quota. There is no global gate here — a user
  // exhausted on AI messages can still browse papers; a user out of project
  // credits can still ask questions. The individual feature quota messages tell
  // them exactly which resource is exhausted and how to unblock it.

  const action = await routeWithNL(text);

  if (action.kind === "study_paper") {
    // Papers-quota pre-check: prevents sending the user through the browse flow
    // only to hit a wall when they try to start a session.
    // Note: browsing is always free — the quota only blocks starting a session.
    // We show the list anyway; the wall is enforced when they select a paper.
    const { newState, paperIds } = await showPapers(msg, action, 0, state);
    setPaperListCache(whatsappId, paperIds);
    await saveState(whatsappId, newState);
    return;
  }

  if (action.kind === "generate_project") {
    // Project-quota pre-check: short-circuits before slot collection begins so
    // the user isn't walked through the entire brief only to hit a wall at the end.
    const pqc = await checkProjectsQuota(userId);
    if (!pqc.allowed) {
      await msg.reply(projectsQuotaMessage(pqc.plan, pqc.limit));
      await saveState(whatsappId, state);
      return;
    }
    state = await startProjectBrief(msg, state, action);
    await saveState(whatsappId, state);
    return;
  }

  if (action.kind === "show_usage") {
    await sendUsageCard(msg, userId);
    await saveState(whatsappId, state);
    return;
  }

  if (action.kind === "upgrade_plan") {
    state = await startUpgrade(msg, state);
    await saveState(whatsappId, state);
    return;
  }

  // answer_question — gate only this path on AI message quota
  if (!quota.allowed) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    await msg.reply(aiQuotaMessage(user?.plan ?? "FREE", quota.limit));
    await saveState(whatsappId, state);
    return;
  }

  const question = action.kind === "answer_question" ? action.question : text;
  state = await handleAiChat(msg, question, userId, state);
  await saveState(whatsappId, state);
}
