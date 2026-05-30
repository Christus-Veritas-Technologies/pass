/**
 * passAgent — the conversational WhatsApp tutor.
 *
 * Answers ZIMSEC study questions, with memory for multi-turn context and tools
 * to look up papers and the student's own account/plan. Full safety guardrails.
 */

import { Agent } from "@mastra/core/agent";
import { PASS_MODEL_HAIKU } from "../models";
import { withIdentity, WHATSAPP_FORMAT } from "../prompts";
import { chatMemory } from "../memory";
import { passChatTools } from "../tools/study.tools";
import { chatInputProcessors, chatOutputProcessors } from "../guardrails";

const ROLE = `YOUR ROLE HERE: free-form study tutor.

- Answer ZIMSEC study questions clearly in 120–200 words.
- If the student asks about past papers, projects, their account/plan, usage or upgrading, use your tools to give accurate, current answers — do not guess numbers.
- When a tool tells you to have the student type a command (e.g. *signup*, *signin*, *upgrade*, *papers*), relay that exact command.
- End with a brief, relevant exam tip when it helps.

${WHATSAPP_FORMAT}`;

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
