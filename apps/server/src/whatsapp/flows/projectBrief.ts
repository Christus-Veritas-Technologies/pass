/**
 * HBC project slot-filling flow.
 *
 * Collects: studentName, centreNumber, candidateNumber, grade, subject, category.
 * Uses NLP extraction to parse multiple fields from a single user message.
 */

import type { Message } from "whatsapp-web.js";
import type { ConversationState } from "../types";
import { extractHbcFields, type HbcFields } from "../utils/extractFields";
import {
  PROJECT_ASK_NAME,
  PROJECT_ASK_CENTRE_CANDIDATE,
  PROJECT_ASK_GRADE,
  PROJECT_ASK_SUBJECT,
  PROJECT_ASK_CATEGORY,
  PROJECT_ASK_CENTRE,
  PROJECT_ASK_CANDIDATE,
} from "../utils/messages";

export type ProjectSlots = {
  studentName: string;
  centreNumber: string;
  candidateNumber: string;
  grade: string;
  subject: string;
  category: string;
};

type Collected = Partial<ProjectSlots>;
type Awaiting = "name" | "centre" | "candidate" | "grade" | "subject" | "category";

const SUBJECTS_BY_GRADE: Record<string, string[]> = {
  "Grade 7": ["Heritage Studies", "Mathematics", "English", "Science", "Shona/Ndebele"],
  "Form 4": ["History", "Combined Science", "Agriculture", "Biology", "Chemistry", "Geography", "Shona", "English Literature"],
  "Form 6": ["History", "Geography", "Sociology", "Agriculture", "Biology", "Chemistry", "Physics"],
};

const VALID_GRADES = ["Grade 7", "Form 4", "Form 6"];

export async function startProjectBrief(
  msg: Message,
  state: ConversationState,
  hints?: { subject?: string; grade?: string },
): Promise<ConversationState> {
  const collected: Collected = {};
  if (hints?.grade) {
    const norm = normalizeGrade(hints.grade);
    if (norm) collected.grade = norm;
  }
  if (hints?.subject) {
    collected.subject = hints.subject;
  }
  return promptNextSlot(msg, state, collected);
}

export async function handleProjectBriefReply(
  msg: Message,
  text: string,
  state: ConversationState,
  useNlp = true,
): Promise<{ state: ConversationState; ready?: ProjectSlots }> {
  if (state.mode.kind !== "project_brief") return { state };

  const { collected } = state.mode;
  const needed = missingFields(collected);

  // Extract whatever fields the user provided in this message
  const extracted = await extractHbcFields(text, needed as (keyof HbcFields)[], useNlp);

  // Validate grade if extracted
  if (extracted.grade) {
    const norm = normalizeGrade(extracted.grade);
    extracted.grade = norm ?? undefined;
  }

  // Validate subject against grade (if we have a grade)
  const effectiveGrade = extracted.grade ?? collected.grade;
  if (extracted.subject && effectiveGrade) {
    const validSubs = SUBJECTS_BY_GRADE[effectiveGrade] ?? [];
    if (!validSubs.some((s) => s.toLowerCase() === extracted.subject?.toLowerCase())) {
      extracted.subject = undefined; // ignore invalid subject for this grade
    }
  }

  // Merge into collected (only fill gaps — don't overwrite confirmed values)
  const merged: Collected = { ...collected };
  for (const k of Object.keys(extracted) as (keyof HbcFields)[]) {
    if (extracted[k] && !merged[k as keyof Collected]) {
      (merged as Record<string, string | undefined>)[k] = extracted[k];
    }
  }

  const newState: ConversationState = {
    ...state,
    mode: {
      kind: "project_brief",
      awaiting: getAwaiting(merged),
      collected: merged,
    },
  };

  if (isComplete(merged)) {
    return { state: newState, ready: merged as ProjectSlots };
  }

  return { state: await promptNextSlot(msg, newState, merged) };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isComplete(c: Collected): c is ProjectSlots {
  return !!(c.studentName && c.centreNumber && c.candidateNumber && c.grade && c.subject && c.category);
}

function missingFields(c: Collected): (keyof Collected)[] {
  const all: (keyof Collected)[] = ["studentName", "centreNumber", "candidateNumber", "grade", "subject", "category"];
  return all.filter((k) => !c[k]);
}

function getAwaiting(c: Collected): Awaiting {
  if (!c.studentName) return "name";
  if (!c.centreNumber && !c.candidateNumber) return "centre";
  if (!c.centreNumber) return "centre";
  if (!c.candidateNumber) return "candidate";
  if (!c.grade) return "grade";
  if (!c.subject) return "subject";
  return "category";
}

async function promptNextSlot(
  msg: Message,
  state: ConversationState,
  collected: Collected,
): Promise<ConversationState> {
  const awaiting = getAwaiting(collected);

  switch (awaiting) {
    case "name":
      await msg.reply(PROJECT_ASK_NAME);
      break;
    case "centre":
      if (!collected.centreNumber && !collected.candidateNumber) {
        await msg.reply(PROJECT_ASK_CENTRE_CANDIDATE);
      } else {
        await msg.reply(PROJECT_ASK_CENTRE);
      }
      break;
    case "candidate":
      await msg.reply(PROJECT_ASK_CANDIDATE);
      break;
    case "grade":
      await msg.reply(PROJECT_ASK_GRADE);
      break;
    case "subject":
      await msg.reply(projectAskSubject(collected.grade!));
      break;
    case "category":
      await msg.reply(PROJECT_ASK_CATEGORY);
      break;
  }

  return {
    ...state,
    mode: { kind: "project_brief", awaiting, collected },
  };
}

function normalizeGrade(raw: string): string | undefined {
  const t = raw.trim().toLowerCase();
  if (t.includes("7") || t === "grade 7" || t === "grade7") return "Grade 7";
  if (t.includes("form 4") || t === "form4" || t === "4" || t === "o-level" || t === "olevel") return "Form 4";
  if (t.includes("form 6") || t === "form6" || t === "6" || t === "a-level" || t === "alevel") return "Form 6";
  for (const g of VALID_GRADES) {
    if (t === g.toLowerCase()) return g;
  }
  return undefined;
}

function projectAskSubject(grade: string): string {
  const subs = SUBJECTS_BY_GRADE[grade] ?? [];
  const list = subs.map((s) => `• ${s}`).join("\n");
  return `Which subject is this project for?\n\n${list}`;
}
