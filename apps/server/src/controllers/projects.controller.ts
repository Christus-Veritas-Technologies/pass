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

  const prompt = `You are an expert in ZIMSEC Heritage-Based Education 5.0. Generate a complete, formal ZIMSEC HBC project document for a ${grade} student.

Student: ${displayName}
Centre Number: ${centreNumber}
Candidate Number: ${candidateNumber}
Subject: ${subject}
Category: ${category}
Grade: ${grade}
Year: ${year}

First, choose a specific, authentic topic within the "${category}" category for ${subject} at ${grade} level. The topic must be grounded in Zimbabwean heritage and align with the HBC 5.0 curriculum.

Then write the complete project with these exact sections:

# [Your chosen project title]

## Candidate Information
Centre Number: ${centreNumber}
Candidate Number: ${candidateNumber}
Name: ${displayName}
Grade: ${grade}
Subject: ${subject}
Year: ${year}

## Introduction
[Background, rationale, objectives — 200-300 words. Ground it in Zimbabwean heritage context.]

## Methodology
[How data was collected — interviews with community elders, field visits, library research, surveys. 150-200 words. Must be realistic for a Zimbabwean student.]

## Data Presentation and Analysis
[Findings presented in structured sections with clear headings. Include tables or lists where appropriate. 400-600 words. This is the main body.]

## Recommendations and Conclusion
[Practical recommendations for preserving the heritage/practice. Concluding remarks tying back to Heritage-Based Education. 150-200 words.]

## References
[3-5 realistic references: textbooks, interviews with named community members, government publications]

Write formally and academically. Use British English. Make the content authentic, detailed, and specific to Zimbabwe.`;

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
        maxTokens: 2500,
      });

      for await (const chunk of result.textStream) {
        accumulatedContent += chunk;
        await stream.writeSSE({ data: chunk, event: "chunk" });
      }

      // Extract the first # heading as the stored topic
      const titleMatch = accumulatedContent.match(/^#\s+(.+)$/m);
      const topic = titleMatch ? titleMatch[1].trim() : `${subject} HBC Project`;

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
