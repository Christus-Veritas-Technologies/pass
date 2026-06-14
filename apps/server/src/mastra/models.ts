/**
 * Model tiering for Pass's Mastra agents.
 *
 * Mastra 1.x resolves these string IDs through its built-in model router using
 * the ANTHROPIC_API_KEY env var — no @ai-sdk/anthropic client needed.
 *
 *  • Sonnet → open-ended teaching and explanations.
 *  • Haiku  → cheap constrained tasks: routing, field extraction, grading,
 *             and all guardrail processors.
 *  • Project → DeepSeek V3.2 via OpenRouter (see PASS_MODEL_PROJECT) — long-form
 *             project generation is template-driven, so it favours a fast, cheap
 *             model over Sonnet-grade reasoning.
 */

import { env } from "@pass/env/server";
import type { MastraModelConfig } from "@mastra/core/llm";

export const PASS_MODEL_SONNET = "anthropic/claude-sonnet-4-6" as const;
export const PASS_MODEL_HAIKU = "anthropic/claude-haiku-4-5" as const;

/** Fast, cheap model used by every guardrail processor that needs an LLM. */
export const GUARDRAIL_MODEL = PASS_MODEL_HAIKU;

/**
 * Project-generation model.
 *
 * Project generation (spine + section fan-out, see mastra/project/) follows a
 * rigid template with exact word counts and table layouts, so it needs speed
 * and instruction-following, not deep reasoning. We route it through OpenRouter
 * to DeepSeek V3.2 (~20× cheaper than Sonnet) configured as an OpenAI-compatible
 * endpoint.
 *
 * The `:nitro` suffix is OpenRouter's throughput shortcut (exactly
 * `provider.sort: "throughput"`): it always routes to the fastest available
 * host, which matters because the fan-out's wall-clock is bound by the slowest
 * section and DeepSeek's throughput varies widely by provider.
 *
 * When OPENROUTER_API_KEY is absent we fall back to Sonnet, so a missing key
 * never breaks generation and reverting is a one-line change.
 */
export const PASS_MODEL_PROJECT: MastraModelConfig = env.OPENROUTER_API_KEY
  ? {
      id: "deepseek/deepseek-v3.2:nitro",
      url: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY,
      // Optional OpenRouter attribution headers.
      headers: { "HTTP-Referer": "https://pass.co.zw", "X-Title": "Pass" },
    }
  : PASS_MODEL_SONNET;
