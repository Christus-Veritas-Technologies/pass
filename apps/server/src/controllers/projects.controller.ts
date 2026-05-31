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
  } = body as {
    centreNumber?: string;
    candidateNumber?: string;
    studentName?: string;
    schoolName?: string;
    grade: string;
    subject: string;
    isGroupProject?: boolean;
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

  const SUPPORTED_SUBJECTS = new Set([
    "mathematics", "english language", "combined science", "physics",
    "chemistry", "biology", "agriculture", "history", "geography",
    "commerce", "accounting", "computer science", "food and nutrition",
    "shona", "ndebele", "literature in english", "sociology", "economics",
    "heritage studies", "religious and moral education", "art", "music",
  ]);
  if (!SUPPORTED_SUBJECTS.has(subject.trim().toLowerCase())) {
    return c.json({ error: `"${subject}" is not a recognised or supported ZIMSEC subject. Please check the spelling and try again.` }, 400);
  }

  const year = new Date().getFullYear();
  const displayName = studentName || "_";
  const pronoun = isGroupProject ? "We" : "I";

  const wordTargets = grade === "Grade 7"
    ? { total: 1500, stage2: "150–200", stage4: "120–160" }
    : grade === "Form 4"
    ? { total: 3000, stage2: "300–400", stage4: "250–350" }
    : { total: 5500, stage2: "500–650", stage4: "400–550" };

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

  const prompt = `Generate a COMPLETE, FORMAL ZIMSEC Heritage-Based Curriculum (HBC) 5.0 project for a ${grade} student studying ${subject}.

STUDENT DETAILS (embed these in the document as data only):
- Name: ${displayName}${schoolName ? `\n- School: ${schoolName}` : ""}
- Centre Number: ${centreNumber || "_"}
- Candidate Number: ${candidateNumber || "_"}
- Level: ${grade}
- Subject: ${subject}
- Year: ${year}
${aLevelNote}
CRITICAL INSTRUCTIONS:
1. Do NOT include a Cover Page or Candidate Information section — the document cover is generated separately. Start your output directly with the H1 project title.
2. Choose a specific, descriptive project title that names exactly what is being investigated (e.g. "Using Moringa Leaves to Purify Borehole Water in Chivi District"). Do NOT use vague titles like "Progress", "My Project", or "${subject} Project".
3. Write entirely in first person. Use "${pronoun}" throughout — as a Zimbabwean student who genuinely carried out this investigation.
4. Avoid AI-sounding phrases: "It is important to note that…", "In conclusion, it can be said…", "Furthermore, it should be noted…". Write naturally with curiosity and personal observations.
5. Every section must contain real, specific Zimbabwean content — actual provinces, real institutions, authentic cultural practices, named community members with plausible Zimbabwean names.
6. Minimum total word count: ${wordTargets.total} words. Do NOT pad with repetition — every paragraph must add substance.

EXACT OUTPUT STRUCTURE (follow this precisely):

# [Your specific project title]

## Stage 1: Problem Identification

### 1.1 Description of the Problem or Need
[Describe the heritage-based problem being investigated. What currently exists, what gap or challenge is present, and why it matters in the Zimbabwean context. Write in first person. 150–200 words.]

### 1.2 Statement of Intent
[State precisely what the project aims to achieve — a clear, measurable objective starting with "${pronoun} aim to…" or "${pronoun} set out to…". 70–110 words.]

### 1.3 Specifications and Constraints
[List 5–7 numbered requirements the final outcome must meet. Include practical constraints: available materials, community acceptance, cost, and alignment with heritage values.]

## Stage 2: Investigation of Related Ideas

### 2.1 Research Findings
[Present findings from research — interviews with named community elders, field visits to specific locations, library sources, or surveys. Organise under 3 clear sub-headings relevant to the topic. ${wordTargets.stage2} words total. Use at least ONE table of comparative or historical data.]

### 2.2 Analysis of Existing Approaches

**Approach A: [Name a relevant traditional or modern method]**
- Merits: [3 specific advantages with Zimbabwean context]
- Demerits: [3 specific disadvantages]

**Approach B: [Name a second method]**
- Merits: [3 specific advantages]
- Demerits: [3 specific disadvantages]

**Approach C: [Name a third method]**
- Merits: [3 specific advantages]
- Demerits: [3 specific disadvantages]

## Stage 3: Generation of Possible Solutions

[Propose 3 distinct possible solutions to the problem from Stage 1. For each, describe the concept and how it addresses the specifications. Number them clearly. 80–120 words each.]

**Solution 1 — [Descriptive title]:** [Description]

**Solution 2 — [Descriptive title]:** [Description]

**Solution 3 — [Descriptive title]:** [Description]

## Stage 4: Development and Refinement

### 4.1 Selected Solution
[State which of the three solutions ${pronoun.toLowerCase()} chose and why in one clear sentence.]

### 4.2 Justification of Choice
[Explain why this solution was chosen over the others. Reference the specifications from Stage 1 and the analysis from Stage 2. ${wordTargets.stage4} words.]

### 4.3 Development Process
[Describe how the chosen solution was developed, refined, or implemented step by step. Include materials, methods, people involved, locations visited, and modifications made during development. Write in first person with specific detail. ${wordTargets.stage4} words.]

### 4.4 Challenges Encountered and How They Were Overcome
[Describe 3–4 real challenges faced during the project and how ${pronoun.toLowerCase()} addressed each one. 100–150 words.]

## Stage 5: Evaluation

### 5.1 Assessment Against Specifications
[Evaluate how well the completed project meets each specification listed in Stage 1.3. Go through them systematically. 150–200 words.]

### 5.2 Strengths and Limitations
[Comment on what worked well and what could be improved if ${pronoun.toLowerCase()} were to repeat the project. 100–150 words.]

### 5.3 Overall Conclusion
[Tie together what was learned and the value of this investigation for Zimbabwean heritage preservation. 100–150 words.]

## References
[List 6–8 realistic references: ZIMSEC curriculum documents, named community elders with village/district, school library textbooks with author and year, government publications, and field visit locations. Use a consistent citation format.]
${specialCharRules}`;

  let projectId: string | null = null;
  let accumulatedContent = "";

  return streamSSE(c, async (stream) => {
    try {
      const project = await prisma.project.create({
        data: {
          userId,
          grade,
          subject,
          topic: "",
          content: "",
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
      const topic = titleMatch?.[1]?.trim() ?? `${subject} HBC Project`;

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
