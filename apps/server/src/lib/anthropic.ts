import { createAnthropic } from "@ai-sdk/anthropic";
import { env } from "@pass/env/server";

// Uses @ai-sdk/anthropic (already in deps) rather than @anthropic-ai/sdk
// to stay consistent with the existing Mastra agent setup.
export const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY ?? "" });

// Model tiering — keeps AI credit spend low:
//  • Grading runs against a pre-extracted rubric, so it's a cheap, constrained
//    task → Haiku.
//  • Explanations are open-ended teaching and only happen on demand → Sonnet.
export const CLAUDE_MODEL = "claude-sonnet-4-6"; // back-compat default
export const CLAUDE_TUTOR_MODEL = "claude-sonnet-4-6"; // explanations / worked solutions
export const CLAUDE_GRADING_MODEL = "claude-haiku-4-5"; // structured grading + guide feedback
