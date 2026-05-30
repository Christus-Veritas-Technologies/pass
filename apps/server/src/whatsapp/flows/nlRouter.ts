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
  | { kind: "generate_project"; subject?: string; grade?: string }
  | { kind: "answer_question"; question: string }
  | { kind: "show_usage" }
  | { kind: "upgrade_plan" };

const SYSTEM_PROMPT = `You are the Pass WhatsApp study assistant for Zimbabwean students (ZIMSEC).

Your job is to understand what a student wants and call the right tool. Be generous in your interpretation — match the student's intent even with typos, abbreviations, Shona/Ndebele words, or informal language.

━━━ TOOL SELECTION GUIDE ━━━

📚 study_paper — Call when the student wants to study, attempt, or browse past exam papers.
Triggers include (but are not limited to):
  • "I want papers", "give me papers", "show papers", "past papers please"
  • "study [subject]", "practice [subject]", "attempt [subject]", "quiz me on [subject]"
  • "2022 maths paper", "Form 4 biology", "O-Level physics questions"
  • "let me study", "I want to do questions", "practice exam", "test me"
  • Any ZIMSEC subject mentioned: Maths/Mathematics, Physics, Chemistry, Biology, Geography,
    History, Commerce, Economics, Accounting, Agriculture, English Language, Literature in English,
    Shona, Ndebele, Sociology, Computer Science, Religious and Moral Education, Food & Nutrition,
    Art, Music, Heritage Studies, Combined Science
  • Grade levels: Grade 7, Form 1–6, O-Level, A-Level
  • "ndinotoda mapaper" (Shona for "I want papers"), "ndifunza" (I want to learn)

📝 generate_project — Call when the student wants a ZIMSEC HBC project generated.
Triggers include:
  • "generate project", "create project", "write my project", "make a project"
  • "I need a project", "project for [subject]", "HBC project", "heritage project"
  • "write my biology project", "do my assignment", "project report"
  • "project for school", "my school project", "ndifunza project"

💬 answer_question — Call for ANY question, explanation request, or message that doesn't clearly match another tool.
This is the DEFAULT — when in doubt, always use this.
Triggers include:
  • "what is X", "explain X", "how does X work", "define X", "difference between X and Y"
  • Just a topic name alone: "photosynthesis", "Pythagoras theorem", "supply and demand"
  • "help me understand X", "I don't get X", "teach me about X"
  • Questions about Pass itself: "how does it work?", "what can you do?", "is it free?"
  • Anything about Zimbabwe, Zimbabwean curriculum, culture, history
  • Any off-topic, unclear, or ambiguous message — the AI will respond helpfully

📊 show_usage — Call ONLY when clearly asking about limits or usage stats.
  • "how many papers do I have left?", "what's my usage?", "how many AI replies left?"
  • "what's my plan?", "show my limits", "how much have I used?"

💳 upgrade_plan — Call ONLY when clearly wanting to pay or upgrade.
  • "I want to upgrade", "buy the Study plan", "how much is PASS plan?"
  • "I want to pay", "upgrade my account", "get more papers"

━━━ RULES ━━━
1. When in doubt → ALWAYS call answer_question. Never leave a student without a response.
2. Short topic-only messages ("photosynthesis", "Pythagoras", "osmosis") → answer_question
3. Desire phrases + subject/grade → study_paper (e.g. "I want Form 4 Biology")
4. Never respond with plain text. Always call a tool.
5. A question about how to generate a project → answer_question (not generate_project)
6. Frustration or repeat requests count the same as first requests — route normally.`;

export async function routeWithNL(message: string): Promise<NlAction> {
  try {
    const result = await generateText({
      model: anthropic("claude-haiku-4-5"),
      maxTokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: message }],
      tools: {
        study_paper: tool({
          description:
            "Student wants to study, attempt, practice, or browse ZIMSEC past exam papers. " +
            "Use for any mention of papers, exam prep, a specific subject or grade.",
          parameters: z.object({
            subject: z
              .string()
              .optional()
              .describe(
                "ZIMSEC subject if mentioned, e.g. Mathematics, Biology, Geography, History",
              ),
            grade: z
              .string()
              .optional()
              .describe("Grade level if mentioned, e.g. O-Level, A-Level, Form 4, Grade 7"),
            year: z.number().optional().describe("Paper year if mentioned, e.g. 2022, 2023"),
          }),
        }),
        generate_project: tool({
          description:
            "Student wants to generate a ZIMSEC Heritage-Based Curriculum (HBC) project report. " +
            "Use for any mention of project, assignment, HBC, heritage project, or school report.",
          parameters: z.object({
            subject: z
              .string()
              .optional()
              .describe("Subject for the project if mentioned, e.g. Geography, Biology"),
            grade: z
              .string()
              .optional()
              .describe("Grade: Grade 7, Form 4, or Form 6"),
          }),
        }),
        answer_question: tool({
          description:
            "Student has a study question, wants an explanation, or sent any message that " +
            "doesn't clearly call for papers or a project. DEFAULT fallback — use generously.",
          parameters: z.object({
            question: z
              .string()
              .describe("The student's full message, passed verbatim for the AI to answer"),
          }),
        }),
        show_usage: tool({
          description:
            "Student explicitly wants to see their usage stats, remaining quota, or plan limits.",
          parameters: z.object({}),
        }),
        upgrade_plan: tool({
          description:
            "Student clearly wants to upgrade their subscription or pay for a higher plan.",
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
        return { kind: "generate_project", subject: call.args.subject, grade: call.args.grade };
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
    // Fail open — treat as a question so the student always gets a response
    return { kind: "answer_question", question: message };
  }
}
