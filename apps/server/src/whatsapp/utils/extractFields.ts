/**
 * Extracts HBC project fields from free-form user text.
 *
 * Uses a two-pass approach:
 * 1. Regex — zero cost, zero latency, handles obvious patterns
 * 2. Mastra extractionAgent (Haiku) — only when regex misses needed fields AND
 *    NLP is allowed.
 *
 * NLP is disabled in rigid mode (quota exhausted) to avoid AI calls.
 */

import { extractionAgent, extractionSchema } from "../../mastra/agents/extraction.agent";

export interface HbcFields {
  studentName?: string;
  schoolName?: string;
  centreNumber?: string;
  candidateNumber?: string;
  grade?: string;
  subject?: string;
  category?: string;
}

const VALID_GRADES = ["Grade 7", "Form 4", "Form 6"] as const;
const VALID_CATEGORIES = ["Culture & History", "Indigenous Sciences", "Arts & Lifestyle"] as const;

const ALL_SUBJECTS = [
  "Heritage Studies", "Mathematics", "English", "Science", "Shona/Ndebele",
  "History", "Combined Science", "Agriculture", "Biology", "Chemistry",
  "Geography", "Shona", "English Literature", "Sociology", "Physics",
];

function regexExtract(text: string): HbcFields {
  const fields: HbcFields = {};
  const t = text.trim();

  // Name: "my name is X", "I am X", "I'm X", "name: X"
  const nameMatch = t.match(/(?:(?:my\s+)?name\s+is|I\s+am|I'm)\s+([A-Za-z][A-Za-z\s]{1,39})/i)
    ?? t.match(/^name[:\s]+([A-Za-z][A-Za-z\s]{1,39})/i);
  if (nameMatch?.[1]) fields.studentName = nameMatch[1].trim().replace(/,.*$/, "").trim();

  // School name: "my school is X", "school: X", "I go to X", "I attend X"
  const schoolMatch = t.match(/(?:my\s+school\s+(?:is|name\s+is)|school[:\s]+|I\s+(?:go\s+to|attend)\s+)\s*([A-Za-z][A-Za-z0-9\s'.-]{1,59})/i);
  if (schoolMatch?.[1]) fields.schoolName = schoolMatch[1].trim().replace(/[.,;].*$/, "").trim();

  // Centre number: "centre 1234", "centre number 1234", "centre: 1234"
  const centreMatch = t.match(/centre(?:\s+(?:number|no\.?|#))?[:\s]+(\d{3,8})/i)
    ?? t.match(/c(?:entre)?[:\s](\d{4,8})\b/i);
  if (centreMatch) fields.centreNumber = centreMatch[1];

  // Candidate number: "candidate 5678", "cand no 5678"
  const candMatch = t.match(/candidate(?:\s+(?:number|no\.?|#))?[:\s]+(\d{3,8})/i)
    ?? t.match(/cand(?:idate)?\.?\s*(?:no\.?|#)?[:\s]+(\d{3,8})/i);
  if (candMatch) fields.candidateNumber = candMatch[1];

  // Grade — match canonical names
  for (const g of VALID_GRADES) {
    if (t.toLowerCase().includes(g.toLowerCase())) { fields.grade = g; break; }
  }
  // Also handle "grade7", "form4" without space
  if (!fields.grade) {
    if (/grade\s*7/i.test(t)) fields.grade = "Grade 7";
    else if (/form\s*4/i.test(t)) fields.grade = "Form 4";
    else if (/form\s*6/i.test(t)) fields.grade = "Form 6";
  }

  // Subject — sort by length descending so "Combined Science" matches before "Science",
  // "English Literature" before "English", etc. Without this, the shorter substring
  // wins and is then rejected by the per-grade validator, causing an infinite loop.
  const tl2 = t.toLowerCase();
  const sortedSubjects = [...ALL_SUBJECTS].sort((a, b) => b.length - a.length);
  for (const s of sortedSubjects) {
    if (tl2.includes(s.toLowerCase())) { fields.subject = s; break; }
  }
  // Shorthand
  if (!fields.subject) {
    if (/\bmath/i.test(t)) fields.subject = "Mathematics";
    else if (/\bphys/i.test(t)) fields.subject = "Physics";
    else if (/\bchem/i.test(t)) fields.subject = "Chemistry";
    else if (/\bbio/i.test(t)) fields.subject = "Biology";
    else if (/\bgeo/i.test(t)) fields.subject = "Geography";
    else if (/\bshona/i.test(t)) fields.subject = "Shona";
    else if (/\bagric/i.test(t)) fields.subject = "Agriculture";
    else if (/\bsociol/i.test(t)) fields.subject = "Sociology";
  }

  // Category — match canonical name or keyword
  const tl = t.toLowerCase();
  if (!fields.category) {
    if (VALID_CATEGORIES.some((c) => tl.includes(c.toLowerCase()))) {
      fields.category = VALID_CATEGORIES.find((c) => tl.includes(c.toLowerCase()));
    } else if (/\b(cultur|histor|totem|liberation|clan|folktale|custom|marriage|tradition)\b/i.test(t)) {
      fields.category = "Culture & History";
    } else if (/\b(indigenous|science|herb|medicin|biogas|solar|farm|organic)\b/i.test(t)) {
      fields.category = "Indigenous Sciences";
    } else if (/\b(art|music|architect|food|game|dance|craft|lifestyle|sport)\b/i.test(t)) {
      fields.category = "Arts & Lifestyle";
    }
  }

  return fields;
}

/**
 * Extract HBC project fields from the user's message.
 *
 * @param text     Raw user message
 * @param needed   Fields still needed (only extract these)
 * @param useNlp   If false, regex-only (rigid mode)
 */
export async function extractHbcFields(
  text: string,
  needed: (keyof HbcFields)[],
  useNlp = true,
): Promise<HbcFields> {
  const regex = regexExtract(text);

  if (!useNlp) return regex;

  // If regex covered all needed fields, skip the Haiku call
  const stillNeeded = needed.filter((k) => !regex[k]);
  if (stillNeeded.length === 0) return regex;

  try {
    const result = await extractionAgent.generate(text, {
      structuredOutput: { schema: extractionSchema },
    });

    const extracted = result.object;
    if (!extracted) return regex;

    // Drop nulls, then merge: regex takes precedence (more deterministic), NLP fills gaps.
    const nlp: HbcFields = {};
    for (const [k, v] of Object.entries(extracted)) {
      if (v != null && v !== "") (nlp as Record<string, string>)[k] = String(v);
    }
    return { ...nlp, ...regex };
  } catch {
    return regex;
  }
}
