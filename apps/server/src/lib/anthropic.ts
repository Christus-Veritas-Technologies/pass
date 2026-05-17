import { createAnthropic } from "@ai-sdk/anthropic";
import { env } from "@pass/env/server";

// Uses @ai-sdk/anthropic (already in deps) rather than @anthropic-ai/sdk
// to stay consistent with the existing Mastra agent setup.
export const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY ?? "" });
export const CLAUDE_MODEL = "claude-sonnet-4-6";
