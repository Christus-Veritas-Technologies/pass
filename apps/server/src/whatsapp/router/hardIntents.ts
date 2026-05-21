/**
 * Hard (deterministic, zero-cost) intent matching.
 * These guards fire before any AI call.
 */

import type { ConversationMode } from "../types";

const GREETINGS = /^(hi|hello|hey|hesi|mhoro|salibonani|howzit|sawubona)\b/i;
const HELP      = /^(help|menu|what can you do|commands)\b/i;
const CANCEL    = /^(cancel|exit|stop|quit|back)\b/i;
const LINK      = /^link(\s+my\s+account)?\s*$/i;
const USAGE     = /^(usage|plan|limits?|quota)\s*$/i;
const PAPERS    = /^papers?\s*$/i;
const MORE      = /^more\s*$/i;
const START     = /^start\s*$/i;
const NEXT      = /^(next|done|continue)\s*$/i;
const SKIP      = /^skip\s*$/i;
const SIX_DIGIT = /^\d{6}$/;
const EXPLAIN   = /^explain(\s+(q?\d+))?\s*$/i;

export interface HardIntentResult {
  kind:
    | "greeting"
    | "help"
    | "cancel"
    | "link"
    | "usage"
    | "papers"
    | "more"
    | "start"
    | "next"
    | "skip"
    | "link_code"
    | "explain"
    | "number_select"
    | "none";
  explainQn?: number;
  code?: string;
  n?: number;
}

export function matchHardIntent(text: string, mode: ConversationMode): HardIntentResult {
  const t = text.trim();

  if (GREETINGS.test(t) && mode.kind === "idle") return { kind: "greeting" };
  if (HELP.test(t))                               return { kind: "help" };
  if (CANCEL.test(t))                             return { kind: "cancel" };
  if (LINK.test(t))                               return { kind: "link" };
  if (USAGE.test(t))                              return { kind: "usage" };
  if (PAPERS.test(t))                             return { kind: "papers" };

  if (mode.kind === "browsing_papers") {
    const n = Number(t);
    if (Number.isInteger(n) && n > 0) return { kind: "number_select", n };
    if (MORE.test(t)) return { kind: "more" };
  }

  if (mode.kind === "paper_study") {
    if (START.test(t) && !mode.awaitingAnswer) return { kind: "start" };
    if (NEXT.test(t))                          return { kind: "next" };
    if (SKIP.test(t))                          return { kind: "skip" };

    const em = EXPLAIN.exec(t);
    if (em) {
      const qStr = em[2]?.replace(/^q/i, "");
      return { kind: "explain", explainQn: qStr ? Number(qStr) : 0 };
    }

    const em2 = /^explain\s+(q?(\d+))\s*$/i.exec(t);
    if (em2) return { kind: "explain", explainQn: Number(em2[2]) };
  }

  if (SIX_DIGIT.test(t)) return { kind: "link_code", code: t };

  return { kind: "none" };
}
