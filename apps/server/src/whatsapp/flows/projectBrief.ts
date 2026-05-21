/**
 * Project slot-filling flow.
 * Collects subject, grade, and topic before handing off to projectGenerate.
 */

import type { Message } from "whatsapp-web.js";
import type { ConversationState } from "../types";
import { PROJECT_ASK_TOPIC, PROJECT_ASK_GRADE } from "../utils/messages";

export type ProjectSlots = { subject: string; grade: string; topic: string };

export async function startProjectBrief(
  msg: Message,
  state: ConversationState,
  hints?: { subject?: string; grade?: string; topic?: string },
): Promise<ConversationState> {
  const collected: Partial<ProjectSlots> = {};
  if (hints?.subject) collected.subject = hints.subject;
  if (hints?.grade)   collected.grade   = hints.grade;
  if (hints?.topic)   collected.topic   = hints.topic;
  return promptNextSlot(msg, state, collected);
}

export async function handleProjectBriefReply(
  msg: Message,
  text: string,
  state: ConversationState,
): Promise<{ state: ConversationState; ready?: ProjectSlots }> {
  if (state.mode.kind !== "project_brief") return { state };

  const { awaiting, collected } = state.mode;
  const trimmed = text.trim();

  if (awaiting === "topic")  collected.topic = trimmed;
  else if (awaiting === "grade") collected.grade = trimmed;

  if (!collected.subject) collected.subject = inferSubject(trimmed) ?? "General";

  const newState: ConversationState = {
    ...state,
    mode: { ...state.mode, collected, awaiting: getNextAwaiting(collected) },
  };

  if (collected.subject && collected.grade && collected.topic) {
    return { state: newState, ready: collected as ProjectSlots };
  }

  return { state: await promptNextSlot(msg, newState, collected) };
}

async function promptNextSlot(
  msg: Message,
  state: ConversationState,
  collected: Partial<ProjectSlots>,
): Promise<ConversationState> {
  let awaiting: "topic" | "grade" = "topic";

  if (!collected.topic) {
    awaiting = "topic";
    const subjectNote = collected.subject ? `\n_Subject: ${collected.subject}_` : "";
    await msg.reply(PROJECT_ASK_TOPIC + subjectNote);
  } else if (!collected.grade) {
    awaiting = "grade";
    await msg.reply(PROJECT_ASK_GRADE);
  }

  return { ...state, mode: { kind: "project_brief", awaiting, collected } };
}

function getNextAwaiting(collected: Partial<ProjectSlots>): "topic" | "grade" {
  if (!collected.topic) return "topic";
  return "grade";
}

const SUBJECT_KEYWORDS: Record<string, string> = {
  math: "Mathematics",        maths: "Mathematics",
  physics: "Physics",         chemistry: "Chemistry",
  biology: "Biology",         geography: "Geography",
  history: "History",         commerce: "Commerce",
  accounting: "Accounting",   english: "English Language",
  shona: "Shona",             ndebele: "Ndebele",
  agriculture: "Agriculture", business: "Business Studies",
  computer: "Computer Science",
};

export function inferSubject(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const [kw, sub] of Object.entries(SUBJECT_KEYWORDS)) {
    if (lower.includes(kw)) return sub;
  }
  return undefined;
}
