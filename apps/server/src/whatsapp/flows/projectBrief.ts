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
  PROJECT_ASK_SCHOOL,
  PROJECT_ASK_CENTRE_CANDIDATE,
  PROJECT_ASK_GRADE,
  PROJECT_ASK_SUBJECT,
  PROJECT_ASK_TITLE,
  PROJECT_ASK_CENTRE,
  PROJECT_ASK_CANDIDATE,
  PROJECT_NUMBER_BLANK_REMINDER,
} from "../utils/messages";

export type ProjectSlots = {
  studentName: string;
  schoolName: string;
  centreNumber: string;
  candidateNumber: string;
  grade: string;
  subject: string;
  category: string;
  title: string;   // "" means "let AI generate the title"
};

type Collected = Partial<ProjectSlots>;
type Awaiting = "name" | "school" | "centre" | "candidate" | "grade" | "subject" | "title";

// Category is auto-selected — never asked from the user.
const VALID_CATEGORIES = ["Culture & History", "Indigenous Sciences", "Arts & Lifestyle"] as const;

/** Pick a random category. Called once subject is confirmed. */
function randomCategory(): string {
  return VALID_CATEGORIES[Math.floor(Math.random() * VALID_CATEGORIES.length)]!;
}

/**
 * Auto-assign any fields that don't need user input.
 * Currently: category is always auto-selected once subject is known.
 */
function withAutoFields(c: Collected): Collected {
  if (c.subject && !c.category) {
    return { ...c, category: randomCategory() };
  }
  return c;
}

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

// Numbered option resolution for grade, subject, and category prompts
const GRADE_BY_NUMBER: Record<number, string> = {
  1: "Grade 7",
  2: "Form 4",
  3: "Form 6",
};

/**
 * Matches any natural-language phrasing meaning "I don't have this number yet".
 * Covers: "leave blank", "skip", "I don't have it", "not yet", "n/a", etc.
 */
const LEAVE_BLANK = /\b(leave\s*(it\s*)?(blank|empty)|skip(\s*(it|this|the\s+number))?|blank|don'?t\s+(have|know)|not\s+(yet|received|assigned|registered|given)|haven'?t\s+(received|got|been\s+given|been\s+assigned|registered)|no\s+(centre|candidate|number|idea)|n\/?a|none|nil)\b|^[-_]+$|^(none|skip|blank)$/i;

/** Returns true if the user means to leave the number field empty. */
function isLeaveBlank(text: string): boolean {
  return LEAVE_BLANK.test(text.trim());
}

export async function handleProjectBriefReply(
  msg: Message,
  text: string,
  state: ConversationState,
  useNlp = true,
): Promise<{ state: ConversationState; ready?: ProjectSlots }> {
  if (state.mode.kind !== "project_brief") return { state };

  const { collected, awaiting } = state.mode;
  const needed = missingFields(collected);

  // Name step: the whole message is the student name — no NLP needed
  if (awaiting === "name" && text.trim()) {
    const studentName = isLeaveBlank(text) ? "_" : text.trim();
    const merged: Collected = { ...collected, studentName };
    const newState: ConversationState = {
      ...state,
      mode: { kind: "project_brief", awaiting: getAwaiting(merged), collected: merged },
    };
    if (isComplete(merged)) return { state: newState, ready: merged as ProjectSlots };
    return { state: await promptNextSlot(msg, newState, merged) };
  }

  // School step: the whole message is the school name — no NLP needed
  if (awaiting === "school" && text.trim()) {
    const schoolName = isLeaveBlank(text) ? "_" : text.trim();
    const merged: Collected = { ...collected, schoolName };
    const newState: ConversationState = {
      ...state,
      mode: { kind: "project_brief", awaiting: getAwaiting(merged), collected: merged },
    };
    if (isComplete(merged)) return { state: newState, ready: merged as ProjectSlots };
    return { state: await promptNextSlot(msg, newState, merged) };
  }

  // Subject step: treat whole message as the subject name, validate against grade.
  // No NLP/number resolution needed — the message IS the subject.
  if (awaiting === "subject" && text.trim()) {
    const normalized = normalizeSubject(text.trim(), collected.grade);
    if (!normalized) {
      const gradeStr = collected.grade ?? "your grade";
      const examples = (SUBJECTS_BY_GRADE[collected.grade ?? ""] ?? []).slice(0, 5).join(", ");
      await msg.reply(
        `I don't recognise "${text.trim()}" as a ZIMSEC subject for ${gradeStr}.\n\n` +
        `Examples: ${examples}${examples ? "…" : ""}\n\nPlease try again.`,
      );
      return { state };
    }
    // Auto-assign category immediately — no need to ask
    const merged = withAutoFields({ ...collected, subject: normalized });
    const newState: ConversationState = {
      ...state,
      mode: { kind: "project_brief", awaiting: getAwaiting(merged), collected: merged },
    };
    if (isComplete(merged)) return { state: newState, ready: merged as ProjectSlots };
    return { state: await promptNextSlot(msg, newState, merged) };
  }

  // Centre / candidate leave-blank: student hasn't registered for exams yet.
  // Set the missing number(s) to "_" as a placeholder and remind them to update later.
  if ((awaiting === "centre" || awaiting === "candidate") && isLeaveBlank(text)) {
    const merged: Collected = { ...collected };
    // When both are missing (centre step) blank both in one go
    if (!merged.centreNumber)  merged.centreNumber  = "_";
    if (!merged.candidateNumber) merged.candidateNumber = "_";

    const newState: ConversationState = {
      ...state,
      mode: { kind: "project_brief", awaiting: getAwaiting(merged), collected: merged },
    };
    if (isComplete(merged)) {
      await msg.reply(PROJECT_NUMBER_BLANK_REMINDER);
      return { state: newState, ready: merged as ProjectSlots };
    }
    await msg.reply(PROJECT_NUMBER_BLANK_REMINDER);
    return { state: await promptNextSlot(msg, newState, merged) };
  }

  // Topic step: user types their own topic or "next" to let the AI choose.
  if (awaiting === "title") {
    // "next", "skip", "auto", blank → AI will generate the topic (empty string)
    const AUTO = /^(next|skip|auto|generate|let\s+(ai|pass|you)\s+(choose|decide|generate)|no\s+(title|topic))\s*$/i;
    const chosenTitle = AUTO.test(text.trim()) ? "" : text.trim();
    const merged = withAutoFields({ ...collected, title: chosenTitle });
    const newState: ConversationState = {
      ...state,
      mode: { kind: "project_brief", awaiting: getAwaiting(merged), collected: merged },
    };
    if (isComplete(merged)) return { state: newState, ready: merged as ProjectSlots };
    return { state: await promptNextSlot(msg, newState, merged) };
  }

  // ── Number selection: deterministic, bypass NLP entirely ─────────────────
  // parseInt handles inputs like "2", "2Combined science" — the leading digit
  // is enough to identify the selection.
  const num = parseInt(text.trim(), 10);

  if (!isNaN(num)) {
    let directSlot: Partial<Collected> | null = null;

    if (awaiting === "grade" && GRADE_BY_NUMBER[num]) {
      directSlot = { grade: GRADE_BY_NUMBER[num] };
    }

    if (directSlot) {
      // Valid number — apply immediately, skip regex/NLP entirely
      const merged = withAutoFields({ ...collected, ...directSlot });
      const newState: ConversationState = {
        ...state,
        mode: { kind: "project_brief", awaiting: getAwaiting(merged), collected: merged },
      };
      if (isComplete(merged)) return { state: newState, ready: merged as ProjectSlots };
      return { state: await promptNextSlot(msg, newState, merged) };
    }
  }

  // ── Free-text: NLP / regex extraction ─────────────────────────────────────
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

  // Merge into collected (only fill gaps — don't overwrite confirmed values).
  // Category is excluded: it's always auto-assigned, never NLP-extracted.
  const merged: Collected = { ...collected };
  for (const k of Object.keys(extracted) as (keyof HbcFields)[]) {
    if (k === "category") continue; // always auto-assigned
    if (extracted[k] && !merged[k as keyof Collected]) {
      (merged as Record<string, string | undefined>)[k] = extracted[k];
    }
  }
  // Auto-assign category as soon as subject is known
  const mergedWithAuto = withAutoFields(merged);

  const newState: ConversationState = {
    ...state,
    mode: {
      kind: "project_brief",
      awaiting: getAwaiting(mergedWithAuto),
      collected: mergedWithAuto,
    },
  };

  if (isComplete(mergedWithAuto)) {
    return { state: newState, ready: mergedWithAuto as ProjectSlots };
  }

  return { state: await promptNextSlot(msg, newState, mergedWithAuto) };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isComplete(c: Collected): c is ProjectSlots {
  return !!(
    c.studentName && c.schoolName && c.centreNumber && c.candidateNumber &&
    c.grade && c.subject && c.category &&
    c.title !== undefined   // "" is valid (AI-generated topic)
  );
}

function missingFields(c: Collected): (keyof Collected)[] {
  // category is excluded — always auto-assigned, never extracted from user text
  const all: (keyof Collected)[] = ["studentName", "schoolName", "centreNumber", "candidateNumber", "grade", "subject", "title"];
  return all.filter((k) => c[k] === undefined);
}

function getAwaiting(c: Collected): Awaiting {
  if (!c.studentName) return "name";
  if (!c.schoolName) return "school";
  if (!c.centreNumber && !c.candidateNumber) return "centre";
  if (!c.centreNumber) return "centre";
  if (!c.candidateNumber) return "candidate";
  if (!c.grade) return "grade";
  if (!c.subject) return "subject";
  // category is auto-assigned — skip directly to topic
  if (c.title === undefined) return "title";
  return "title";  // unreachable — isComplete would have caught it
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
    case "school":
      await msg.reply(PROJECT_ASK_SCHOOL);
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
      await msg.reply(PROJECT_ASK_SUBJECT);
      break;
    case "title":
      await msg.reply(PROJECT_ASK_TITLE);
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

/**
 * Normalise a raw subject string against the allowed subjects for a grade.
 * Returns the canonical name or undefined if no match is found.
 */
function normalizeSubject(raw: string, grade: string | undefined): string | undefined {
  const allowed = grade ? (SUBJECTS_BY_GRADE[grade] ?? []) : Object.values(SUBJECTS_BY_GRADE).flat();
  const t = raw.trim().toLowerCase();

  // 1. Exact match
  const exact = allowed.find((s) => s.toLowerCase() === t);
  if (exact) return exact;

  // 2. Substring — longer names first to avoid "Science" winning over "Combined Science"
  const sorted = [...allowed].sort((a, b) => b.length - a.length);
  const sub = sorted.find((s) => t.includes(s.toLowerCase()) || s.toLowerCase().includes(t));
  if (sub) return sub;

  // 3. Common abbreviations
  const abbrev: Record<string, string> = {
    maths: "Mathematics", math: "Mathematics",
    phys: "Physics", chem: "Chemistry", bio: "Biology",
    geo: "Geography", hist: "History", agric: "Agriculture",
    eng: "English", lit: "English Literature", "english lit": "English Literature",
    "combined sci": "Combined Science", "comb sci": "Combined Science",
    sociol: "Sociology", "heritage": "Heritage Studies",
    shona: "Shona", ndebele: "Shona/Ndebele",
    sci: "Science", "rel": "Religious and Moral Education",
    "food": "Food and Nutrition", "comp": "Computer Science",
  };
  for (const [key, val] of Object.entries(abbrev)) {
    if (t.includes(key) && allowed.find((s) => s === val)) return val;
  }

  return undefined;
}
