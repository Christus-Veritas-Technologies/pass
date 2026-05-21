/**
 * Central message dispatcher.
 * Called once per inbound message (after mutex serialisation).
 */

import type { Message, Client } from "whatsapp-web.js";
import prisma from "@pass/db";
import { loadState, saveState } from "../state/repo";
import { getLinkedUser } from "../middleware/ensureLinked";
import { matchHardIntent } from "./hardIntents";
import { sendWelcomeUnlinked, sendHelp, sendUsageCard } from "../flows/welcome";
import { startLinking, tryConsumeCode } from "../flows/linking";
import { showPapers, setPaperListCache, getPaperFromCache } from "../flows/paperBrowse";
import { startPaper, poseNextQuestion, gradeStudentAnswer, explainQuestion } from "../flows/paperStudy";
import { startProjectBrief, handleProjectBriefReply } from "../flows/projectBrief";
import { generateProject } from "../flows/projectGenerate";
import { handleAiChat } from "../flows/aiChat";
import { startUpgrade, handleUpgradeReply } from "../flows/upgrade";
import { routeWithNL } from "../flows/nlRouter";
import { getAiMessageUsage } from "../../lib/aiQuota";
import { CANCEL_OK, MEDIA_ONLY, RATE_LIMIT, AI_QUOTA_EXHAUSTED } from "../utils/messages";

const RATE_WINDOW_MS   = 60_000;
const RATE_MAX_PER_MIN = 30;

export async function handleMessage(client: Client, msg: Message): Promise<void> {
  // Ignore group messages in v1
  if (msg.from.endsWith("@g.us")) return;

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

  // ── Global hard intents ───────────────────────────────────────────────────

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

  // ── Linked path ───────────────────────────────────────────────────────────

  if (hard.kind === "greeting" && state.mode.kind === "idle") {
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

  // ── Mode-specific routing ─────────────────────────────────────────────────

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

  if (state.mode.kind === "project_brief") {
    const { state: newState, ready } = await handleProjectBriefReply(msg, text, state);
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

  // ── Natural-language AI routing (idle / browsing fallthrough) ─────────────
  // Peek at quota without incrementing — the actual answer generation in
  // handleAiChat will increment and enforce the limit.

  const quota = await getAiMessageUsage(userId);

  if (!quota.allowed) {
    // Quota exhausted: show single canned message, no AI calls, no liability.
    // UPGRADE and HELP are the only commands that still work (handled above).
    await msg.reply(AI_QUOTA_EXHAUSTED);
    await saveState(whatsappId, state);
    return;
  }

  const action = await routeWithNL(text);

  if (action.kind === "study_paper") {
    const { newState, paperIds } = await showPapers(msg, action, 0, state);
    setPaperListCache(whatsappId, paperIds);
    await saveState(whatsappId, newState);
    return;
  }

  if (action.kind === "generate_project") {
    state = await startProjectBrief(msg, state, action);
    if (
      state.mode.kind === "project_brief" &&
      state.mode.collected.subject &&
      state.mode.collected.grade &&
      state.mode.collected.topic
    ) {
      const { ready } = await handleProjectBriefReply(msg, "", state);
      if (ready) {
        state = await generateProject(client, msg, ready, userId, state);
      }
    }
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

  // answer_question and unclear both go through handleAiChat which enforces quota
  const question = action.kind === "answer_question" ? action.question : text;
  state = await handleAiChat(msg, question, userId, state);
  await saveState(whatsappId, state);
}
