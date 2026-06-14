/**
 * Model configuration for Pass's Mastra agents.
 *
 * Every agent now runs on a single model: DeepSeek V3.2 via OpenRouter,
 * configured as an OpenAI-compatible endpoint. The work across Pass's agents
 * (project generation, explanations, grading, routing, extraction, chat,
 * feedback, guardrails) is template- or rubric-driven, so it favours a fast,
 * cheap model with strong instruction-following over Sonnet-grade reasoning.
 *
 * The `:nitro` suffix is OpenRouter's throughput shortcut (exactly
 * `provider.sort: "throughput"`): it always routes to the fastest available
 * host, which matters because DeepSeek's throughput varies widely by provider.
 *
 * The tier names below (SONNET / HAIKU) are retained so existing agent imports
 * keep working, but they now all resolve to the same DeepSeek model. When
 * OPENROUTER_API_KEY is absent, each falls back to its original Anthropic model
 * so a missing key never breaks the platform and reverting is one env change.
 */

import { env } from "@pass/env/server";
import type { MastraModelConfig } from "@mastra/core/llm";

/** OpenRouter attribution headers (optional, used for the dashboard). */
const OPENROUTER_HEADERS = { "HTTP-Referer": "https://pass.co.zw", "X-Title": "Pass" } as const;

/** DeepSeek V3.2 (fastest provider) via OpenRouter — the single model for everything. */
const DEEPSEEK_NITRO = "deepseek/deepseek-v3.2:nitro";

/**
 * Resolve to DeepSeek V3.2 on OpenRouter when a key is configured, otherwise
 * fall back to the supplied Anthropic router string (original per-tier model).
 */
function deepseekOr(fallback: string): MastraModelConfig {
  return env.OPENROUTER_API_KEY
    ? {
        id: DEEPSEEK_NITRO,
        url: "https://openrouter.ai/api/v1",
        apiKey: env.OPENROUTER_API_KEY,
        headers: OPENROUTER_HEADERS,
      }
    : fallback;
}

// All tiers now resolve to DeepSeek V3.2 via OpenRouter (Anthropic fallback when
// no OPENROUTER_API_KEY is set).
export const PASS_MODEL_SONNET: MastraModelConfig = deepseekOr("anthropic/claude-sonnet-4-6");
export const PASS_MODEL_HAIKU: MastraModelConfig = deepseekOr("anthropic/claude-haiku-4-5");

/** Model used by every guardrail processor that needs an LLM. */
export const GUARDRAIL_MODEL: MastraModelConfig = PASS_MODEL_HAIKU;

/** Project-generation model (spine + section fan-out). */
export const PASS_MODEL_PROJECT: MastraModelConfig = deepseekOr("anthropic/claude-sonnet-4-6");
