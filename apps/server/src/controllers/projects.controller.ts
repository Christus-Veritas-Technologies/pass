import { streamText } from "ai";
import { streamSSE } from "hono/streaming";
import type { Context } from "hono";

import prisma from "@pass/db";
import { anthropic, CLAUDE_MODEL } from "../lib/anthropic";

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
  if (!body?.subject || !body?.topic || !body?.grade) {
    return c.json({ error: "subject, topic, and grade are required" }, 400);
  }

  const { subject, topic, grade } = body as { subject: string; topic: string; grade: string };

  const prompt = `You are an expert ZIMSEC tutor creating a structured study project for a ${grade} student.

Subject: ${subject}
Topic: ${topic}

Write a comprehensive study guide in Markdown. Include:
1. A clear definition / overview of the topic
2. Key concepts and principles, explained simply
3. Important formulas, equations, or facts (formatted clearly)
4. Worked examples where relevant
5. Common exam questions and how to approach them
6. 3-5 quick exam tips

Use clear headings (##), bullet points, and **bold** for emphasis. Write as if teaching directly to the student. Keep language accessible for a Zimbabwean secondary school student.`;

  let projectId: string | null = null;
  let accumulatedContent = "";

  return streamSSE(c, async (stream) => {
    try {
      // Create DB record first to get a real ID
      const project = await prisma.project.create({
        data: { userId, grade, subject, topic, content: "" },
      });
      projectId = project.id;

      await stream.writeSSE({ data: projectId, event: "project_id" });

      const result = streamText({
        model: anthropic(CLAUDE_MODEL),
        prompt,
        maxTokens: 1500,
      });

      for await (const chunk of result.textStream) {
        accumulatedContent += chunk;
        await stream.writeSSE({ data: chunk, event: "chunk" });
      }

      // Update DB record with generated content
      await prisma.project.update({
        where: { id: projectId },
        data: { content: accumulatedContent },
      });

      await stream.writeSSE({ data: projectId, event: "done" });
    } catch (err) {
      console.error("generateProject stream error:", err);
      // Clean up empty record if content was never generated
      if (projectId && !accumulatedContent) {
        await prisma.project.delete({ where: { id: projectId } }).catch(() => null);
      }
      await stream.writeSSE({ data: "AI response unavailable.", event: "error" });
    }
  });
}
