/**
 * Natural-language AI router for linked users.
 *
 * Sends the user's raw message to Claude Haiku with tool definitions.
 * Claude decides which action to take; we execute it.
 * This call does NOT count toward the user's AI message quota — only the
 * downstream answer generation (handleAiChat) does.
 */

import { generateText, tool } from "ai";
import { z } from "zod";
import { anthropic } from "../../lib/anthropic";

export type NlAction =
  | { kind: "study_paper"; subject?: string; grade?: string; year?: number }
  | { kind: "generate_project"; subject?: string; grade?: string; topic?: string }
  | { kind: "answer_question"; question: string }
  | { kind: "show_usage" }
  | { kind: "upgrade_plan" }
  | { kind: "unclear"; reply: string };

const SYSTEM_PROMPT = `You are the Pass WhatsApp study assistant for Zimbabwean O-Level and A-Level students (ZIMSEC).

When a student sends a message, call the appropriate tool:
- study_paper: they want to study / attempt / browse past exam papers
- generate_project: they want a ZIMSEC project or assignment written
- answer_question: they have a study question, want an explanation, or need help understanding something
- show_usage: they want to know how many papers/AI messages they have left this month
- upgrade_plan: they want to upgrade their subscription / pay / get more access

If you cannot determine intent, call answer_question with their original message as the question — the AI will handle it gracefully.
Never respond with plain text; always call a tool.`;

export async function routeWithNL(message: string): Promise<NlAction> {
  try {
    const result = await generateText({
      model: anthropic("claude-haiku-4-5"),
      maxTokens: 150,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: message }],
      tools: {
        study_paper: tool({
          description: "Student wants to study or browse past exam papers",
          parameters: z.object({
            subject: z.string().optional().describe("Subject e.g. Mathematics, Biology"),
            grade: z.string().optional().describe("Grade e.g. O-Level, A-Level, Form 4"),
            year: z.number().optional().describe("Year of the paper"),
          }),
        }),
        generate_project: tool({
          description: "Student wants to generate a ZIMSEC project report",
          parameters: z.object({
            subject: z.string().optional().describe("Subject e.g. Geography, Agriculture"),
            grade: z.string().optional().describe("Grade e.g. Form 4, A-Level"),
            topic: z.string().optional().describe("Project topic"),
          }),
        }),
        answer_question: tool({
          description: "Student has a study question or wants help understanding something",
          parameters: z.object({
            question: z.string().describe("The student's question or message"),
          }),
        }),
        show_usage: tool({
          description: "Student wants to see their usage stats and plan limits",
          parameters: z.object({}),
        }),
        upgrade_plan: tool({
          description: "Student wants to upgrade their subscription or pay for a plan",
          parameters: z.object({}),
        }),
      },
      toolChoice: "required",
    });

    const call = result.toolCalls[0];
    if (!call) return { kind: "answer_question", question: message };

    switch (call.toolName) {
      case "study_paper":
        return { kind: "study_paper", ...call.args };
      case "generate_project":
        return { kind: "generate_project", ...call.args };
      case "answer_question":
        return { kind: "answer_question", question: call.args.question };
      case "show_usage":
        return { kind: "show_usage" };
      case "upgrade_plan":
        return { kind: "upgrade_plan" };
      default:
        return { kind: "answer_question", question: message };
    }
  } catch {
    // Fail open — treat as a question so the student still gets a response
    return { kind: "answer_question", question: message };
  }
}
