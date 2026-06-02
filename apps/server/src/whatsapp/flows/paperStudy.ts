/**
 * Paper study FSM.
 *
 * browsing_papers → (select) → paper_study (questionNumber:0, awaitingAnswer:false)
 * paper_study     → (start)  → pose Q1
 *                → (answer)  → grade → show result → awaitingAnswer:false
 *                → (next)    → advance
 *                → (diagram) → auto-skip, advance
 *                → (done)    → completion summary
 */

import prisma from "@pass/db";
import type { Client, Message } from "whatsapp-web.js";
import type { Resource } from "@pass/db";
import type { ConversationState } from "../types";
import { gradeAnswer, effectiveGuide } from "../../lib/grading";
import { explainAgent } from "../../mastra/agents/explain.agent";
import { checkAndIncrementAiMessage } from "../../lib/aiQuota";
import { PLAN_LIMITS, currentMonthKey, type PlanKey } from "../../lib/planLimits";
import { sendPaperPdf } from "../media/sendPaper";
import { recalculateScore } from "./scoring";
import {
  papersQuotaMessage,
  aiQuotaMessage,
  paperIntroMessage,
  diagramSkipMessage,
  completionMessage,
  AI_ERROR,
  PAPER_FILE_MISSING,
  aiUsageFooter,
  WHAT_NEXT,
} from "../utils/messages";
import { mdToWhatsApp } from "../utils/format";

// ─── Start a paper session ────────────────────────────────────────────────────

export async function startPaper(
  client: Client,
  msg: Message,
  resource: Resource,
  userId: string,
  state: ConversationState,
): Promise<ConversationState> {
  const chat = await msg.getChat();
  const whatsappId = chat.id._serialized;

  // Enforce monthly paper quota (bonus credits extend the limit)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, bonusPapers: true },
  });
  if (user) {
    const limits = PLAN_LIMITS[user.plan as PlanKey];
    const month = currentMonthKey();
    const usage = await prisma.monthlyUsage.findUnique({
      where: { userId_month: { userId, month } },
    });
    const papersUsed = usage?.papersUsed ?? 0;
    if (papersUsed >= limits.papers) {
      if ((user.bonusPapers ?? 0) > 0) {
        // Consume one bonus credit
        await prisma.user.update({ where: { id: userId }, data: { bonusPapers: { decrement: 1 } } });
      } else {
        await msg.reply(papersQuotaMessage(user.plan, limits.papers));
        return { ...state, mode: { kind: "idle" } };
      }
    } else {
      await prisma.monthlyUsage.upsert({
        where: { userId_month: { userId, month } },
        create: { userId, month, papersUsed: 1, projectsUsed: 0, aiMessagesUsed: 0 },
        update: { papersUsed: { increment: 1 } },
      });
    }
  }

  const session = await prisma.paperSession.create({
    data: { userId, resourceId: resource.id, mode: "GUIDE" },
  });

  const questions = await prisma.paperQuestion.findMany({
    where: { resourceId: resource.id },
    orderBy: { questionNumber: "asc" },
  });
  const diagramCount = questions.filter((q) => q.hasDiagram).length;
  const totalMarks   = questions.reduce((s, q) => s + q.marks, 0);

  await chat.sendStateTyping();
  const sentPdf = await sendPaperPdf(client, whatsappId, resource);
  await chat.clearState();

  // Combine the (optional) missing-PDF note and the intro into one message
  // so the student never sees a confusing "not available" followed by the paper starting anyway.
  const introText = [
    !sentPdf ? PAPER_FILE_MISSING : null,
    paperIntroMessage({ title: resource.title, questionCount: questions.length, totalMarks, diagramCount }),
  ].filter(Boolean).join("\n\n");

  await msg.reply(introText);

  return {
    ...state,
    mode: {
      kind: "paper_study",
      sessionId: session.id,
      resourceId: resource.id,
      paperTitle: resource.title,
      questionNumber: 0,
      totalQuestions: questions.length,
      skippedDiagramQuestions: [],
      totalSkippedMarks: 0,
      awaitingAnswer: false,
    },
  };
}

// ─── WhatsApp question formatter ─────────────────────────────────────────────

/**
 * Format a question's raw text for WhatsApp:
 *   • Detects MCQ options (A … B … C … D …) and puts each on its own line.
 *   • Strips [Passage: …] brackets and adds a clear divider before the question.
 *   • Preserves all other text as-is.
 */
function formatQuestionForWhatsApp(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  // Extract passage if present
  const passageMatch = text.match(/\[(?:Passage[:\s]*)?([\s\S]+?)\]([\s\S]*)$/);
  let passageBlock = "";
  let remainder = text;

  if (passageMatch && passageMatch[1] != null && passageMatch[1].trim().length > 60) {
    const before = text.slice(0, passageMatch.index ?? 0).trim();
    passageBlock =
      (before ? `_${before}_\n\n` : "") +
      `_${passageMatch[1].trim()}_`;
    remainder = (passageMatch[2] ?? "").trim();
  }

  // Detect MCQ options inline: "… A opt B opt C opt D opt"
  const MCQ_LINE_RE = /^([A-D])[ \t]+(.+)$/gm;
  const lineOptions: Array<{ label: string; text: string; index: number }> = [];
  let lm: RegExpExecArray | null;
  while ((lm = MCQ_LINE_RE.exec(remainder)) !== null) {
    lineOptions.push({ label: lm[1] ?? "", text: (lm[2] ?? "").trim(), index: lm.index });
  }

  if (lineOptions.length >= 2) {
    // Options already on separate lines
    const stem = remainder.slice(0, lineOptions[0]!.index).trim();
    const opts = lineOptions.map((o) => `*${o.label}* ${o.text}`).join("\n");
    const questionPart = stem ? `${stem}\n\n${opts}` : opts;
    return passageBlock ? `${passageBlock}\n\n${questionPart}` : questionPart;
  }

  // Try inline MCQ: split at standalone A/B/C/D letters
  const inlineRe = /(?:^|\s)([A-D])\s+/g;
  const positions: Array<{ label: string; matchStart: number; contentStart: number }> = [];
  let im: RegExpExecArray | null;
  while ((im = inlineRe.exec(remainder)) !== null) {
    const label = im[1] ?? "";
    const labelIdx = im.index + im[0].indexOf(label);
    positions.push({ label, matchStart: labelIdx, contentStart: im.index + im[0].length });
  }

  if (positions.length >= 2 && positions[0]!.label === "A") {
    const stem = remainder.slice(0, positions[0]!.matchStart).trim();
    const opts = positions
      .map((p, i) => {
        const end = i + 1 < positions.length ? positions[i + 1]!.matchStart : remainder.length;
        return `*${p.label}* ${remainder.slice(p.contentStart, end).trim()}`;
      })
      .join("\n");
    const questionPart = stem ? `${stem}\n\n${opts}` : opts;
    return passageBlock ? `${passageBlock}\n\n${questionPart}` : questionPart;
  }

  // No MCQ — return as-is with passage if any
  return passageBlock ? `${passageBlock}\n\n${remainder}` : remainder;
}

// ─── Pose the next question ───────────────────────────────────────────────────

export async function poseNextQuestion(
  msg: Message,
  state: ConversationState,
  startFromQn?: number,
): Promise<ConversationState> {
  if (state.mode.kind !== "paper_study") return state;
  const s = state.mode;
  const nextQn = startFromQn ?? s.questionNumber + 1;

  const questions = await prisma.paperQuestion.findMany({
    where: { resourceId: s.resourceId, questionNumber: { gte: nextQn } },
    orderBy: { questionNumber: "asc" },
  });

  const [q] = questions;
  if (!q) return finalisePaper(msg, state);

  // Auto-skip diagram questions
  if (q.hasDiagram) {
    await prisma.questionAttempt.upsert({
      where: { sessionId_questionNumber: { sessionId: s.sessionId, questionNumber: q.questionNumber } },
      create: {
        sessionId: s.sessionId,
        questionNumber: q.questionNumber,
        questionText: q.text,
        userAnswer: "(skipped — diagram)",
        correct: null,
      },
      update: { userAnswer: "(skipped — diagram)" },
    });

    await msg.reply(diagramSkipMessage(q.questionNumber, q.marks, q.pdfPage));

    const newState: ConversationState = {
      ...state,
      mode: {
        ...s,
        questionNumber: q.questionNumber,
        skippedDiagramQuestions: [...s.skippedDiagramQuestions, q.questionNumber],
        totalSkippedMarks: s.totalSkippedMarks + q.marks,
        awaitingAnswer: false,
      },
    };
    return poseNextQuestion(msg, newState, q.questionNumber + 1);
  }

  // Build question text with sub-parts
  const subPartsArr = q.subParts as Array<{ label: string; text: string; marks: number }> | null;
  let questionBody = formatQuestionForWhatsApp(q.text);
  if (subPartsArr && subPartsArr.length > 0) {
    questionBody +=
      "\n\n" +
      subPartsArr
        .map((sp) => `${sp.label} ${sp.text} _(${sp.marks} mark${sp.marks !== 1 ? "s" : ""})_`)
        .join("\n");
    questionBody += `\n\nYou can answer all parts in one message — separate them with ${subPartsArr.map((sp) => sp.label).join(", ")}.`;
  }

  const sectionNote = q.section ? `  _${q.section}_` : "";
  await msg.reply(
    `*Question ${q.questionNumber}* (${q.marks} mark${q.marks !== 1 ? "s" : ""})${sectionNote}\n\n${questionBody}`,
  );

  return {
    ...state,
    mode: { ...s, questionNumber: q.questionNumber, awaitingAnswer: true, lastEvaluation: undefined },
  };
}

// ─── Grade an answer ──────────────────────────────────────────────────────────

export async function gradeStudentAnswer(
  msg: Message,
  userAnswer: string,
  userId: string,
  state: ConversationState,
): Promise<ConversationState> {
  if (state.mode.kind !== "paper_study") return state;
  const s = state.mode;

  const chat = await msg.getChat();
  await chat.sendStateTyping();

  const quota = await checkAndIncrementAiMessage(userId);
  if (!quota.allowed) {
    await chat.clearState();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    await msg.reply(aiQuotaMessage(user?.plan ?? "FREE", quota.limit));
    return { ...state, mode: { ...s, awaitingAnswer: false } };
  }

  const question = await prisma.paperQuestion.findUnique({
    where: { resourceId_questionNumber: { resourceId: s.resourceId, questionNumber: s.questionNumber } },
  });

  if (!question) {
    await chat.clearState();
    await msg.reply("Something went wrong loading the question. Try *next* to skip.");
    return state;
  }

  try {
    const evaluation = await gradeAnswer(question, userAnswer);

    await prisma.questionAttempt.upsert({
      where: { sessionId_questionNumber: { sessionId: s.sessionId, questionNumber: s.questionNumber } },
      create: {
        sessionId: s.sessionId,
        questionNumber: s.questionNumber,
        questionText: question.text,
        userAnswer,
        evaluation: evaluation as object,
        correct: evaluation.isCorrect,
      },
      update: { userAnswer, evaluation: evaluation as object, correct: evaluation.isCorrect },
    });
    await prisma.paperSession.update({
      where: { id: s.sessionId },
      data: { questionsAnswered: { increment: 1 } },
    });

    await chat.clearState();

    const tick   = evaluation.isCorrect ? "✅" : "❌";
    const earned = evaluation.pointsEarned.map((p) => `  ✓ ${p}`).join("\n");
    const missed = evaluation.pointsMissed.map((p) => `  ✗ ${p}`).join("\n");
    const detail = [earned, missed].filter(Boolean).join("\n");

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    const footer = aiUsageFooter(quota.used, quota.limit, user?.plan ?? "FREE") ?? "";

    const reply =
      `*Q${s.questionNumber} — ${evaluation.score}/${evaluation.maxScore}* ${tick}\n\n` +
      `${mdToWhatsApp(evaluation.feedback)}\n\n` +
      (detail ? `${detail}\n\n` : "") +
      `Reply *explain* to dig deeper, or *next* to continue.${footer}`;

    await msg.reply(reply);

    return {
      ...state,
      mode: {
        ...s,
        awaitingAnswer: false,
        lastEvaluation: {
          score: evaluation.score,
          maxScore: evaluation.maxScore,
          feedback: evaluation.feedback,
          isCorrect: evaluation.isCorrect,
        },
      },
    };
  } catch (err) {
    console.error("[whatsapp] gradeStudentAnswer error:", err);
    await chat.clearState();
    await msg.reply(AI_ERROR);
    return state;
  }
}

// ─── Explain a question ───────────────────────────────────────────────────────

export async function explainQuestion(
  msg: Message,
  questionNumber: number,
  userId: string,
  state: ConversationState,
): Promise<void> {
  if (state.mode.kind !== "paper_study") return;
  const s = state.mode;
  const qn = questionNumber || s.questionNumber;

  const chat = await msg.getChat();
  await chat.sendStateTyping();

  const quota = await checkAndIncrementAiMessage(userId);
  if (!quota.allowed) {
    await chat.clearState();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    await msg.reply(aiQuotaMessage(user?.plan ?? "FREE", quota.limit));
    return;
  }

  const [question, attempt] = await Promise.all([
    prisma.paperQuestion.findUnique({
      where: { resourceId_questionNumber: { resourceId: s.resourceId, questionNumber: qn } },
    }),
    prisma.questionAttempt.findUnique({
      where: { sessionId_questionNumber: { sessionId: s.sessionId, questionNumber: qn } },
    }),
  ]);

  if (!question) { await chat.clearState(); await msg.reply("Couldn't find that question."); return; }

  const guide = effectiveGuide(question);

  try {
    const result = await explainAgent.generate(
      `Explain Question ${qn} to me.\n\n` +
        `Question: ${question.text}\n\n` +
        (attempt?.userAnswer ? `My answer was: ${attempt.userAnswer}\n\n` : "") +
        `Marking rubric:\n${guide}\n\n` +
        `Cover in 150–200 words:\n` +
        `1. What the correct answer requires\n` +
        `2. The key concept\n` +
        `3. One exam tip\n\n` +
        `Write in plain text only (no markdown). End with "Reply *next* when ready."`,
    );

    const text = (result.text ?? "").trim();
    await chat.clearState();

    if (attempt) {
      await prisma.questionAttempt.update({ where: { id: attempt.id }, data: { explanation: text } });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    const footer = aiUsageFooter(quota.used, quota.limit, user?.plan ?? "FREE") ?? "";
    await msg.reply(mdToWhatsApp(text) + footer);
  } catch (err) {
    console.error("[whatsapp] explainQuestion error:", err);
    await chat.clearState();
    await msg.reply(AI_ERROR);
  }
}

// ─── Finalise paper ───────────────────────────────────────────────────────────

async function finalisePaper(msg: Message, state: ConversationState): Promise<ConversationState> {
  if (state.mode.kind !== "paper_study") return state;
  const s = state.mode;

  await prisma.paperSession.update({
    where: { id: s.sessionId },
    data: { completedAt: new Date() },
  });

  const [questions, attempts] = await Promise.all([
    prisma.paperQuestion.findMany({ where: { resourceId: s.resourceId }, orderBy: { questionNumber: "asc" } }),
    prisma.questionAttempt.findMany({ where: { sessionId: s.sessionId } }),
  ]);

  const score = recalculateScore(questions, attempts);

  await msg.reply(completionMessage({ title: s.paperTitle, ...score }));
  // Clear context so the next message isn't mistaken for a study-session reply.
  await msg.reply(WHAT_NEXT);

  return { ...state, mode: { kind: "idle" } };
}
