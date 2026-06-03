/**
 * routerAgent — natural-language intent classifier for the WhatsApp router.
 *
 * Replaces the old Vercel-SDK nlRouter. Returns a structured intent so the FSM
 * can dispatch deterministically. This is also where the "projects" bug is fixed:
 * any mention of project/projects/HBC/assignment routes to generate_project.
 */

import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { PASS_MODEL_HAIKU } from "../models";
import { withIdentity } from "../prompts";
import { normalizer } from "../guardrails";

export const routeSchema = z.object({
  kind: z
    .enum(["study_paper", "generate_project", "sample_project", "answer_question", "show_usage", "upgrade_plan"])
    .describe("The single best-matching intent for the student's message"),
  subject: z.string().nullish().describe("ZIMSEC subject if mentioned, else null"),
  grade: z.string().nullish().describe("Grade/level if mentioned (Grade 7, Form 4, O-Level…), else null"),
  year: z.number().nullish().describe("Paper year if mentioned, else null"),
});

export type RouteResult = z.infer<typeof routeSchema>;

const ROLE = `YOUR ROLE HERE: intent router. Read the student's message and choose exactly ONE intent.

INTENTS
- study_paper: wants to study/attempt/practice/browse/download past exam papers, or names a subject/grade/year to practice. e.g. "I want papers", "study Form 4 Biology", "2023 maths paper", "test me".
- generate_project: wants a ZIMSEC HBC project CREATED for them. A standalone mention of "project", "projects", "HBC", "heritage project" or "assignment" in a school context → generate_project. e.g. "project", "projects", "I need a project", "write my Biology project", "do my assignment". BUT if the message contains the word "sample" or "example" (or asks to see/preview one), it is sample_project, not generate_project.
- sample_project: wants to SEE/preview an example or sample of a finished project, not create their own. If the message contains "sample" or "example" in any position, choose this. e.g. "sample", "example", "give me a project sample", "I want a project sample", "show me a sample", "can I see an example project", "send a sample first", "what does a finished project look like".
- answer_question: a study question, a request to explain/define a concept, a question about Pass itself, OR anything ambiguous. This is the DEFAULT. e.g. "what is osmosis", "explain Pythagoras", "photosynthesis", "how does Pass work". Also: "how do I make a project" (a question ABOUT projects) → answer_question, NOT generate_project.
- show_usage: explicitly asking about their limits/usage/plan status. e.g. "how many papers left", "what's my plan".
- upgrade_plan: explicitly wants to upgrade/pay/buy a plan.

RULES
1. When unsure → answer_question. Never leave the student unrouted.
2. A bare "project" or "projects" is generate_project — UNLESS the message also says "sample" or "example", in which case it is sample_project.
3. "sample" or "example" anywhere in the message wins over generate_project.
4. Extract subject/grade/year only if the student actually mentioned them; otherwise null.`;

export const routerAgent = new Agent({
  id: "routerAgent",
  name: "Pass Router",
  instructions: withIdentity(ROLE),
  model: PASS_MODEL_HAIKU,
  inputProcessors: [normalizer()],
});
