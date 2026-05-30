/**
 * Model tiering for Pass's Mastra agents.
 *
 * Mastra 1.x resolves these string IDs through its built-in model router using
 * the ANTHROPIC_API_KEY env var — no @ai-sdk/anthropic client needed.
 *
 *  • Sonnet → open-ended teaching, explanations, long-form project generation.
 *  • Haiku  → cheap constrained tasks: routing, field extraction, grading,
 *             and all guardrail processors.
 */

export const PASS_MODEL_SONNET = "anthropic/claude-sonnet-4-6" as const;
export const PASS_MODEL_HAIKU = "anthropic/claude-haiku-4-5" as const;

/** Fast, cheap model used by every guardrail processor that needs an LLM. */
export const GUARDRAIL_MODEL = PASS_MODEL_HAIKU;
