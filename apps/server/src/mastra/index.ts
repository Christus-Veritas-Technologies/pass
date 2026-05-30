/**
 * Central Mastra instance for the Pass server.
 *
 * Registers every agent and the shared Postgres store (memory threads/messages).
 * The same Postgres DB as Prisma is reused via DATABASE_URL; Mastra manages its
 * own `mastra_*` tables.
 */

import { Mastra } from "@mastra/core";
import { mastraStorage } from "./storage";
import { passAgent } from "./agents/chat.agent";
import { routerAgent } from "./agents/router.agent";
import { extractionAgent } from "./agents/extraction.agent";
import { gradingAgent } from "./agents/grading.agent";
import { explainAgent } from "./agents/explain.agent";
import { projectAgent } from "./agents/project.agent";
import { feedbackAgent } from "./agents/feedback.agent";

export const mastra = new Mastra({
  storage: mastraStorage,
  agents: {
    passAgent,
    routerAgent,
    extractionAgent,
    gradingAgent,
    explainAgent,
    projectAgent,
    feedbackAgent,
  },
});

export {
  passAgent,
  routerAgent,
  extractionAgent,
  gradingAgent,
  explainAgent,
  projectAgent,
  feedbackAgent,
};

/** Request-context key used to pass the authenticated user id into agent tools. */
export { USER_ID_CTX_KEY } from "./tools/study.tools";
