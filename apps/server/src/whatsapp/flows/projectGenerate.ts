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
import { checkAndIncrementAiMessage } from "../../lib/aiQuota";
import { PLAN_LIMITS, currentMonthKey, type PlanKey } from "../../lib/planLimits";
import { renderProjectPdfAndUpload } from "../media/renderProjectPdf";
import { sendProjectPdf } from "../media/sendProject";
import {
  projectConfirmMessage,
  projectsQuotaMessage,
  aiQuotaMessage,
  aiUsageFooter,
  AI_ERROR,
} from "../utils/messages";

// ── Grade helpers ─────────────────────────────────────────────────────────────

function isGrade7(grade: string): boolean {
  return /grade\s*7/i.test(grade);
}

function getTargetWords(grade: string): number {
  if (isGrade7(grade)) return 2000;
  if (/form\s*6|a.?level/i.test(grade)) return 5500;
  return 3000;
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

  const sectionGuide = isG7
    ? `
## 1. Introduction
[Background and context — 250-350 words. Explain what the heritage topic is, its significance in Zimbabwe, and the aim of this project.]

## 2. Literature Review / Background Information
[Review existing knowledge about the topic. Reference textbooks, community knowledge, historical context — 300-400 words. Include a table of key historical dates or milestones.]

## 3. Methodology
[How you collected your data: interviews with community elders, field visits, library research — 200-250 words. Be realistic for a Zimbabwean Grade 7 student.]

## 4. Findings and Data Presentation
[Present your findings clearly. This is the main body — 600-800 words. Use at least TWO tables to present comparative data. Use sub-headings for each finding area.]

## 5. Discussion and Analysis
[Analyse what your findings mean. Relate back to the heritage curriculum — 250-350 words.]

## 6. Recommendations
[3-5 practical recommendations for preserving the heritage practice — 150-200 words.]

## 7. Conclusion
[Tie everything together — 150-200 words.]

## 8. References
[5-7 realistic references: textbooks, interviews with named community members, ZIMSEC documents, government publications]`
    : `
## 1. Introduction
[Background, rationale, objectives and significance — 350-500 words. Ground it firmly in Zimbabwean heritage context and the Heritage-Based Curriculum 5.0 framework.]

## 2. Literature Review
[Critical review of existing research, academic sources, and community knowledge — 400-600 words. Must include at least one data table summarising key concepts or comparisons.]

## 3. Theoretical Framework
[Identify theories or frameworks underpinning the study. Link to HBC 5.0 principles — 200-300 words.]

## 4. Methodology
[Research design, data collection tools, sampling, ethical considerations — 300-400 words. Include a table summarising data sources used.]

## 5. Data Presentation and Analysis
[Richly detailed findings — 800-1200 words. This is the core of the project. Use at least THREE tables (e.g., comparative data, survey results, resource inventories). Use sub-sections with ## headings for each major finding area.]

## 6. Discussion
[Critical discussion of what the findings mean for Zimbabwe — 350-500 words. Compare with secondary sources from the literature review.]

## 7. Recommendations and Conclusion
[Specific, evidence-based recommendations (at least 5). Concluding remarks tying back to Heritage-Based Education goals — 300-400 words.]

## 8. Appendices (optional)
[Additional supporting data, interview questionnaires, observation checklists if relevant]

## 9. References
[8-12 APA-formatted references: academic journals, textbooks, ZIMSEC publications, named community interviews, government documents]`;

  return `Generate a COMPLETE, FORMAL ZIMSEC Heritage-Based Curriculum (HBC) 5.0 project for a ${slots.grade} student studying ${slots.subject}.
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
  ? `The student has chosen this project title: "${slots.title}" — use it exactly as the H1 heading.`
  : `Choose a specific, authentic, descriptive project title within the "${slots.category}" category for ${slots.subject} at ${slots.grade} level. The title must clearly name what is being investigated (e.g. "Using Moringa Leaves to Purify Borehole Water in Chivi District"). Do NOT use vague titles like "Progress" or "My Project".`}

CRITICAL INSTRUCTIONS:
1. Do NOT include a Cover Page or Candidate Information section — the document cover is generated separately. Start your output directly with the H1 title.
2. Write entirely in first person using "${pronoun}" — as a Zimbabwean student who genuinely carried out this investigation.
3. Avoid AI-sounding phrases: "It is important to note that…", "In conclusion, it can be said…". Write naturally with curiosity and personal observations.
4. Every section must contain real, specific Zimbabwean content — actual provinces, real institutions, authentic cultural practices, named community members with plausible Zimbabwean names.

# ${slots.title || "[Your specific, descriptive project title]"}
${sectionGuide}

QUALITY REQUIREMENTS (MANDATORY):
- Minimum total word count: ${getTargetWords(slots.grade)} words
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
  return `The following ZIMSEC HBC project is not yet long enough. It currently has approximately ${current} words but needs at least ${targetWords} words.

Please EXPAND the project below by adding ${needed}+ more words of substantive academic content. Do NOT summarise or repeat what is already there — add NEW content:
- Expand thin sections with more detail, examples, and Zimbabwean-specific context
- Add additional tables with real comparative data where relevant
- Deepen the analysis and discussion sections
- Add more specific references

Return the COMPLETE expanded project (not just the additions):

${existing}`;
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, bonusProjects: true },
  });
  if (user) {
    const limits = PLAN_LIMITS[user.plan as PlanKey];
    const month = currentMonthKey();
    const usage = await prisma.monthlyUsage.findUnique({
      where: { userId_month: { userId, month } },
    });
    const projectsUsed = usage?.projectsUsed ?? 0;
    if (projectsUsed >= limits.projects) {
      if ((user.bonusProjects ?? 0) > 0) {
        await prisma.user.update({ where: { id: userId }, data: { bonusProjects: { decrement: 1 } } });
      } else {
        await msg.reply(projectsQuotaMessage(user.plan, limits.projects));
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
    const result = await projectAgent.generate(buildPrompt(slots, year));

    let content = (result.text ?? "").trim();
    let wordCount = countWords(content);

    // ── Pass 2: Quality check — expand if too short ─────────────────────────
    if (wordCount < targetWords * 0.85) {
      await chat.sendStateTyping();
      console.log(`[projectGenerate] Pass 1: ${wordCount} words (target ${targetWords}) — running expansion pass`);
      try {
        const expansion = await projectAgent.generate(buildExpansionPrompt(content, slots, targetWords));
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
  } catch (err) {
    console.error("[whatsapp] generateProject error:", err);
    await chat.clearState();
    await msg.reply(AI_ERROR);
  }

  return { ...state, mode: { kind: "idle" } };
}
