import { streamText } from "ai";
import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import { anthropic, CLAUDE_MODEL } from "../lib/anthropic";

// ─── Mock data ───────────────────────────────────────────────────────────────

// Mock papers list — keyed by paper ID
const MOCK_PAPERS: Record<string, { id: string; title: string; subject: string; grade: string; year: number }> = {
  "p01": { id: "p01", title: "Mathematics Paper 1 2023", subject: "Mathematics", grade: "Form 4", year: 2023 },
  "p02": { id: "p02", title: "English Language Paper 1 2023", subject: "English Language", grade: "Form 4", year: 2023 },
  "p03": { id: "p03", title: "Combined Science Paper 1 2023", subject: "Combined Science", grade: "Form 4", year: 2023 },
};

// Mock question set per paper
const MOCK_QUESTIONS: Record<string, Array<{ id: string; questionNumber: number; text: string; marks: number }>> = {
  "p01": [
    { id: "q01", questionNumber: 1, text: "Factorise completely: 6x² + 7x − 3", marks: 3 },
    { id: "q02", questionNumber: 2, text: "Solve the simultaneous equations: 2x + y = 7 and x − y = 2", marks: 3 },
    { id: "q03", questionNumber: 3, text: "A car travels 120 km in 1.5 hours. Calculate its average speed in km/h.", marks: 2 },
    { id: "q04", questionNumber: 4, text: "Expand and simplify: (3x − 2)(x + 5)", marks: 3 },
    { id: "q05", questionNumber: 5, text: "Find the value of x in the equation: 2x + 5 = 3x − 4", marks: 2 },
  ],
  "p02": [
    { id: "q06", questionNumber: 1, text: "Write a letter to your school principal requesting permission to start a reading club. (10 marks)", marks: 10 },
    { id: "q07", questionNumber: 2, text: "Read the following passage and answer: What is the main theme of the passage? Give two supporting points from the text.", marks: 6 },
    { id: "q08", questionNumber: 3, text: "Write a summary of the key points from the passage in not more than 100 words.", marks: 8 },
  ],
  "p03": [
    { id: "q09", questionNumber: 1, text: "Describe what happens when magnesium ribbon is burned in air. Write a word equation for the reaction.", marks: 4 },
    { id: "q10", questionNumber: 2, text: "Explain the difference between a physical change and a chemical change. Give one example of each.", marks: 4 },
    { id: "q11", questionNumber: 3, text: "A plant is placed in a dark room for 48 hours, then moved to bright sunlight. Explain what will happen to the rate of photosynthesis and why.", marks: 5 },
    { id: "q12", questionNumber: 4, text: "State two differences between mitosis and meiosis.", marks: 4 },
  ],
};

// Fallback questions for unknown paper IDs
const DEFAULT_QUESTIONS = [
  { id: "dq01", questionNumber: 1, text: "Define the key concept being tested in this subject area.", marks: 3 },
  { id: "dq02", questionNumber: 2, text: "Explain how the main principles apply to a real-world scenario.", marks: 5 },
  { id: "dq03", questionNumber: 3, text: "Compare and contrast two related concepts from the syllabus.", marks: 4 },
];

// In-memory session store — replace with DB once Prisma is connected
const SESSION_STORE: Record<string, {
  id: string;
  userId: string;
  paperId: string;
  mode: "GUIDE" | "FREE";
  questionsAnswered: number;
  completedAt?: string;
  createdAt: string;
}> = {};

function makeSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

export async function getPapers(c: Context) {
  return c.json({ papers: Object.values(MOCK_PAPERS) });
}

export async function getPaper(c: Context) {
  const id = c.req.param("id");
  const paper = MOCK_PAPERS[id];
  if (!paper) return c.json({ error: "Paper not found" }, 404);
  const questions = MOCK_QUESTIONS[id] ?? DEFAULT_QUESTIONS;
  return c.json({ paper, questions });
}

export async function startSession(c: Context) {
  const userId = c.get("userId") as string;
  const paperId = c.req.param("id");

  const body = await c.req.json().catch(() => ({}));
  const mode: "GUIDE" | "FREE" = body.mode === "FREE" ? "FREE" : "GUIDE";

  const paper = MOCK_PAPERS[paperId];
  if (!paper) return c.json({ error: "Paper not found" }, 404);

  const sessionId = makeSessionId();
  SESSION_STORE[sessionId] = {
    id: sessionId,
    userId,
    paperId,
    mode,
    questionsAnswered: 0,
    createdAt: new Date().toISOString(),
  };

  const questions = MOCK_QUESTIONS[paperId] ?? DEFAULT_QUESTIONS;
  return c.json({ session: SESSION_STORE[sessionId], paper, questions }, 201);
}

export async function submitAnswer(c: Context) {
  const userId = c.get("userId") as string;
  const sessionId = c.req.param("sessionId");

  const session = SESSION_STORE[sessionId];
  if (!session || session.userId !== userId) {
    return c.json({ error: "Session not found" }, 404);
  }

  const body = await c.req.json().catch(() => null);
  if (!body?.questionText || body.questionNumber == null) {
    return c.json({ error: "questionText and questionNumber are required" }, 400);
  }

  const { questionText, questionNumber, userAnswer = "", mode } = body as {
    questionText: string;
    questionNumber: number;
    userAnswer?: string;
    mode?: string;
  };

  const sessionMode = (mode ?? session.mode) as "GUIDE" | "FREE";

  let prompt: string;
  if (sessionMode === "GUIDE") {
    prompt = `You are a warm, encouraging ZIMSEC tutor helping a Zimbabwean student.

The question is: ${questionText}

The student answered: ${userAnswer || "(no answer provided)"}

Give encouraging feedback in 2-3 sentences. If the answer is correct or mostly correct, congratulate them genuinely. If it is wrong or incomplete, gently explain what the right answer is and why — never be harsh or discouraging. Focus on helping them understand.`;
  } else {
    prompt = `You are a knowledgeable ZIMSEC tutor helping a Zimbabwean student.

Work through this ZIMSEC question for the student:

${questionText}

Give the full, worked solution with a clear step-by-step explanation. Be thorough but easy to understand. Use simple language suitable for a Form 4 or Form 6 student.`;
  }

  // Update questionsAnswered count
  SESSION_STORE[sessionId] = {
    ...session,
    questionsAnswered: Math.max(session.questionsAnswered, questionNumber),
  };

  return streamSSE(c, async (stream) => {
    try {
      const result = streamText({
        model: anthropic(CLAUDE_MODEL),
        prompt,
        maxTokens: 512,
      });

      for await (const chunk of result.textStream) {
        await stream.writeSSE({ data: chunk, event: "chunk" });
      }
      await stream.writeSSE({ data: "", event: "done" });
    } catch (err) {
      console.error("submitAnswer stream error:", err);
      await stream.writeSSE({ data: "AI response unavailable. Check ANTHROPIC_API_KEY.", event: "error" });
    }
  });
}

export async function completeSession(c: Context) {
  const userId = c.get("userId") as string;
  const sessionId = c.req.param("sessionId");

  const session = SESSION_STORE[sessionId];
  if (!session || session.userId !== userId) {
    return c.json({ error: "Session not found" }, 404);
  }

  SESSION_STORE[sessionId] = {
    ...session,
    completedAt: new Date().toISOString(),
  };

  return c.json({ session: SESSION_STORE[sessionId] });
}

export async function getRecentSessions(c: Context) {
  // Mock data — replace with real DB query once Prisma is connected
  const sessions = [
    {
      id: "session_1",
      paperId: "p01",
      paperTitle: "Mathematics Paper 1 2023",
      subject: "Mathematics",
      grade: "Form 4",
      questionsTotal: 5,
      questionsAnswered: 5,
      score: 75,
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "session_2",
      paperId: "p02",
      paperTitle: "English Language Paper 1 2023",
      subject: "English Language",
      grade: "Form 4",
      questionsTotal: 3,
      questionsAnswered: 3,
      score: 60,
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "session_3",
      paperId: "p03",
      paperTitle: "Combined Science Paper 1 2023",
      subject: "Combined Science",
      grade: "Form 4",
      questionsTotal: 4,
      questionsAnswered: 4,
      score: 88,
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return c.json({ sessions });
}
