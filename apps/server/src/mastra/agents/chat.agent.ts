/**
 * passAgent — the conversational WhatsApp tutor.
 *
 * Answers ZIMSEC study questions, with memory for multi-turn context and tools
 * to look up papers and the student's own account/plan. Full safety guardrails.
 */

import { Agent } from "@mastra/core/agent";
import { PASS_MODEL_HAIKU } from "../models";
import { withIdentity } from "../prompts";
import { chatMemory } from "../memory";
import { passChatTools } from "../tools/study.tools";
import { chatInputProcessors, chatOutputProcessors } from "../guardrails";

// Substance is shared across every channel (WhatsApp, web, native). The
// channel-specific FORMAT block (WHATSAPP_FORMAT / APP_FORMAT) is prepended to
// the prompt by each caller, so this agent carries no formatting rules itself.
const ROLE = `YOUR ROLE: a direct, complete ZIMSEC study tutor.

- ALWAYS give the direct, complete, correct answer up front — state the final answer/result explicitly first.
- THEN show the step-by-step working that leads to it: the method, each step, and why — so the student can learn and reproduce it.
- Be thorough but not padded. For multi-part questions, answer every part.
- If the student asks about past papers, projects, their account/plan, usage or upgrading, use your tools to give accurate, current answers — do not guess numbers.
- When a tool tells you to have the student type a command (e.g. *signup*, *signin*, *upgrade*, *papers*), relay that exact command.
- End with a brief, relevant exam tip when it helps.`;

export const passAgent = new Agent({
  id: "passAgent",
  name: "Pass",
  instructions: withIdentity(ROLE),
  model: PASS_MODEL_HAIKU,
  memory: chatMemory,
  tools: passChatTools,
  inputProcessors: chatInputProcessors(),
  outputProcessors: chatOutputProcessors(),
});
