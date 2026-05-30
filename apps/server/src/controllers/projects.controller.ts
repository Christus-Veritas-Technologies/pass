import { streamSSE } from "hono/streaming";
import { readFile } from "node:fs/promises";
import type { Context } from "hono";

import prisma from "@pass/db";
import { projectAgent } from "../mastra/agents/project.agent";
import { verifyAccessToken } from "../lib/jwt";
import { buildProjectHtml } from "../lib/projectHtml";
import { renderProjectPdfAndUpload } from "../whatsapp/media/renderProjectPdf";
import { generateProjectPdfBuffer } from "../lib/projectPdfDocument";

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
  } = body as {
    centreNumber?: string;
    candidateNumber?: string;
    studentName?: string;
    schoolName?: string;
    grade: string;
    subject: string;
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
  const displayName = studentName || "Student";

  const prompt = `You are an expert in ZIMSEC Heritage-Based Education (HBC) 5.0. Generate a complete, authentic ZIMSEC HBC project document for a ${grade} student. Follow the exact stage-based structure used in real ZIMSEC submissions.

Candidate Details:
- Name: ${displayName}${schoolName ? `\n- School: ${schoolName}` : ""}
- Centre Number: ${centreNumber}
- Candidate Number: ${candidateNumber}
- Level: ${grade}
- Learning Area: ${subject}
- Year: ${year}

First, select a specific, authentic project topic for ${subject} at ${grade} level. The topic must be rooted in Zimbabwean heritage and align with the HBC 5.0 curriculum.

Then produce the complete project using EXACTLY this structure:

# [Your chosen project title]

## Cover Page
**Name:** ${displayName}${schoolName ? `\n**School:** ${schoolName}` : ""}
**Centre Number:** ${centreNumber}
**Candidate Number:** ${candidateNumber}
**Level:** ${grade}
**Learning Area:** ${subject}
**Year:** ${year}

## Stage 1: Problem Identification

### 1.1 Description of the Problem/Need
[Clearly describe the heritage-based problem or need being investigated. Explain what exists currently, what gap or challenge is present, and why this topic matters within the Zimbabwean context. 120–180 words.]

### 1.2 Statement of Intent
[State precisely what the project aims to achieve. Write as a clear, measurable objective. For example: "The aim of this project is to document and preserve…" 60–100 words.]

### 1.3 Specifications and Constraints
[List 4–6 specific requirements the final solution or outcome must meet. Include practical constraints such as available materials, community acceptance, cost, and alignment with heritage values. Use numbered points.]

## Stage 2: Investigation of Related Ideas

### 2.1 Research Findings
[Present findings from research — community elder interviews, field visits, library sources, or surveys. Organise under 2–3 clear sub-headings relevant to the topic. 250–350 words total.]

### 2.2 Analysis of Existing Approaches (Merits and Demerits)

**Existing Approach A: [Name a relevant traditional or modern method]**
- Merits: [2–3 specific advantages]
- Demerits: [2–3 specific disadvantages]

**Existing Approach B: [Name a second relevant method]**
- Merits: [2–3 specific advantages]
- Demerits: [2–3 specific disadvantages]

## Stage 3: Generation of Possible Solutions

[Propose 3 distinct possible solutions or approaches to address the problem identified in Stage 1. For each, briefly describe the concept and how it addresses the specifications. Number them clearly.]

**Solution 1:** [Title and description — 60–80 words]

**Solution 2:** [Title and description — 60–80 words]

**Solution 3:** [Title and description — 60–80 words]

## Stage 4: Development and Refinement

### 4.1 Indication of Chosen Solution
[State clearly which of the three solutions was selected.]

### 4.2 Justification of Choice
[Explain why this solution was chosen over the others. Reference the specifications from Stage 1 and the Merits/Demerits from Stage 2. 100–150 words.]

### 4.3 Development Details
[Describe how the chosen solution was developed, refined, or implemented. Include any steps taken, materials or methods used, and any modifications made during development. 150–200 words.]

## Evaluation

[Assess how well the completed project meets the specifications set in Stage 1. Comment on what worked well, what could be improved, and what was learned. Reference the original objectives. 120–160 words.]

## References
[List 4–6 realistic references including: ZIMSEC or government curriculum documents, named community elders with village/area, school library textbooks with author and year, and any field visit locations. Use a consistent citation format.]

Write formally and academically throughout. Use British English. Every section must contain real, specific Zimbabwean content — names of places, people, cultural practices, plants, historical events, or scientific knowledge authentic to Zimbabwe. Do not use generic placeholder text.`;

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
        await stream.writeSSE({ data: chunk, event: "chunk" });
      }

      const titleMatch = accumulatedContent.match(/^#\s+(.+)$/m);
      const topic = titleMatch?.[1]?.trim() ?? `${subject} HBC Project`;

      await prisma.project.update({
        where: { id: projectId },
        data: { content: accumulatedContent, topic },
      });

      await stream.writeSSE({ data: projectId, event: "done" });
    } catch (err) {
      console.error("generateProject stream error:", err);
      if (projectId && !accumulatedContent) {
        await prisma.project.delete({ where: { id: projectId } }).catch(() => null);
      }
      await stream.writeSSE({ data: "AI response unavailable.", event: "error" });
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
