import { streamText } from "ai";
import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import { anthropic, CLAUDE_MODEL } from "../lib/anthropic";

// In-memory store — replace with DB once Prisma is connected
const PROJECT_STORE: Record<string, {
  id: string;
  userId: string;
  grade: string;
  subject: string;
  topic: string;
  content: string;
  createdAt: string;
}> = {};

// Seed a couple of mock projects
const SEED: typeof PROJECT_STORE = {
  "proj_demo_1": {
    id: "proj_demo_1",
    userId: "demo",
    grade: "Form 4",
    subject: "Mathematics",
    topic: "Quadratic Equations",
    content: `# Quadratic Equations — Study Project

## What are Quadratic Equations?
A quadratic equation is a polynomial equation of degree 2, written in the form **ax² + bx + c = 0**, where a ≠ 0.

## Methods of Solving

### 1. Factorisation
Split the middle term so the product equals ac and the sum equals b.
**Example:** Solve x² + 5x + 6 = 0
→ (x + 2)(x + 3) = 0 → x = −2 or x = −3

### 2. Completing the Square
Rewrite ax² + bx + c in the form a(x + p)² + q.

### 3. The Quadratic Formula
x = (−b ± √(b² − 4ac)) / 2a
The discriminant b² − 4ac tells you how many solutions exist:
- > 0: two distinct real roots
- = 0: one repeated root
- < 0: no real roots

## Exam Tips
- Always check whether the equation can be factorised first — it is fastest.
- Show all working to earn method marks.
- Substitute your answers back to verify.`,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  "proj_demo_2": {
    id: "proj_demo_2",
    userId: "demo",
    grade: "Form 4",
    subject: "Combined Science",
    topic: "Photosynthesis",
    content: `# Photosynthesis — Study Project

## Definition
Photosynthesis is the process by which green plants use sunlight, water, and carbon dioxide to produce glucose and oxygen.

## Word Equation
Carbon dioxide + Water → Glucose + Oxygen
6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂

## Conditions Required
- **Light** — energy source (absorbed by chlorophyll)
- **Water** — absorbed through roots
- **Carbon dioxide** — absorbed through stomata
- **Chlorophyll** — green pigment in chloroplasts

## Factors Affecting the Rate
1. Light intensity — more light = faster rate (up to saturation)
2. CO₂ concentration — limiting factor at low levels
3. Temperature — enzymes denature above ~40°C

## Exam Tips
- Know the balanced symbol equation.
- Understand what limiting factors are and how to identify them from graphs.`,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

Object.assign(PROJECT_STORE, SEED);

function makeProjectId() {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

export async function getProjects(c: Context) {
  const userId = c.get("userId") as string | undefined;
  // Return demo projects + any the user generated in this server session
  const all = Object.values(PROJECT_STORE).filter(
    (p) => p.userId === "demo" || p.userId === userId,
  );
  all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return c.json({ projects: all });
}

export async function getProject(c: Context) {
  const id = c.req.param("id");
  const project = PROJECT_STORE[id];
  if (!project) return c.json({ error: "Project not found" }, 404);
  return c.json({ project });
}

export async function generateProject(c: Context) {
  const userId = (c.get("userId") as string | undefined) ?? "anon";

  const body = await c.req.json().catch(() => null);
  if (!body?.subject || !body?.topic || !body?.grade) {
    return c.json({ error: "subject, topic, and grade are required" }, 400);
  }

  const { subject, topic, grade } = body as { subject: string; topic: string; grade: string };

  const projectId = makeProjectId();

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

  let accumulatedContent = "";

  return streamSSE(c, async (stream) => {
    try {
      // Send the project ID first so the client can track it
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

      // Persist after streaming completes
      PROJECT_STORE[projectId] = {
        id: projectId,
        userId,
        grade,
        subject,
        topic,
        content: accumulatedContent,
        createdAt: new Date().toISOString(),
      };

      await stream.writeSSE({ data: projectId, event: "done" });
    } catch (err) {
      console.error("generateProject stream error:", err);
      await stream.writeSSE({ data: "AI response unavailable. Check ANTHROPIC_API_KEY.", event: "error" });
    }
  });
}
