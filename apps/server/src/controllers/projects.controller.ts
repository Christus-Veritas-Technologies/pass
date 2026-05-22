import { streamText } from "ai";
import { streamSSE } from "hono/streaming";
import type { Context } from "hono";

import prisma from "@pass/db";
import { anthropic, CLAUDE_MODEL } from "../lib/anthropic";

const VALID_GRADES = ["Grade 7", "Form 4", "Form 6"];

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

  // Support both old format (subject, topic, grade) and new HBC format
  const isHbc = !body?.topic && body?.centreNumber;

  if (isHbc) {
    if (!body?.subject || !body?.grade || !body?.centreNumber || !body?.candidateNumber) {
      return c.json({ error: "subject, grade, centreNumber, and candidateNumber are required" }, 400);
    }
    if (!VALID_GRADES.includes(body.grade)) {
      return c.json({ error: `grade must be one of: ${VALID_GRADES.join(", ")}` }, 400);
    }
  } else {
    if (!body?.subject || !body?.topic || !body?.grade) {
      return c.json({ error: "subject, topic, and grade are required" }, 400);
    }
  }

  const {
    subject,
    grade,
    centreNumber    = "",
    candidateNumber = "",
    studentName     = "Student",
    category        = "Culture & History",
    topic: legacyTopic,
  } = body as {
    subject: string; grade: string;
    centreNumber?: string; candidateNumber?: string;
    studentName?: string; category?: string;
    topic?: string;
  };

  const year = new Date().getFullYear();

  const prompt = isHbc
    ? `You are an expert in ZIMSEC Heritage-Based Education 5.0. Generate a complete, formal ZIMSEC HBC project document for a ${grade} student.

Student: ${studentName}
Centre Number: ${centreNumber}
Candidate Number: ${candidateNumber}
Subject: ${subject}
Category: ${category}
Grade: ${grade}
Year: ${year}

First, choose a specific, authentic, and compelling project title within the "${category}" category for ${subject} at ${grade} level. The topic must be grounded in Zimbabwean heritage and align with the HBC 5.0 curriculum.

Then write the complete project with these exact sections:

# [Your chosen project title]

## Candidate Information
Centre Number: ${centreNumber}
Candidate Number: ${candidateNumber}
Name: ${studentName}
Grade: ${grade}
Subject: ${subject}
Year: ${year}

## Introduction
[Background, rationale, and clear objectives — 200-300 words. Ground it firmly in Zimbabwean heritage context.]

## Methodology
[How data was collected — oral interviews with community elders, field visits, library research, surveys. Be specific and realistic. 150-200 words.]

## Data Presentation and Analysis
[Findings in structured subsections with clear headings. Tables or numbered lists where appropriate. 400-600 words.]

## Recommendations and Conclusion
[Practical recommendations for preserving the heritage/practice. Tie back to HBC 5.0 philosophy. 150-200 words.]

## References
[4-5 realistic references: ZIMSEC syllabus docs, textbooks, named community interviews, government publications.]

Write formally and academically in British English. Make the content authentic and specific to Zimbabwe.`
    : `You are an expert ZIMSEC tutor creating a structured study project for a ${grade} student.

Subject: ${subject}
Topic: ${legacyTopic}

Write a comprehensive study guide in Markdown. Include:
1. A clear definition / overview of the topic
2. Key concepts and principles, explained simply
3. Important formulas, equations, or facts (formatted clearly)
4. Worked examples where relevant
5. Common exam questions and how to approach them
6. 3-5 quick exam tips

Use clear headings (##), bullet points, and **bold** for emphasis.`;

  let projectId: string | null = null;
  let accumulatedContent = "";

  return streamSSE(c, async (stream) => {
    try {
      const placeholderTopic = isHbc ? `${category} — ${subject} (${grade})` : legacyTopic!;

      const project = await prisma.project.create({
        data: {
          userId, grade, subject,
          topic: placeholderTopic,
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

      // Extract AI-chosen title from first # heading
      const titleMatch = accumulatedContent.match(/^#\s+(.+)$/m);
      const finalTopic = titleMatch ? titleMatch[1]!.trim() : placeholderTopic;

      await prisma.project.update({
        where: { id: projectId },
        data: { content: accumulatedContent, topic: finalTopic },
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

// ─── HTML export (user prints to PDF from browser) ────────────────────────────

export async function exportProjectHtml(c: Context) {
  const userId = c.get("userId") as string;
  const id = c.req.param("id");
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId) {
    return c.json({ error: "Project not found" }, 404);
  }

  function mdToHtml(md: string): string {
    const lines = md.split("\n");
    const out: string[] = [];
    for (const raw of lines) {
      let line = raw
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      if (line.startsWith("# "))   { out.push(`<h1>${line.slice(2)}</h1>`);  continue; }
      if (line.startsWith("## "))  { out.push(`<h2>${line.slice(3)}</h2>`);  continue; }
      if (line.startsWith("### ")) { out.push(`<h3>${line.slice(4)}</h3>`);  continue; }
      if (line.startsWith("- ") || line.startsWith("* ")) { out.push(`<li>${line.slice(2)}</li>`); continue; }
      if (line.match(/^\d+\.\s/))  { out.push(`<li>${line.replace(/^\d+\.\s/, "")}</li>`); continue; }
      if (line.trim() === "")       { out.push("<br>");  continue; }
      out.push(`<p>${line}</p>`);
    }
    return out.join("\n");
  }

  const year = new Date(project.createdAt).getFullYear();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${project.topic}</title>
<style>
  @page { size: A4; margin: 25mm 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Georgia", serif; font-size: 12pt; line-height: 1.7; color: #111; background: #fff; }
  .cover { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; border-bottom: 3px solid #222; padding: 40px; page-break-after: always; }
  .cover .org { font-size: 11pt; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; color: #555; margin-bottom: 60px; }
  .cover h1 { font-size: 22pt; line-height: 1.3; margin-bottom: 16px; }
  .cover .subtitle { font-size: 13pt; color: #555; }
  .cover .meta { font-size: 11pt; color: #444; line-height: 2.2; margin-top: 48px; border: 1px solid #ddd; padding: 20px 32px; }
  .cover .meta strong { color: #111; }
  h1 { font-size: 18pt; margin: 28px 0 10px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
  h2 { font-size: 14pt; margin: 22px 0 8px; }
  h3 { font-size: 12pt; margin: 16px 0 6px; }
  p  { margin-bottom: 10px; text-align: justify; }
  li { margin-left: 24px; margin-bottom: 5px; }
  br { display: block; margin: 4px 0; }
  .print-banner { padding: 12px 16px; background: #eef2ff; border-bottom: 1px solid #c7d2fe; font-family: sans-serif; font-size: 13px; color: #3730a3; }
  @media print { .print-banner { display: none; } }
</style>
</head>
<body>
  <div class="print-banner">
    📄 To save as PDF: <strong>File → Print → Save as PDF</strong> (or Ctrl+P / Cmd+P)
  </div>
  <div class="cover">
    <div class="org">Zimbabwe School Examinations Council</div>
    <h1>${project.topic}</h1>
    <div class="subtitle">Heritage-Based Curriculum Project</div>
    <div class="meta">
      <strong>Name:</strong> ${project.studentName || "—"}<br>
      <strong>Centre Number:</strong> ${project.centreNumber || "—"}<br>
      <strong>Candidate Number:</strong> ${project.candidateNumber || "—"}<br>
      <strong>Grade:</strong> ${project.grade}<br>
      <strong>Subject:</strong> ${project.subject}<br>
      <strong>Category:</strong> ${project.category || "—"}<br>
      <strong>Year:</strong> ${year}
    </div>
  </div>
  ${mdToHtml(project.content)}
</body>
</html>`;

  c.header("Content-Type", "text/html; charset=utf-8");
  c.header("Content-Disposition", `inline; filename="HBC_Project_${project.candidateNumber || project.id}.html"`);
  return c.body(html);
}
