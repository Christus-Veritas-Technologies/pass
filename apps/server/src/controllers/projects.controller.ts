import { streamSSE } from "hono/streaming";
import { readFile } from "node:fs/promises";
import type { Context } from "hono";

import prisma from "@pass/db";
import { projectAgent } from "../mastra/agents/project.agent";
import { verifyAccessToken } from "../lib/jwt";
import { buildProjectHtml } from "../lib/projectHtml";
import { renderProjectPdfAndUpload } from "../whatsapp/media/renderProjectPdf";
import { generateProjectPdfBuffer } from "../lib/projectPdfDocument";
import { generateProjectDocxBuffer } from "../lib/projectDocxDocument";
import { sendNotification } from "../lib/notifications";
import { isValidSubject, canonicalSubject } from "../lib/subjects";
import { PLAN_LIMITS, currentMonthKey, type PlanKey } from "../lib/planLimits";

const VALID_GRADES = ["Grade 7", "Form 4", "Form 6"] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Verify token from Authorization header or ?token= query param. */
async function resolveUserId(c: Context): Promise<string | null> {
  const authHeader = c.req.header("Authorization");
  const queryToken = c.req.query("token");
  const rawToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : (queryToken ?? null);

  if (!rawToken) return null;
  try {
    const payload = await verifyAccessToken(rawToken);
    return payload.sub;
  } catch {
    return null;
  }
}

// ─── Controllers ─────────────────────────────────────────────────────────────

export async function getProjects(c: Context) {
  const userId = c.get("userId") as string;
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ projects });
}

export async function getProject(c: Context) {
  const userId = c.get("userId") as string;
  const id = c.req.param("id");
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId) {
    return c.json({ error: "Project not found" }, 404);
  }
  return c.json({ project });
}

export async function generateProject(c: Context) {
  const userId = c.get("userId") as string;

  const body = await c.req.json().catch(() => null);
  if (!body?.subject || !body?.grade) {
    return c.json({ error: "subject and grade are required" }, 400);
  }

  const {
    centreNumber = "",
    candidateNumber = "",
    studentName = "",
    schoolName = "",
    grade,
    subject,
    isGroupProject = false,
    outline = "",
  } = body as {
    centreNumber?: string;
    candidateNumber?: string;
    studentName?: string;
    schoolName?: string;
    grade: string;
    subject: string;
    isGroupProject?: boolean;
    outline?: string;
  };

  if (!VALID_GRADES.includes(grade as (typeof VALID_GRADES)[number])) {
    return c.json({ error: `grade must be one of: ${VALID_GRADES.join(", ")}` }, 400);
  }

  if (centreNumber && !/^\d+$/.test(centreNumber.trim())) {
    return c.json({ error: "centreNumber must contain digits only" }, 400);
  }
  if (candidateNumber && !/^\d+$/.test(candidateNumber.trim())) {
    return c.json({ error: "candidateNumber must contain digits only" }, 400);
  }

  const subjectKey = subject.trim();
  if (!isValidSubject(subjectKey)) {
    return c.json({ error: `"${subject}" is not a recognised ZIMSEC subject. Check the spelling and try again (e.g. Mathematics, Biology, History).` }, 400);
  }
  // Use the canonical (properly-cased) name throughout
  const canonicalSub = canonicalSubject(subjectKey) ?? subjectKey;

  // ── Quota enforcement ─────────────────────────────────────────────────────────
  {
    const month = currentMonthKey();
    const [quotaUser, usage] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { plan: true, bonusProjects: true } }),
      prisma.monthlyUsage.findUnique({ where: { userId_month: { userId, month } } }),
    ]);
    if (quotaUser) {
      const limits = PLAN_LIMITS[quotaUser.plan as PlanKey];
      const projectsUsed = usage?.projectsUsed ?? 0;
      if (projectsUsed >= limits.projects) {
        if ((quotaUser.bonusProjects ?? 0) > 0) {
          await prisma.user.update({ where: { id: userId }, data: { bonusProjects: { decrement: 1 } } });
        } else {
          return c.json({ error: "Monthly project limit reached for your plan", limitReached: true, plan: quotaUser.plan, limit: limits.projects }, 402);
        }
      } else {
        await prisma.monthlyUsage.upsert({
          where: { userId_month: { userId, month } },
          create: { userId, month, papersUsed: 0, projectsUsed: 1 },
          update: { projectsUsed: { increment: 1 } },
        });
      }
    }
  }

  const year = new Date().getFullYear();
  const displayName = studentName || "_";
  const pronoun = isGroupProject ? "We" : "I";

  // Word targets sized so per-section totals comfortably exceed the minimum (10+ pages)
  const wordTargets = grade === "Grade 7"
    ? {
        total: 3000,
        s11: "280–380", s12: "100–140", s13: "120–170",
        stage2: "500–660", s22: "380–500", s3each: "150–210",
        stage4: "380–510", s44: "160–240",
        s51: "230–310", s52: "170–240", s53: "170–240",
        refs: 7,
      }
    : grade === "Form 4"
    ? {
        total: 4500,
        s11: "400–530", s12: "130–180", s13: "150–200",
        stage2: "760–970", s22: "520–690", s3each: "210–290",
        stage4: "540–700", s44: "210–290",
        s51: "300–400", s52: "210–290", s53: "210–290",
        refs: 8,
      }
    : {
        total: 7000,
        s11: "620–800", s12: "200–270", s13: "220–300",
        stage2: "1100–1430", s22: "830–1070", s3each: "300–420",
        stage4: "830–1070", s44: "290–390",
        s51: "460–600", s52: "340–460", s53: "340–460",
        refs: 10,
      };

  const aLevelNote = grade === "Form 6"
    ? `\nA-LEVEL DEPTH REQUIREMENT: This is an Advanced Level project. Write with university-entrance academic depth. Include quantitative observations, cite named Zimbabwean institutions or researchers where realistic, and demonstrate analytical and evaluative thinking that goes well beyond simple description. Each section should read as the work of a student who has genuinely engaged with this topic at an advanced level.\n`
    : "";

  const specialCharRules = `
SPECIAL CHARACTER RULES (the PDF renderer requires these — follow them exactly):
- Chemical subscripts: CO<sub>2</sub>, H<sub>2</sub>O, NH<sub>3</sub> — use HTML sub tags
- Ion charges / exponents: Ca<sup>2+</sup>, x<sup>2</sup>, m<sup>3</sup> — use HTML sup tags
- NEVER use Unicode subscripts (₂ ₃) or superscripts (² ³) — use HTML tags above
- NEVER use Unicode Greek letters (α β γ π) — spell them out: alpha, beta, gamma, pi
- NEVER use Unicode arrows (→ ←) — use ASCII: ->, <-
- NEVER use Unicode math symbols (≥ ≤ √ ≠) — use ASCII: >=, <=, sqrt, !=`;

  const outlineSection = outline.trim()
    ? `\n\nSTUDENT-PROVIDED OUTLINE — FOLLOW THIS STRICTLY. Your output MUST cover every point below in the same order. Do not add sections not mentioned in the outline. Do not omit any point.\n---\n${outline.trim()}\n---\n`
    : "";

  const prompt = `Generate a COMPLETE, FORMAL ZIMSEC Heritage-Based Curriculum (HBC) 5.0 project for a ${grade} student studying ${canonicalSub}.${outlineSection}

STUDENT DETAILS (embed these in the document as data only):
- Name: ${displayName}${schoolName ? `\n- School: ${schoolName}` : ""}
- Centre Number: ${centreNumber || "_"}
- Candidate Number: ${candidateNumber || "_"}
- Level: ${grade}
- Subject: ${canonicalSub}
- Year: ${year}
${aLevelNote}
CRITICAL INSTRUCTIONS:
1. Do NOT include a Cover Page or Candidate Information section — the document cover is generated separately. Start your output directly with the H1 project title.
2. Choose a specific, descriptive project title that names exactly what is being investigated (e.g. "Using Moringa Leaves to Purify Borehole Water in Chivi District"). Do NOT use vague titles like "Progress", "My Project", or "${canonicalSub} Project".
3. Write entirely in first person. Use "${pronoun}" throughout — as a Zimbabwean student who genuinely carried out this investigation.
4. Avoid AI-sounding phrases: "It is important to note that…", "In conclusion, it can be said…", "Furthermore, it should be noted…". Write naturally with curiosity and personal observations.
5. Every section must contain real, specific Zimbabwean content — actual provinces, real institutions, authentic cultural practices, named community members with plausible Zimbabwean names.
6. MANDATORY MINIMUM: ${wordTargets.total} words total. Every section MUST reach its stated word count. Do NOT stop early.

EXACT OUTPUT STRUCTURE (follow this precisely — hit every word-count target):

# [Your specific project title]

## Stage 1: Problem Identification

### 1.1 Description of the Problem or Need
[Describe the heritage-based problem being investigated — what currently exists, what gap or challenge is present, and why it matters in the Zimbabwean context. Write in first person with specific local detail. ${wordTargets.s11} words.]

### 1.2 Statement of Intent
[State precisely what the project aims to achieve. Begin with "${pronoun} aim to…" or "${pronoun} set out to…" and include measurable outcomes. ${wordTargets.s12} words.]

### 1.3 Specifications and Constraints
[List ${wordTargets.refs > 8 ? "7–9" : "5–7"} numbered specifications the final outcome must meet. Write each as a full sentence covering practical constraints: materials available, community acceptance, cost limits, and alignment with heritage values. ${wordTargets.s13} words total.]

## Stage 2: Investigation of Related Ideas

### 2.1 Research Findings
[Present findings from research — interviews with named community elders (give full names and roles), field visits to specific locations, library sources, and surveys. Organise under THREE clear sub-headings relevant to the topic. Each sub-section must be a full paragraph of substantive content. ${wordTargets.stage2} words total. Use at least TWO tables of comparative or historical data, each with a header row.]

### 2.2 Analysis of Existing Approaches
[Analyse THREE approaches (traditional, modern, and a hybrid or alternative) relevant to this project topic. For EACH approach write a full developed paragraph of merits (at least 3 specific advantages with Zimbabwean context) and a full paragraph of demerits (at least 3 specific disadvantages). Write in full sentences — do NOT use bullet lists. ${wordTargets.s22} words total.]

## Stage 3: Generation of Possible Solutions

[Propose THREE distinct possible solutions to the problem from Stage 1. For each, write a full developed paragraph describing the concept, how it addresses the specifications from Stage 1.3, why it is feasible in the Zimbabwean context, and what resources it requires. ${wordTargets.s3each} words each.]

**Solution 1 — [Descriptive title]:** [Full paragraph]

**Solution 2 — [Descriptive title]:** [Full paragraph]

**Solution 3 — [Descriptive title]:** [Full paragraph]

## Stage 4: Development and Refinement

### 4.1 Selected Solution
[State which solution ${pronoun.toLowerCase()} chose and the primary reason in 1–2 sentences.]

### 4.2 Justification of Choice
[Explain in full paragraphs why this solution was chosen over the others. Reference each specification from Stage 1.3 and compare against the approaches in Stage 2.2. ${wordTargets.stage4} words.]

### 4.3 Development Process
[Describe step-by-step how the solution was developed, refined, and implemented. Include: specific materials and quantities, named people consulted, locations visited with district and province, timeline, and modifications made along the way. Write in first person with vivid specific detail. ${wordTargets.stage4} words.]

### 4.4 Challenges Encountered and How They Were Overcome
[Describe 3–4 real, specific challenges encountered. For each: name the challenge, explain why it arose, and describe the concrete steps taken to overcome it. ${wordTargets.s44} words.]

## Stage 5: Evaluation

### 5.1 Assessment Against Specifications
[Evaluate how well the completed project meets EACH specification listed in Stage 1.3 — go through them one by one in full sentences. Be honest about partial successes. ${wordTargets.s51} words.]

### 5.2 Strengths and Limitations
[Two full paragraphs — first on strengths: what worked well and why. Second on limitations: what could be improved and what ${pronoun.toLowerCase()} would do differently. ${wordTargets.s52} words.]

### 5.3 Overall Conclusion
[Tie together what was learned, the value for Zimbabwean heritage preservation, and recommendations for future work. ${wordTargets.s53} words.]

FINAL CHECK — before writing References: verify your total word count has reached ${wordTargets.total} words. If not, expand Stage 2.1 (Research Findings) and Stage 4.3 (Development Process) before continuing.

## References
[List ${wordTargets.refs}–${wordTargets.refs + 3} realistic references in a consistent citation format: ZIMSEC curriculum documents (with year), named community elders (full name, village, district), school textbooks (author, title, publisher, year), government publications, and field visit locations.]
${specialCharRules}`;

  let projectId: string | null = null;
  let accumulatedContent = "";

  return streamSSE(c, async (stream) => {
    try {
      const project = await prisma.project.create({
        data: {
          userId,
          grade,
          subject: canonicalSub,
          topic: "",
          content: "",
          outline: outline.trim() || null,
          centreNumber,
          candidateNumber,
          studentName,
          schoolName,
          category: "",
        },
      });
      projectId = project.id;

      await stream.writeSSE({ data: projectId, event: "project_id" });

      const result = await projectAgent.stream(prompt);

      for await (const chunk of result.textStream) {
        accumulatedContent += chunk;
        // Ignore write failures — client may have navigated away; generation continues regardless
        await stream.writeSSE({ data: chunk, event: "chunk" }).catch(() => null);
      }

      const titleMatch = accumulatedContent.match(/^#\s+(.+)$/m);
      const topic = titleMatch?.[1]?.trim() ?? `${canonicalSub} HBC Project`;

      await prisma.project.update({
        where: { id: projectId },
        data: { content: accumulatedContent, topic },
      });

      // Notify the user on all connected channels (push + WhatsApp if linked)
      sendNotification(userId, "project_generated", { projectId, topic }).catch(() => null);

      await stream.writeSSE({ data: projectId, event: "done" }).catch(() => null);
    } catch (err) {
      console.error("generateProject stream error:", err);
      if (projectId && !accumulatedContent) {
        await prisma.project.delete({ where: { id: projectId } }).catch(() => null);
      }
      await stream.writeSSE({ data: "AI response unavailable.", event: "error" }).catch(() => null);
    }
  });
}

/** GET /projects/:id/html — screen-mode preview (iframe embed) */
export async function getProjectHtml(c: Context) {
  const userId = await resolveUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId) {
    return c.json({ error: "Project not found" }, 404);
  }

  const html = buildProjectHtml(project, "screen");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** GET /projects/:id/pdf — download as real PDF (puppeteer-rendered) */
export async function getProjectPdf(c: Context) {
  const userId = await resolveUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId) {
    return c.json({ error: "Project not found" }, 404);
  }

  // If we already have a cached PDF, stream it straight back
  if (project.pdfUrl && !project.pdfUrl.startsWith("file://")) {
    try {
      const resp = await fetch(project.pdfUrl);
      if (resp.ok) {
        const bytes = await resp.arrayBuffer();
        return pdfResponse(c, bytes, project);
      }
    } catch {
      // Cache miss — fall through to regenerate
    }
  }
  if (project.pdfUrl?.startsWith("file://")) {
    try {
      const bytes = await readFile(project.pdfUrl.replace("file://", ""));
      return pdfResponse(c, bytes.buffer as ArrayBuffer, project);
    } catch {
      // Tmp file gone — fall through to regenerate
    }
  }

  // Generate PDF using @react-pdf/renderer (no Puppeteer needed)
  let pdfBytes: Buffer;
  try {
    pdfBytes = await generateProjectPdfBuffer(project);
  } catch (err) {
    console.error("[pdf] generation failed:", err);
    return c.json({ error: "PDF generation failed. Please try again." }, 500);
  }

  // Persist to R2 or tmp for next request (non-fatal)
  try {
    const pdfUrl = await renderProjectPdfAndUpload(project);
    if (pdfUrl) {
      await prisma.project.update({ where: { id }, data: { pdfUrl } });
    }
  } catch {
    // Non-fatal — we still return the bytes we already have
  }

  return pdfResponse(c, pdfBytes.buffer as ArrayBuffer, project);
}

/** GET /projects/:id/docx — download as Word document */
export async function getProjectDocx(c: Context) {
  const userId = await resolveUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId) {
    return c.json({ error: "Project not found" }, 404);
  }

  let docxBytes: Buffer;
  try {
    docxBytes = await generateProjectDocxBuffer(project);
  } catch (err) {
    console.error("[docx] generation failed:", err);
    return c.json({ error: "Document generation failed. Please try again." }, 500);
  }

  const safeTitle = (project.topic || "project").replace(/[^a-zA-Z0-9 _-]/g, "").trim().replace(/\s+/g, "_");
  const suffix = project.candidateNumber && project.candidateNumber !== "_"
    ? `_${project.candidateNumber}`
    : `_${project.id.slice(-6)}`;
  const filename = `HBC_${safeTitle}${suffix}.docx`;

  return new Response(docxBytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(docxBytes.byteLength),
    },
  });
}

function pdfResponse(_c: Context, bytes: ArrayBuffer, project: { topic: string; candidateNumber: string; id: string }) {
  const safeTitle = (project.topic || "project").replace(/[^a-zA-Z0-9 _-]/g, "").trim().replace(/\s+/g, "_");
  const suffix = project.candidateNumber ? `_${project.candidateNumber}` : `_${project.id.slice(-6)}`;
  const filename = `HBC_${safeTitle}${suffix}.pdf`;

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(bytes.byteLength),
    },
  });
}
