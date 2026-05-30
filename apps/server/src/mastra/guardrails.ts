/**
 * Reusable Mastra guardrail processor stacks.
 *
 * Security architecture:
 *  • Topicality (staying on ZIMSEC) is enforced by the hardened identity prompt.
 *  • These processors enforce SAFETY: they normalise input, block prompt-injection
 *    / jailbreak attempts, and block hateful/harmful content in and out.
 *
 * Guardrails that need an LLM use the cheap GUARDRAIL_MODEL (Haiku). They are
 * applied at the point of free-text generation (chat, project title), not on the
 * cheap classifier, to keep latency reasonable while protecting what matters.
 */

import {
  UnicodeNormalizer,
  PromptInjectionDetector,
  ModerationProcessor,
} from "@mastra/core/processors";
import { GUARDRAIL_MODEL } from "./models";

/** Cheap, no-LLM cleanup: unify Unicode, strip control chars, collapse whitespace. */
export function normalizer() {
  return new UnicodeNormalizer({ stripControlChars: true, collapseWhitespace: true });
}

/** Blocks prompt-injection / jailbreak / system-override attempts (LLM-backed). */
export function injectionBlocker() {
  return new PromptInjectionDetector({
    model: GUARDRAIL_MODEL,
    strategy: "block",
    threshold: 0.75,
    detectionTypes: ["injection", "jailbreak", "system-override"],
  });
}

/** Blocks hateful / harassing / violent / sexual / self-harm content (LLM-backed). */
export function moderation() {
  return new ModerationProcessor({
    model: GUARDRAIL_MODEL,
    strategy: "block",
    threshold: 0.7,
    categories: ["hate", "harassment", "violence", "sexual", "self-harm"],
  });
}

/** Full input stack for free-text generation: normalise → block injection → moderate. */
export function chatInputProcessors() {
  return [normalizer(), injectionBlocker(), moderation()];
}

/** Output moderation only (model could be steered into harmful content). */
export function chatOutputProcessors() {
  return [moderation()];
}
