/**
 * Mid-flow intent interruption.
 *
 * When a user is partway through a flow (project brief, signup, upgrade, paper
 * browse/download) and clearly wants to do something else, we cancel the flow and
 * switch — without making them type the exact word "cancel".
 *
 * The hard part is NOT hijacking legitimate flow data (names, schools, emails,
 * passwords, outlines, exam answers). Two layers, both biased toward "leave it
 * alone":
 *   Tier 1 — anchored hard switch intents (whole-message keywords) for a DIFFERENT
 *            feature than the current flow. Safe everywhere.
 *   Tier 2 — only when the message *starts with* an explicit interruption/desire
 *            cue (isInterruptionPhrasing), consult the NL router and act only on a
 *            concrete feature intent. A name / school / email / password / numeric
 *            answer never starts this way.
 *
 * paper_study (the worst trap) is handled separately in the router via the grader's
 * `isAnswerAttempt` signal, because exam answers can be short and noun-shaped.
 */

import type { ConversationMode } from "../types";
import type { HardIntentResult } from "./hardIntents";
import { routeWithNL, type NlAction } from "../flows/nlRouter";

/**
 * True when the message OPENS with an explicit interruption or desire cue
 * ("I want…", "show me…", "write…", "actually…", "switch to…"). Legitimate flow
 * data (names, schools, subjects, emails, passwords, numbers, exam answers) does
 * not start this way, which keeps Tier 2 from hijacking real input.
 */
export function isInterruptionPhrasing(text: string): boolean {
  return /^\s*(cancel|exit|quit|stop|leave|back|menu|restart|never\s?mind|nvm|forget\s+it|actually|wait|hold\s+on|nah|no\b|can\s+i|could\s+i|may\s+i|i\s+want|i\s+need|i'?d\s+like|i\s+would\s+like|i\s+wanna|i\s+wish|let\s+me|take\s+me|send\s+me|show\s+me|give\s+me|gimme|switch|go\s+to|change\s+to|move\s+to|generate|create|write|make|do\s+my|upgrade|subscribe)\b/i.test(
    text,
  );
}

type Feature = "papers" | "project" | "account" | "none";

function currentFeature(mode: ConversationMode): Feature {
  switch (mode.kind) {
    case "paper_study":
    case "browsing_papers":
    case "paper_browse_setup":
    case "paper_action_choice":
      return "papers";
    case "project_brief":
    case "project_generating":
      return "project";
    case "signing_up":
    case "signing_in":
    case "upgrading":
    case "linking":
      return "account";
    default:
      return "none";
  }
}

function actionFeature(action: NlAction): Feature {
  switch (action.kind) {
    case "study_paper":
      return "papers";
    case "generate_project":
    case "sample_project":
      return "project";
    case "show_usage":
    case "upgrade_plan":
      return "account";
    default:
      return "none";
  }
}

/** Map an anchored hard switch intent to its equivalent NL action. */
function hardSwitchToAction(hard: HardIntentResult): NlAction | null {
  switch (hard.kind) {
    case "project":
      return { kind: "generate_project" };
    case "sample":
      return { kind: "sample_project" };
    case "papers":
      return { kind: "study_paper" };
    case "upgrade":
      return { kind: "upgrade_plan" };
    default:
      return null; // "usage" is non-destructive — handled by its own info handler.
  }
}

/** A switch that would just restart the flow the user is already in — ignore it. */
function restartsSameFlow(mode: ConversationMode, action: NlAction): boolean {
  if (mode.kind === "project_brief" && action.kind === "generate_project") return true;
  if (mode.kind === "upgrading" && action.kind === "upgrade_plan") return true;
  return false;
}

/**
 * Decide whether a mid-flow message is really a request to switch features.
 * Returns the target action, or null to let the current flow handle the text.
 *
 * `text` should NOT be a step that captures free-form data resembling commands —
 * the caller skips this for the project outline step and signup/signin password
 * steps (Tier 1 anchored keywords still interrupt those, via the global handlers).
 */
export async function detectFlowSwitch(
  text: string,
  mode: ConversationMode,
  hard: HardIntentResult,
  allowNlp = true,
): Promise<NlAction | null> {
  const feature = currentFeature(mode);

  // Tier 1 — deterministic, anchored switch keyword for a different feature.
  const hardAction = hardSwitchToAction(hard);
  if (hardAction && actionFeature(hardAction) !== feature && !restartsSameFlow(mode, hardAction)) {
    return hardAction;
  }

  // Tier 2 — only behind the high-precision phrasing gate, and never on raw-data
  // steps (outline / passwords) where data could resemble a command.
  if (!allowNlp || !isInterruptionPhrasing(text)) return null;

  const action = await routeWithNL(text);
  if (action.kind === "answer_question") return null; // ambiguous — don't yank them out
  if (actionFeature(action) === feature) return null; // same feature — stay
  if (restartsSameFlow(mode, action)) return null;
  return action;
}
