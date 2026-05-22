import { streamText } from "ai";
import { streamSSE } from "hono/streaming";
import type { Context } from "hono";

import prisma from "@pass/db";
import { anthropic, CLAUDE_MODEL } from "../lib/anthropic";
import { verifyAccessToken } from "../lib/jwt";

const VALID_GRADES = ["Grade 7", "Form 4", "Form 6"] as const;

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
  if (!body?.subject || !body?.grade || !body?.category) {
    return c.json({ error: "subject, grade, and category are required" }, 400);
  }

  const {
    centreNumber = "",
    candidateNumber = "",
    studentName = "",
    grade,
    subject,
    category,
  } = body as {
    centreNumber?: string;
    candidateNumber?: string;
    studentName?: string;
    grade: string;
    subject: string;
    category: string;
  };

  if (!VALID_GRADES.includes(grade as (typeof VALID_GRADES)[number])) {
    return c.json({ error: `grade must be one of: ${VALID_GRADES.join(", ")}` }, 400);
  }

  const year = new Date().getFullYear();
  const displayName = studentName || "Student";

  const prompt = `You are an expert in ZIMSEC Heritage-Based Education (HBC) 5.0. Generate a complete, authentic ZIMSEC HBC project document for a ${grade} student. Follow the exact stage-based structure used in real ZIMSEC submissions.

Candidate Details:
- Name: ${displayName}
- Centre Number: ${centreNumber}
- Candidate Number: ${candidateNumber}
- Level: ${grade}
- Learning Area: ${subject}
- Category: ${category}
- Year: ${year}

First, select a specific, authentic project topic within the "${category}" category for ${subject} at ${grade} level. The topic must be rooted in Zimbabwean heritage and align with the HBC 5.0 curriculum.

Then produce the complete project using EXACTLY this structure:

# [Your chosen project title]

## Cover Page
**Name:** ${displayName}
**Centre Number:** ${centreNumber}
**Candidate Number:** ${candidateNumber}
**Level:** ${grade}
**Learning Area:** ${subject}
**Category:** ${category}
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
          category,
        },
      });
      projectId = project.id;

      await stream.writeSSE({ data: projectId, event: "project_id" });

      const result = streamText({
        model: anthropic(CLAUDE_MODEL),
        prompt,
        maxTokens: 4000,
      });

      for await (const chunk of result.textStream) {
        accumulatedContent += chunk;
        await stream.writeSSE({ data: chunk, event: "chunk" });
      }

      // Extract the first # heading as the stored topic
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

export async function getProjectHtml(c: Context) {
  // Accept token from Authorization header OR ?token= query param (for new-tab opens)
  let userId: string | null = null;
  const authHeader = c.req.header("Authorization");
  const queryToken = c.req.query("token");
  const rawToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : queryToken ?? null;

  if (!rawToken) return c.json({ error: "Unauthorized" }, 401);
  try {
    const payload = await verifyAccessToken(rawToken);
    userId = payload.sub;
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const id = c.req.param("id");
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId) {
    return c.json({ error: "Project not found" }, 404);
  }

  const contentHtml = project.content
    .split("\n")
    .map((line) => {
      if (line.startsWith("# ")) return `<h1>${esc(line.slice(2))}</h1>`;
      if (line.startsWith("## ")) return `<h2>${esc(line.slice(3))}</h2>`;
      if (line.startsWith("### ")) return `<h3>${esc(line.slice(4))}</h3>`;
      if (line.startsWith("- ") || line.startsWith("* ")) return `<li>${esc(line.slice(2))}</li>`;
      if (line.match(/^\d+\.\s/)) return `<li>${esc(line.replace(/^\d+\.\s/, ""))}</li>`;
      if (line.trim() === "") return "<br/>";
      return `<p>${esc(line).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")}</p>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${esc(project.topic)} — ZIMSEC HBC Project</title>
<style>
  @page { size: A4; margin: 25mm 20mm; }
  body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.6; color: #000; max-width: 170mm; margin: 0 auto; }
  .cover { text-align: center; page-break-after: always; padding-top: 40mm; }
  .cover-header { font-size: 14pt; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 24px; }
  .cover-title { font-size: 18pt; font-weight: bold; margin: 32px 0; line-height: 1.4; }
  .cover-meta { font-size: 12pt; line-height: 2.2; margin-top: 40px; }
  h1 { font-size: 16pt; font-weight: bold; margin: 24px 0 12px; border-bottom: 1px solid #000; padding-bottom: 4px; }
  h2 { font-size: 14pt; font-weight: bold; margin: 20px 0 8px; }
  h3 { font-size: 12pt; font-weight: bold; margin: 16px 0 6px; }
  p { margin: 6px 0; text-align: justify; }
  li { margin: 4px 0; margin-left: 24px; }
  strong { font-weight: bold; }
  .print-tip { background: #f0f4ff; border: 1px solid #c7d3f5; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px; font-family: sans-serif; font-size: 13px; }
  @media print { .print-tip { display: none; } body { max-width: none; } }
</style>
</head>
<body>
<div class="cover">
  <div class="cover-header">ZIMSEC Heritage-Based Curriculum Project</div>
  <div class="cover-title">${esc(project.topic)}</div>
  <div class="cover-meta">
    <div><strong>Name:</strong> ${esc(project.studentName || "Student")}</div>
    <div><strong>Centre Number:</strong> ${esc(project.centreNumber || "—")}</div>
    <div><strong>Candidate Number:</strong> ${esc(project.candidateNumber || "—")}</div>
    <div><strong>Grade:</strong> ${esc(project.grade)}</div>
    <div><strong>Subject:</strong> ${esc(project.subject)}</div>
    <div><strong>Category:</strong> ${esc(project.category)}</div>
    <div><strong>Year:</strong> ${new Date(project.createdAt).getFullYear()}</div>
  </div>
</div>
<div class="print-tip">
  <strong>To save as PDF:</strong> Press <kbd>Ctrl+P</kbd> (or Cmd+P on Mac) and choose "Save as PDF".
</div>
${contentHtml}
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
