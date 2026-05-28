/**
 * Soft (AI-powered) intent classification.
 * Uses Claude Haiku for speed and cost efficiency.
 */

import { generateText } from "ai";
import { anthropic } from "../../lib/anthropic";
import type { Intent } from "../types";

const CLASSIFIER_PROMPT = `You are an intent classifier for a WhatsApp study bot called Pass.

Classify the student's message into exactly ONE of these intents:
- study_paper: they want to study / attempt / practice a past paper
- generate_project: they want to create / generate / write a ZIMSEC project / assignment
- ai_chat: they are asking a study question or want help understanding something
- unclear: cannot determine intent

IMPORTANT — generate_project rules:
Any message that mentions the word "project" in the context of a ZIMSEC school assignment MUST be classified as generate_project. This includes:
- Bare keywords: "project", "my project", "a project"
- With qualifiers: "HBC project", "ZIMSEC project", "heritage project", "O-Level project", "Form 4 project"
- With verbs: "generate project", "write my project", "I need a project", "create a project"
- Subject-specific: "Science project", "Agriculture project", etc.
Do NOT classify these as ai_chat. If the word "project" appears in a school context, always use generate_project.

Return ONLY a JSON object, no prose:
{
  "kind": "<intent>",
  "hints": {
    "subject": "<subject if mentioned, e.g. Mathematics, Biology, null>",
    "grade": "<grade if mentioned, e.g. O-Level, A-Level, Form 4, null>",
    "year": <year if mentioned as a number, null>,
    "topic": "<project topic if generate_project intent, null>"
  }
}

Return valid JSON only — no markdown fences.`;

export async function classifyIntent(message: string): Promise<Intent> {
  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      maxTokens: 200,
      messages: [
        { role: "user", content: CLASSIFIER_PROMPT + "\n\nMessage: " + message },
      ],
    });

    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned) as {
      kind: string;
      hints?: Record<string, string | number | null>;
    };

    const kind = parsed.kind as Intent["kind"];
    const hints = parsed.hints ?? {};

    if (kind === "study_paper") {
      return {
        kind: "study_paper",
        hints: {
          subject: (hints.subject as string | undefined) ?? undefined,
          grade:   (hints.grade   as string | undefined) ?? undefined,
          year:    (hints.year    as number | undefined) ?? undefined,
        },
      };
    }

    if (kind === "generate_project") {
      return {
        kind: "generate_project",
        hints: {
          subject: (hints.subject as string | undefined) ?? undefined,
          grade:   (hints.grade   as string | undefined) ?? undefined,
        },
      };
    }

    if (kind === "ai_chat") {
      return { kind: "ai_chat", question: message };
    }

    return { kind: "unclear" };
  } catch {
    // Fail open — treat as AI chat so the student still gets a response
    return { kind: "ai_chat", question: message };
  }
}
