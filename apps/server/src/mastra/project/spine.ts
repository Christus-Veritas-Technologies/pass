/**
 * Project "spine" — a fast structured planning call that pins every
 * cross-section fact BEFORE the sections are generated in parallel.
 *
 * This is what keeps independently-generated stages coherent: dependent stages
 * ("link back to Stage 1.3", "compare against Stage 2.2") read these shared
 * facts instead of sections that don't exist yet at fan-out time.
 *
 * When the student supplies their own outline, the same call also returns an
 * ordered `sections` list derived from that outline, so fan-out adapts
 * dynamically rather than being hard-coded to the canonical 6 stages.
 */

import { projectAgent } from "../agents/project.agent";
import { PROJECT_PROBLEM_FOCUS } from "../projectVoice";
import { gradeSpec, isALevel, type SectionUnit } from "./sections";

/** Normalised input shared by the web controller and the WhatsApp flow. */
export type ProjectInput = {
  grade: string;
  subject: string;
  category?: string;
  /** Student-chosen title; "" or undefined means "AI chooses". */
  title?: string;
  /** Student-provided outline/guide; "" or undefined means none. */
  outline?: string;
  isGroupProject?: boolean;
};

export type ProjectSpine = {
  title: string;
  place: string;
  problem: string;
  intent: string;
  specifications: string[];
  relatedIdeas: { name: string; gist: string; strengths: string; weaknesses: string }[];
  solutions: { name: string; gist: string }[];
  chosenSolution: string;
  justification: string;
  respondents: { name: string; role: string }[];
  dataset: string;
};

export type SpineResult = {
  spine: ProjectSpine;
  /** Present only when the student supplied an outline (dynamic structure). */
  sections?: SectionUnit[];
};

/** Drain a Mastra agent stream into a string (stream() for reliable abort). */
async function drain(streamPromise: ReturnType<typeof projectAgent.stream>): Promise<string> {
  const result = await streamPromise;
  let text = "";
  for await (const chunk of result.textStream) text += chunk;
  return text;
}

/** Extract the first balanced JSON object from a (possibly fenced) string. */
function extractJson(raw: string): unknown {
  const fenced = raw.replace(/```json\s*/gi, "").replace(/```/g, "");
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("spine: no JSON object found in model output");
  }
  return JSON.parse(fenced.slice(start, end + 1));
}

/** Render the spine as a compact context block injected into every section call. */
export function renderSpineContext(spine: ProjectSpine): string {
  const specs = spine.specifications.map((s, i) => `  ${i + 1}. ${s}`).join("\n");
  const ideas = spine.relatedIdeas
    .map((r, i) => `  ${i + 1}. ${r.name} — ${r.gist} (strengths: ${r.strengths}; weaknesses: ${r.weaknesses})`)
    .join("\n");
  const sols = spine.solutions.map((s, i) => `  ${i + 1}. ${s.name} — ${s.gist}`).join("\n");
  const people = spine.respondents.map((p) => `  - ${p.name} (${p.role})`).join("\n");
  return `PROJECT FACTS — these are FIXED. Every section MUST stay consistent with them. Do NOT contradict, rename, or re-invent any of these:
- Project title: ${spine.title}
- Place (use throughout): ${spine.place}
- The problem: ${spine.problem}
- Statement of intent: ${spine.intent}
- Design specifications:
${specs}
- Related ideas investigated (Stage 2):
${ideas}
- Possible solutions (Stage 3):
${sols}
- Chosen solution (Stage 4): ${spine.chosenSolution}
- Why it was chosen: ${spine.justification}
- Named community members / respondents (reuse these exact names, do not invent new ones):
${people}
- Shared dataset / key findings (all tables and numbers across the project must agree with this):
${spine.dataset}`;
}

function buildSpinePrompt(input: ProjectInput): string {
  const g = gradeSpec(input.grade);
  const pronoun = input.isGroupProject ? "We" : "I";
  const aLevel = isALevel(input.grade)
    ? " This is Advanced Level: pick a problem with enough depth for quantitative observations and analytical/evaluative treatment."
    : "";
  const titleLine = input.title?.trim()
    ? `The student has ALREADY chosen this title — use it exactly: "${input.title.trim()}".`
    : `Choose a specific, authentic, descriptive title that names a real, LOCAL Zimbabwean community or school problem and how it is solved (e.g. "Using Moringa Leaves to Purify Borehole Water in Chivi District"). Do NOT use vague titles ("Progress", "My Project") or broad national/futuristic themes.`;

  const outlineBlock = input.outline?.trim()
    ? `

THE STUDENT SUPPLIED THIS OUTLINE — the project MUST follow it. In addition to the spine, return a "sections" array: an ordered list of { "label": short name, "guide": what to write in that section including any sub-headings and an explicit word-count target } covering every point of the outline in order, with word targets summing to about ${g.total} words. Do not add sections the outline does not mention; do not omit any.
---
${input.outline.trim()}
---`
    : "";

  return `You are planning a ZIMSEC Heritage-Based Curriculum project for a ${input.grade} student studying ${input.subject}${input.category ? ` (category: ${input.category})` : ""}.${aLevel}

${PROJECT_PROBLEM_FOCUS}

${titleLine}
The student writes in the first person as "${pronoun}".

Return ONLY a JSON object (no prose, no code fences) with this exact shape:
{
  "title": "the project title",
  "place": "specific village/township, district and province in Zimbabwe",
  "problem": "one tight paragraph stating the real local problem",
  "intent": "one paragraph: what ${pronoun} set out to achieve and for whom",
  "specifications": ["${g.specCount >= 4 ? "at least 4" : "at least 3"} concrete, measurable design specifications"],
  "relatedIdeas": [{"name":"","gist":"one line","strengths":"one line","weaknesses":"one line"}],
  "solutions": [{"name":"","gist":"one line"}],
  "chosenSolution": "which of the solutions was chosen",
  "justification": "one line on why it was chosen over the others",
  "respondents": [{"name":"plausible Zimbabwean full name","role":"e.g. village elder, local farmer, science teacher"}],
  "dataset": "the concrete numbers and findings the project's tables and analysis will all use — be specific and internally consistent"
}
Provide exactly 3 relatedIdeas, exactly 3 solutions, and 3-5 respondents.${outlineBlock}`;
}

/** Coerce parsed JSON into a safe spine, tolerating missing/loose fields. */
function coerceSpine(obj: Record<string, unknown>, input: ProjectInput): ProjectSpine {
  const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
  return {
    title: str(obj.title, input.title?.trim() || `${input.subject} Heritage Project`),
    place: str(obj.place),
    problem: str(obj.problem),
    intent: str(obj.intent),
    specifications: arr(obj.specifications).map((s) => str(s)).filter(Boolean),
    relatedIdeas: arr(obj.relatedIdeas).map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      return { name: str(o.name), gist: str(o.gist), strengths: str(o.strengths), weaknesses: str(o.weaknesses) };
    }),
    solutions: arr(obj.solutions).map((s) => {
      const o = (s ?? {}) as Record<string, unknown>;
      return { name: str(o.name), gist: str(o.gist) };
    }),
    chosenSolution: str(obj.chosenSolution),
    justification: str(obj.justification),
    respondents: arr(obj.respondents).map((p) => {
      const o = (p ?? {}) as Record<string, unknown>;
      return { name: str(o.name), role: str(o.role) };
    }),
    dataset: str(obj.dataset),
  };
}

/** Coerce a loose sections array (outline path) into SectionUnits. */
function coerceSections(obj: Record<string, unknown>, grade: string): SectionUnit[] | undefined {
  if (!Array.isArray(obj.sections) || obj.sections.length === 0) return undefined;
  const per = Math.round(gradeSpec(grade).total / obj.sections.length);
  return obj.sections.map((s, i) => {
    const o = (s ?? {}) as Record<string, unknown>;
    const label = typeof o.label === "string" && o.label ? o.label : `Section ${i + 1}`;
    const guide = typeof o.guide === "string" ? o.guide : label;
    const targetWords = typeof o.targetWords === "number" ? o.targetWords : per;
    return { id: `outline_${i + 1}`, label, guide, targetWords };
  });
}

/**
 * Generate the project spine (and, on the outline path, dynamic sections).
 * `streamPromise` is created lazily so withRetry can re-issue a fresh call.
 */
export async function generateSpine(input: ProjectInput): Promise<SpineResult> {
  const prompt = buildSpinePrompt(input);
  const raw = await drain(
    projectAgent.stream(prompt, { abortSignal: AbortSignal.timeout(90 * 1000) }),
  );
  const parsed = extractJson(raw) as Record<string, unknown>;
  return {
    spine: coerceSpine(parsed, input),
    sections: coerceSections(parsed, input.grade),
  };
}
