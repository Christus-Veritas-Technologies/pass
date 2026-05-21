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
import { checkAndIncrementAiMessage } from "../../lib/aiQuota";
import { PLAN_LIMITS, currentMonthKey, type PlanKey } from "../../lib/planLimits";
import { passAgent } from "../../mastra";
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
} from "../utils/messages";

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

  // Enforce monthly paper quota
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  if (user) {
    const limits = PLAN_LIMITS[user.plan as PlanKey];
    const month = currentMonthKey();
    const usage = await prisma.monthlyUsage.findUnique({
      where: { userId_month: { userId, month } },
    });
    if ((usage?.papersUsed ?? 0) >= limits.papers) {
      await msg.reply(papersQuotaMessage(user.plan, limits.papers));
      return { ...state, mode: { kind: "idle" } };
    }
    await prisma.monthlyUsage.upsert({
      where: { userId_month: { userId, month } },
      create: { userId, month, papersUsed: 1, projectsUsed: 0, aiMessagesUsed: 0 },
      update: { papersUsed: { increment: 1 } },
    });
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

  if (!sentPdf) await msg.reply(PAPER_FILE_MISSING);

  await msg.reply(
    paperIntroMessage({
      title: resource.title,
      questionCount: questions.length,
      totalMarks,
      diagramCount,
    }),
  );

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
  let questionBody = q.text;
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
      `${evaluation.feedback}\n\n` +
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
    const stream = await passAgent.stream([
      {
        role: "user" as const,
        content:
          `A ZIMSEC student is studying on WhatsApp and needs an explanation for Question ${qn}.\n\n` +
          `Question: ${question.text}\n\n` +
          (attempt?.userAnswer ? `Student's answer: ${attempt.userAnswer}\n\n` : "") +
          `Marking rubric:\n${guide}\n\n` +
          `Explain in 150–200 words:\n` +
          `1. What the correct answer requires\n` +
          `2. The key concept\n` +
          `3. One exam tip\n\n` +
          `Use WhatsApp markdown (*bold*, _italic_). End with "Reply *next* when ready."`,
      },
    ]);

    let text = "";
    for await (const chunk of stream.textStream) text += chunk;
    await chat.clearState();

    if (attempt) {
      await prisma.questionAttempt.update({ where: { id: attempt.id }, data: { explanation: text } });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
    const footer = aiUsageFooter(quota.used, quota.limit, user?.plan ?? "FREE") ?? "";
    await msg.reply(text + footer);
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

  return { ...state, mode: { kind: "idle" } };
}
