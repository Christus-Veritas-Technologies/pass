/**
 * Natural-language intent router for linked users.
 *
 * Delegates to the Mastra routerAgent, which returns a structured intent. This
 * call does NOT count toward the student's AI message quota — only the downstream
 * answer generation (handleAiChat) does.
 */

import { routerAgent, routeSchema, type RouteResult } from "../../mastra/agents/router.agent";

export type NlAction =
  | { kind: "study_paper"; subject?: string; grade?: string; year?: number }
  | { kind: "generate_project"; subject?: string; grade?: string }
  | { kind: "sample_project"; subject?: string; grade?: string }
  | { kind: "answer_question"; question: string }
  | { kind: "show_usage" }
  | { kind: "upgrade_plan" };

export async function routeWithNL(message: string): Promise<NlAction> {
  try {
    const result = await routerAgent.generate(message, {
      structuredOutput: { schema: routeSchema },
    });

    const route = result.object as RouteResult | undefined;
    if (!route) return { kind: "answer_question", question: message };

    const subject = route.subject ?? undefined;
    const grade = route.grade ?? undefined;
    const year = route.year ?? undefined;

    switch (route.kind) {
      case "study_paper":
        return { kind: "study_paper", subject, grade, year };
      case "generate_project":
        return { kind: "generate_project", subject, grade };
      case "sample_project":
        return { kind: "sample_project", subject, grade };
      case "show_usage":
        return { kind: "show_usage" };
      case "upgrade_plan":
        return { kind: "upgrade_plan" };
      case "answer_question":
      default:
        return { kind: "answer_question", question: message };
    }
  } catch {
    // Fail open — treat as a question so the student always gets a response.
    return { kind: "answer_question", question: message };
  }
}
