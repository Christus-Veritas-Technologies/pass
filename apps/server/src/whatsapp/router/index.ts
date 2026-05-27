/**
 * Central message dispatcher.
 * Called once per inbound message (after mutex serialisation).
 *
 * Quota check happens early so we know whether to use NLP (full mode)
 * or regex-only pattern matching (rigid mode when quota exhausted).
 */

import type { Message, Client } from "whatsapp-web.js";
import prisma from "@pass/db";
import { loadState, saveState } from "../state/repo";
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
import { handleAiChat } from "../flows/aiChat";
import { startUpgrade, handleUpgradeReply } from "../flows/upgrade";
import { routeWithNL } from "../flows/nlRouter";
import { getAiMessageUsage } from "../../lib/aiQuota";
import { CANCEL_OK, MEDIA_ONLY, RATE_LIMIT, AI_QUOTA_EXHAUSTED } from "../utils/messages";

const RATE_WINDOW_MS   = 60_000;
const RATE_MAX_PER_MIN = 30;

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

  if (msg.hasMedia) {
    await msg.reply(MEDIA_ONLY);
    return;
  }

  const whatsappId = msg.from;
  const text = (msg.body ?? "").trim();
  if (!text) return;

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

    await sendWelcomeUnlinked(msg);
    await saveState(whatsappId, state);
    return;
  }

  // ── Linked path: check quota early ───────────────────────────────────────
  // Determines whether to use full NLP or rigid (regex-only) mode.
  // Slot collection (project_brief) is always allowed — only AI calls are gated.

  const quota = await getAiMessageUsage(userId);
  const rigidMode = !quota.allowed;

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
      state = await startPaper(client, msg, resource, userId, state);
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

  // project_brief: slot collection is free (no AI quota); NLP extraction uses Haiku
  // but is not counted toward the user's AI message quota.
  // In rigid mode we skip Haiku and use regex-only extraction.
  if (state.mode.kind === "project_brief") {
    const { state: newState, ready } = await handleProjectBriefReply(msg, text, state, !rigidMode);
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

  // ── Quota wall: no further AI calls in rigid mode ─────────────────────────

  if (rigidMode) {
    await msg.reply(AI_QUOTA_EXHAUSTED);
    await saveState(whatsappId, state);
    return;
  }

  // ── Natural-language AI routing (idle / browsing fallthrough) ─────────────

  const action = await routeWithNL(text);

  if (action.kind === "study_paper") {
    const { newState, paperIds } = await showPapers(msg, action, 0, state);
    setPaperListCache(whatsappId, paperIds);
    await saveState(whatsappId, newState);
    return;
  }

  if (action.kind === "generate_project") {