/**
 * HBC project generation flow.
 * Uses the ZIMSEC Heritage-Based Education 5.0 prompt, generates markdown,
 * renders to PDF via @react-pdf/renderer, and sends as a WhatsApp document.
 *
 * Quality guardrails:
 * - Grade 7: minimum 2 000 words, minimum 10 PDF pages
 * - Form 4 / Form 6: minimum 3 500 words, minimum 14 PDF pages
 * - If the first pass is too short, a second "expand" call is made.
 */

import prisma from "@pass/db";
import type { Client, Message } from "whatsapp-web.js";
import type { ConversationState } from "../types";
import type { ProjectSlots } from "./projectBrief";
import { projectAgent } from "../../mastra/agents/project.agent";
import { PROJECT_VOICE, PROJECT_VOICE_ALEVEL, PROJECT_PROBLEM_FOCUS } from "../../mastra/projectVoice";
import { withRetry } from "../../mastra/retry";
import { checkAndIncrementAiMessage } from "../../lib/aiQuota";
import { PLAN_LIMITS, currentMonthKey, type PlanKey, AMBASSADOR_LIMIT } from "../../lib/planLimits";
import { renderProjectPdfAndUpload } from "../media/renderProjectPdf";
import { sendProjectPdf } from "../media/sendProject";
import {
  projectConfirmMessage,
  projectsQuotaMessage,
  aiQuotaMessage,
  aiUsageFooter,
  AI_ERROR,
  WHAT_NEXT,
} from "../utils/messages";

// ── Grade helpers ─────────────────────────────────────────────────────────────

function isGrade7(grade: string): boolean {
  return /grade\s*7/i.test(grade);
}

function getTargetWords(grade: string): number {
  if (isGrade7(grade)) return 3000;
  if (/form\s*6|a.?level/i.test(grade)) return 7000;
  return 4500;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildPrompt(slots: ProjectSlots, year: number): string {
  const displayName = slots.studentName === "_" ? "_" : (slots.studentName || "_");
  const isG7 = isGrade7(slots.grade);
  const isA = /form\s*6|a.?level/i.test(slots.grade);
  const pronoun = (slots as ProjectSlots & { isGroupProject?: boolean }).isGroupProject ? "We" : "I";

  const aLevelNote = isA
    ? `\nA-LEVEL DEPTH REQUIREMENT: This is Advanced Level. Write with university-entrance academic depth. Include quantitative observations, cite named Zimbabwean institutions or researchers where realistic, and demonstrate analytical and evaluative thinking beyond simple description.\n`
    : "";

  // ── Official ZIMSEC HBC 6-stage structure ──────────────────────────────────
  // Derived from the ZIMSEC learner guide and A-Level marking guide.
  // All three levels use the same 6 stages; depth and word counts scale.

  const sectionGuide = isG7
    ? `
## Stage 1: Problem Identification

### 1.1 Problem Description
[Describe the specific issue, need, or heritage gap being addressed — 200-270 words. Name the community, province and cultural context. Be concrete and specific to Zimbabwe.]

### 1.2 Statement of Intent
[A clear statement of how you intend to address the problem — 160-220 words. Explain your goal and what a successful solution will look like.]

### 1.3 Design Specifications
[State at least 3 requirements your final solution must satisfy — 160-220 words. Present as a table:
| Specification | Justification |
|---|---|
]

## Stage 2: Investigation of Related Ideas

[Introduce this investigation in 60-80 words. Explain why you are examining existing ideas before creating your own.]

### Related Idea 1: [Descriptive name]
[Describe the existing idea — 130-180 words. How does it work? Where is it used in Zimbabwe?]
**Strengths:** [2 specific strengths, explained — 80-110 words]
**Weaknesses:** [2 specific weaknesses, explained — 80-110 words]

### Related Idea 2: [Descriptive name]
[Same structure]

### Related Idea 3: [Descriptive name]
[Same structure]

### Summary Comparison
[Table comparing all three ideas:
| Idea | Key Strength | Key Weakness | Suitable for Our Context? |
|---|---|---|---|
]

## Stage 3: Generation of Ideas / Possible Solutions

[Introduce your own original ideas in 60-80 words.]

### Possible Solution 1: [Descriptive name]
[Describe your original idea — 130-180 words]
**Advantages:** [2 specific advantages]
**Disadvantages:** [2 specific disadvantages]

### Possible Solution 2: [Descriptive name]
[Same structure]

### Possible Solution 3: [Descriptive name]
[Same structure]

### Comparison Table
| Solution | Core Feature | Ease of Implementation | Expected Impact |
|---|---|---|---|

## Stage 4: Development / Refinement of Chosen Idea

### 4.1 Chosen Solution
[State which solution you chose — 60-80 words.]

### 4.2 Justification of Choice
[Give at least 2 reasons, each a full paragraph — 180-250 words. Link back to Stage 1 design specifications.]

### 4.3 Refinements and Developments
[Describe 3 specific improvements made to the chosen solution — 320-430 words total.]
**Refinement 1:** [Name and description]
**Refinement 2:** [Name and description]
**Refinement 3:** [Name and description]

### 4.4 Background Research
[Supporting research from textbooks, community elders, local sources — 380-520 words. Include:
| Source | Key Finding | Relevance to This Project |
|---|---|---|
]

### 4.5 Implementation Plan
[Materials needed and steps followed — 220-300 words. Include:
| Material/Resource | Purpose | Source |
|---|---|---|
]

## Stage 5: Presentation of Final Solution

### 5.1 The Final Solution
[Full description of the completed solution — 280-380 words. State how it meets each specification from Stage 1.]

### 5.2 Data and Findings
[Present your observations and results — 420-560 words. Use at least TWO tables with header rows. Use ### sub-headings for each finding area.]

### 5.3 Quality and Standards
[How your solution meets school and community standards — 160-220 words]

## Stage 6: Evaluation and Recommendations

### 6.1 Relevance to Statement of Intent
[Evaluate how well the solution matches what you set out to do in Stage 1 — 160-220 words]

### 6.2 Challenges Encountered
[Describe specific challenges and how you dealt with them — 160-210 words. Include:
| Challenge | How It Was Addressed |
|---|---|
]

### 6.3 Recommendations
[4 specific, practical recommendations for improvement or future work — 220-290 words. Each as a full paragraph.]

## References
[6-8 references: textbooks with author and year, named community elders (full name, village), ZIMSEC documents]

FINAL CHECK: verify total word count is at least 3000. If short, expand Stage 4 and Stage 5.`

    : isA
    ? `
## Stage 1: Problem Identification

### 1.1 Problem Description
[Describe the specific problem, innovation or identified gap — 340-460 words. Provide quantitative context (statistics, surveys), name specific Zimbabwean communities, institutions, and stakeholders. Include a research question or hypothesis.]

### 1.2 Statement of Intent
[Precise statement of intent linking to the problem — 260-360 words. State exactly what you aim to achieve, for whom, and what a successful outcome will look like in concrete terms tied to the problem.]

### 1.3 Design Specifications / Project Parameters
[At least 4 measurable specifications — 260-360 words.
| Specification | Measurable Criterion | Justification |
|---|---|---|
]

## Stage 2: Investigation of Related Ideas

[Critical introduction to the investigation — 100-140 words. Justify the selection of these three areas.]

### Related Idea 1: [Descriptive name]
[Academic-depth evidence of this existing approach — 220-300 words. Cite named Zimbabwean researchers or institutions where realistic.]
**Strengths/Advantages:** [3 specific, analytically explained strengths — 140-190 words]
**Weaknesses/Limitations:** [3 specific, analytically explained weaknesses — 140-190 words]

### Related Idea 2: [Descriptive name]
[Same depth structure]

### Related Idea 3: [Descriptive name]
[Same depth structure]

### Critical Comparative Analysis
[Analytical comparison of all three ideas — 200-280 words. Include:
| Idea | Effectiveness | Resource Requirements | Zimbabwean Applicability | Overall Rating |
|---|---|---|---|---|
Conclude with which elements will inform Stage 3.]

## Stage 3: Generation of Ideas / Possible Solutions

[Academic introduction to your original solutions — 100-130 words. Explain how Stage 2 informed these ideas.]

### Possible Solution 1: [Descriptive name]
[Detailed description — 220-300 words. Include how this idea emerged from your Stage 2 analysis.]
**Advantages:** [3 analytically explained advantages]
**Disadvantages:** [3 analytically explained disadvantages]

### Possible Solution 2: [Descriptive name]
[Same depth]

### Possible Solution 3: [Descriptive name]
[Same depth]

### Comparative Evaluation
| Solution | Technical Feasibility | Resource Cost | Innovation Level | Alignment with Specifications |
|---|---|---|---|---|

## Stage 4: Development / Refinement of Chosen Idea

### 4.1 Indication of Choice
[Clearly state the chosen solution — 80-110 words.]

### 4.2 Justification of Choice
[At least 3 detailed reasons — 300-420 words. Reference each design specification from Stage 1 and explain how this solution best satisfies them. Cite relevant research.]

### 4.3 Refinements and Developments
[Three substantive developments/refinements — 600-820 words total, each as a clearly labelled sub-section. For each: initial state, what was changed, why, evidence of improvement.]
**Development 1:** [Name]
**Development 2:** [Name]
**Development 3:** [Name]
[Include a Before vs After comparison table:
| Aspect | Initial Design | Refined Design | Improvement Achieved |
|---|---|---|---|
]

### 4.4 Literature Review and Theoretical Framework
[Critical review of academic sources and community knowledge — 860-1100 words. Include at least TWO data tables summarising key research findings. Reference named Zimbabwean institutions or researchers. Identify the theoretical framework underpinning your approach.]

### 4.5 Methodology
[Research design, data collection instruments, sampling strategy, ethical considerations — 540-720 words. Include:
| Research Instrument | Target Respondents | Data Collected |
|---|---|---|
| Materials/Resources | Source | Quantity/Details |
|---|---|---|
]

## Stage 5: Presentation of Final Solution

### 5.1 Description of Final Solution
[Comprehensive description — 420-580 words. State how it meets each specification from Stage 1. Describe it to a standard that allows replication.]

### 5.2 Data Presentation and Analysis
[Rich findings with quantitative observations — 1400-1860 words. Use at least FOUR tables. Use ### sub-headings for each major finding area. Demonstrate analytical and evaluative thinking.]

### 5.3 Quality, Standards and Impact
[How the solution meets learning-area and international standards — 360-480 words. Address sustainability and community impact in Zimbabwe.]

## Stage 6: Evaluation and Recommendations

### 6.1 Relevance to Statement of Intent
[Critical self-evaluation — 280-380 words. Assess what was achieved versus intended. Use evidence from Stage 5 data.]

### 6.2 Challenges Encountered
[Analytical discussion of significant challenges — 240-320 words.
| Challenge | Impact on Project | Strategy Employed | Outcome |
|---|---|---|---|
]

### 6.3 Recommendations
[At least 6 evidence-based recommendations, each a full paragraph — 480-640 words. Address policy, practice, and further research.]

## References
[10-14 APA-formatted references: academic journals, textbooks, ZIMSEC publications, named community interviews, government documents]

FINAL CHECK: verify total word count is at least 7000. If short, expand Stage 5 (Data) and Stage 4 (Literature Review).`

    : `
## Stage 1: Problem Identification

### 1.1 Problem Description
[Describe the specific problem, innovation or identified gap — 240-330 words. Name the specific Zimbabwean community, context and stakeholders affected. Be concrete, not abstract.]

### 1.2 Statement of Intent
[Clear statement of how you intend to address the problem — 200-270 words. State your goal, your target beneficiaries in your community, and what a successful outcome will look like in concrete terms.]

### 1.3 Design Specifications / Project Parameters
[At least 3 measurable specifications — 200-270 words.
| Specification | Measurable Criterion | Justification |
|---|---|---|
]

## Stage 2: Investigation of Related Ideas

[Introduction — 80-100 words. Explain how you conducted this investigation and why these three ideas were selected.]

### Related Idea 1: [Descriptive name]
[Evidence of this existing idea — 180-250 words. Describe it with specific Zimbabwean references where applicable.]
**Strengths/Advantages:** [2-3 specific strengths, analytically explained — 120-160 words]
**Weaknesses/Limitations:** [2-3 specific weaknesses, analytically explained — 120-160 words]

### Related Idea 2: [Descriptive name]
[Same structure]

### Related Idea 3: [Descriptive name]
[Same structure]

### Comparative Summary
[Analytical comparison — 150-200 words.
| Idea | Key Strength | Key Weakness | Applicability to This Project |
|---|---|---|---|
]

## Stage 3: Generation of Ideas / Possible Solutions

[Introduction — 80-100 words. Explain how Stage 2 research informed your original ideas.]

### Possible Solution 1: [Descriptive name]
[Detailed description — 180-250 words]
**Advantages:** [2-3 advantages, each explained]
**Disadvantages:** [2-3 disadvantages, each explained]

### Possible Solution 2: [Descriptive name]
[Same structure]

### Possible Solution 3: [Descriptive name]
[Same structure]

### Solution Comparison Table
| Solution | Core Innovation | Feasibility | Resource Requirements | Expected Impact |
|---|---|---|---|---|

## Stage 4: Development / Refinement of Chosen Idea

### 4.1 Chosen Solution
[State which solution was chosen — 70-90 words]

### 4.2 Justification of Choice
[At least 2 full-paragraph reasons — 240-320 words. Reference the Stage 1 design specifications and Stage 2/3 findings to support your choice.]

### 4.3 Refinements and Developments
[Three specific improvements made to the solution — 440-600 words total. Label each clearly.]
**Development 1:** [Name and description]
**Development 2:** [Name and description]
**Development 3:** [Name and description]
[Include:
| Aspect | Initial Design | After Refinement | Reason for Change |
|---|---|---|---|
]

### 4.4 Background Research (Literature Review)
[Supporting research — 540-720 words. Include at least TWO tables of research findings. Reference Zimbabwean institutions, textbooks, community knowledge, and government sources.]

### 4.5 Methodology
[Data collection, materials, steps, ethical considerations — 380-510 words.
| Research Instrument | Purpose | Respondents/Source |
|---|---|---|
| Materials/Resources | Source | Quantity |
|---|---|---|
]

## Stage 5: Presentation of Final Solution

### 5.1 Final Solution Description
[Full description — 320-430 words. Demonstrate how it satisfies each specification from Stage 1.]

### 5.2 Data Presentation and Analysis
[Findings with analysis — 860-1150 words. Use at least THREE tables with header rows. Use ### sub-headings for each distinct finding area.]

### 5.3 Quality and Standards
[How the solution meets national and community standards — 240-320 words]

## Stage 6: Evaluation and Recommendations

### 6.1 Relevance to Statement of Intent
[Self-evaluate against what you set out to do in Stage 1 — 210-280 words. Use evidence from Stage 5.]

### 6.2 Challenges Encountered
[Describe at least 3 specific challenges — 190-250 words.
| Challenge | Impact | How Addressed |
|---|---|---|
]

### 6.3 Recommendations
[At least 4 specific, evidence-based recommendations, each a full paragraph — 320-420 words]

## References
[8-12 APA-formatted references: textbooks, ZIMSEC publications, named community interviews, government documents]

FINAL CHECK: verify total word count is at least 4500. If short, expand Stage 5 (Data) and Stage 4 (Literature Review).`;

  const outlineSection = slots.outline?.trim()
    ? `\n\nSTUDENT-PROVIDED OUTLINE — FOLLOW THIS STRICTLY. Your output MUST cover every point below in the same order. Do not add sections not mentioned in the outline. Do not omit any point.\n---\n${slots.outline.trim()}\n---\n`
    : "";

  return `Generate a COMPLETE, FORMAL ZIMSEC Heritage-Based Curriculum (HBC) 5.0 project for a ${slots.grade} student studying ${slots.subject}.${outlineSection}
This is NOT a summary — write the FULL, PUBLICATION-READY project with all sections fully developed.

STUDENT DETAILS (embed as data only):
- Name: ${displayName}
- School: ${slots.schoolName}
- Centre Number: ${slots.centreNumber}
- Candidate Number: ${slots.candidateNumber}
- Subject: ${slots.subject}
- Category / Theme: ${slots.category}
- Grade / Form: ${slots.grade}
- Year: ${year}
${aLevelNote}
${slots.title
  ? `The student has chosen this project title: "${slots.title}" — use it exactly as the H1 heading. Frame the whole project as solving this as a real, local community problem.`
  : `Choose a specific, authentic, descriptive project title within the "${slots.category}" category for ${slots.subject} at ${slots.grade} level. It must name a real, LOCAL community or school problem and how it will be solved (e.g. "Using Moringa Leaves to Purify Borehole Water in Chivi District"). Do NOT use vague titles like "Progress" or "My Project", and do NOT pick a broad, national or futuristic theme.`}

${PROJECT_PROBLEM_FOCUS}

CRITICAL INSTRUCTIONS:
1. Do NOT include a Cover Page or Candidate Information section — the document cover is generated separately. Start your output directly with the H1 title.
2. Write entirely in first person using "${pronoun}" — as a Zimbabwean student who genuinely carried out this investigation.
3. Avoid AI-sounding phrases: "It is important to note that…", "In conclusion, it can be said…". Write naturally with curiosity and personal observations.
4. Every section must contain real, specific Zimbabwean content — actual provinces, real institutions, authentic cultural practices, named community members with plausible Zimbabwean names.

${PROJECT_VOICE}${isA ? `\n${PROJECT_VOICE_ALEVEL}` : ""}

# ${slots.title || "[Your specific, descriptive project title]"}
${sectionGuide}

QUALITY REQUIREMENTS (MANDATORY):
- ABSOLUTE MINIMUM: ${getTargetWords(slots.grade)} words. Do NOT stop before this count. If you finish all sections and are below the minimum, expand Data Presentation and Literature Review before writing References.
- Write in formal, academic British English
- Every table MUST have a header row separated by |---|---| from the data rows
- Use **bold** for key terms and _italic_ for emphasis or sources
- Be specific to Zimbabwe: mention actual provinces, real institutions, authentic cultural practices
- Make all interview respondents have realistic Zimbabwean names and titles
- Data in tables must be realistic and internally consistent
- Do NOT pad with repetition — every paragraph must add substance

SPECIAL CHARACTER RULES (MANDATORY — the PDF renderer requires these):
- Chemical subscripts: use HTML tags — CO<sub>2</sub>, H<sub>2</sub>O, NH<sub>3</sub>
- Ion charges / exponents: Ca<sup>2+</sup>, x<sup>2</sup>, m<sup>3</sup> — use HTML sup tags
- NEVER use Unicode subscripts (₂ ₃) or superscripts (² ³) — use HTML tags above
- NEVER use Unicode Greek letters (α β γ π) — spell them out: alpha, beta, gamma, pi
- NEVER use Unicode arrows (→ ←) — use ASCII: ->, <-
- NEVER use Unicode math symbols (≥ ≤ √ ≠) — use ASCII: >=, <=, sqrt, != `;
}

function buildExpansionPrompt(existing: string, _slots: ProjectSlots, targetWords: number): string {
  const current = countWords(existing);
  const needed = targetWords - current;
  // Cap fed-back content to keep the expansion prompt from becoming excessively large
  const preview = existing.length > 12000 ? existing.slice(0, 12000) + "\n\n[content truncated for expansion pass]" : existing;
  return `The following ZIMSEC HBC project is not yet long enough. It currently has approximately ${current} words but needs at least ${targetWords} words.

Please EXPAND the project below by adding ${needed}+ more words of substantive academic content. Do NOT summarise or repeat what is already there — add NEW content:
- Expand thin sections with more detail, examples, and Zimbabwean-specific context
- Add additional tables with real comparative data where relevant
- Deepen the analysis and discussion sections
- Add more specific references

Return the COMPLETE expanded project (not just the additions):

${preview}`;
}

// ── Main generator ────────────────────────────────────────────────────────────

export async function generateProject(
  client: Client,
  msg: Message,
  slots: ProjectSlots,
  userId: string,
  state: ConversationState,
): Promise<ConversationState> {
  const chat = await msg.getChat();
  const whatsappId = chat.id._serialized;

  // ── Project quota check ───────────────────────────────────────────────────
  const month = currentMonthKey();
  const [user, usage] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true, bonusProjects: true, isAmbassador: true } }),
    prisma.monthlyUsage.findUnique({ where: { userId_month: { userId, month } } }),
  ]);
  if (user) {
    const projectLimit = user.isAmbassador ? AMBASSADOR_LIMIT : PLAN_LIMITS[user.plan as PlanKey].projects;
    const projectsUsed = usage?.projectsUsed ?? 0;
    if (projectsUsed >= projectLimit) {
      if (!user.isAmbassador && (user.bonusProjects ?? 0) > 0) {
        await prisma.user.update({ where: { id: userId }, data: { bonusProjects: { decrement: 1 } } });
      } else {
        await msg.reply(projectsQuotaMessage(user.plan, projectLimit));
        return { ...state, mode: { kind: "idle" } };
      }
    } else {
      await prisma.monthlyUsage.upsert({
        where: { userId_month: { userId, month } },
        create: { userId, month, papersUsed: 0, projectsUsed: 1, aiMessagesUsed: 0 },
        update: { projectsUsed: { increment: 1 } },
      });
    }
  }

  // ── AI quota check ────────────────────────────────────────────────────────
  const quota = await checkAndIncrementAiMessage(userId);
  if (!quota.allowed) {
    await msg.reply(aiQuotaMessage(user?.plan ?? "FREE", quota.limit));
    return { ...state, mode: { kind: "idle" } };
  }

  await msg.reply(projectConfirmMessage(slots));
  await msg.reply(
    `📝 Heads up — we're putting together a fully structured, high-quality project for you, so this one takes a bit longer than usual. Grab a snack, it should be ready within 2–5 minutes 🙂`,
  );
  await chat.sendStateTyping();

  const year = new Date().getFullYear();
  const targetWords = getTargetWords(slots.grade);

  // Create placeholder project row
  const project = await prisma.project.create({
    data: {
      userId,
      grade: slots.grade,
      subject: slots.subject,
      topic: "",
      content: "",
      outline: slots.outline?.trim() || null,
      centreNumber: slots.centreNumber,
      candidateNumber: slots.candidateNumber,
      studentName: slots.studentName,
      schoolName: slots.schoolName,
      category: slots.category,
    },
  });

  try {
    // ── Pass 1: Generate full project ───────────────────────────────────────
    await chat.sendStateTyping();
    // Project generation can take 2–5 min for long A-Level projects.
    // Pass an explicit 10-min abort signal to override any shorter default
    // inside Mastra / the AI SDK, which causes DOMException { TimeoutError }.
    const PROJECT_TIMEOUT = AbortSignal.timeout(10 * 60 * 1000);
    const result = await withRetry(() =>
      projectAgent.generate(buildPrompt(slots, year), { abortSignal: PROJECT_TIMEOUT }),
    );

    let content = (result.text ?? "").trim();
    let wordCount = countWords(content);

    // ── Pass 2: Quality check — expand if too short ─────────────────────────
    if (wordCount < targetWords * 0.70) {
      await chat.sendStateTyping();
      console.log(`[projectGenerate] Pass 1: ${wordCount} words (target ${targetWords}) — running expansion pass`);
      try {
        const expansion = await withRetry(() =>
          projectAgent.generate(buildExpansionPrompt(content, slots, targetWords), {
            abortSignal: AbortSignal.timeout(10 * 60 * 1000),
          }),
        );
        const expanded = (expansion.text ?? "").trim();
        if (countWords(expanded) > wordCount) {
          content = expanded;
          wordCount = countWords(content);
        }
      } catch (expandErr) {
        console.warn("[projectGenerate] Expansion pass failed, using Pass 1 content:", expandErr);
      }
    }

    console.log(`[projectGenerate] Final word count: ${wordCount} (target ${targetWords})`);

    // Use the user-supplied title if given, otherwise extract from the first # heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const topic = slots.title || titleMatch?.[1]?.trim() || `${slots.subject} HBC Project`;

    await prisma.project.update({
      where: { id: project.id },
      data: { content, topic },
    });

    // ── Render PDF and upload ───────────────────────────────────────────────
    try {
      const pdfUrl = await renderProjectPdfAndUpload(
        await prisma.project.findUniqueOrThrow({ where: { id: project.id } }),
      );
      if (pdfUrl) {
        await prisma.project.update({ where: { id: project.id }, data: { pdfUrl } });
      }
    } catch (pdfErr) {
      console.error("[whatsapp] generateProject PDF render/upload error:", pdfErr);
      // PDF failed — sendProjectPdf will use text fallback
    }

    await chat.clearState();

    const finalProject = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    await sendProjectPdf(client, whatsappId, finalProject);

    const footer = aiUsageFooter(quota.used, quota.limit, user?.plan ?? "FREE") ?? "";
    if (footer) await client.sendMessage(whatsappId, footer);

    // Clear context: user has their project — show the main menu so the next
    // message starts fresh rather than being interpreted as project follow-up.
    await client.sendMessage(whatsappId, WHAT_NEXT);
  } catch (err) {
    console.error("[whatsapp] generateProject error:", err);
    await chat.clearState();
    await msg.reply(AI_ERROR);
  }

  return { ...state, mode: { kind: "idle" } };
}
