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
const UPGRADE   = /^upgrade\s*$/i;
// Match "papers", "show papers", "which papers do you have", "what papers", "available papers", etc.
const PAPERS    = /^(papers?\s*$|(show|list|view|what|which|available|browse)\s+papers?(\s+(do\s+you\s+have|are\s+(available|there)|\?))*\s*\??)/i;
const MORE      = /^more\s*$/i;
const START     = /^start\s*$/i;
const NEXT      = /^(next|done|continue)\s*$/i;
const SKIP      = /^skip\s*$/i;
const SIX_DIGIT = /^\d{6}$/;
const EXPLAIN   = /^explain(\s+(q?\d+))?\s*$/i;
const SIGNUP    = /^(sign\s*up|register|create\s+account|new\s+account)\s*$/i;
const SIGNIN    = /^(sign\s*in|login|log\s*in|my\s+account)\s*$/i;
// PDF / download request — "pdf", "send pdf", "download", "send my project", "resend"
const SEND_PDF  = /^(pdf|send\s*pdf|download(\s+(pdf|project))?|send\s*(my\s*)?(last\s*)?project|resend(\s*pdf)?)\s*$/i;
// Session history
const HISTORY   = /^(history|past\s*sessions?|my\s*sessions?|results?)\s*$/i;

export interface HardIntentResult {
  kind:
    | "greeting"
    | "help"
    | "cancel"
    | "link"
    | "usage"
    | "upgrade"
    | "papers"
    | "more"
    | "start"
    | "next"
    | "skip"
    | "link_code"
    | "explain"
    | "number_select"
    | "send_pdf"
    | "history"
    | "signup"
    | "signin"
    | "none";
  explainQn?: number;
  code?: string;
  n?: number;
}

export function matchHardIntent(text: string, mode: ConversationMode): HardIntentResult {
  const t = text.trim();

  if (SEND_PDF.test(t))                            return { kind: "send_pdf" };
  if (HISTORY.test(t))                             return { kind: "history" };
  // Greetings reset the conversation unless actively mid-study
  if (GREETINGS.test(t) && mode.kind !== "paper_study" && mode.kind !== "browsing_papers")
                                                   return { kind: "greeting" };
  if (HELP.test(t))                               return { kind: "help" };
  if (CANCEL.test(t))                             return { kind: "cancel" };
  if (LINK.test(t))                               return { kind: "link" };
  if (USAGE.test(t))                              return { kind: "usage" };
  if (UPGRADE.test(t))                            return { kind: "upgrade" };
  if (PAPERS.test(t))                             return { kind: "papers" };
  if (SIGNUP.test(t))                             return { kind: "signup" };
  if (SIGNIN.test(t))                             return { kind: "signin" };

  // Numbers resolve globally — each flow handler interprets meaning in context
  const num = Number(t);
  if (Number.isInteger(num) && num > 0 && num <= 20) return { kind: "number_select", n: num };

  if (mode.kind === "browsing_papers") {
    if (MORE.test(t)) return { kind: "more" };
  }

  if (mode.kind === "paper_study") {
    if (START.test(t) && !mode.awaitingAnswer) return { kind: "start" };
    if (NEXT.test(t))                          return { kind: "next" };
    if (SKIP.test(t))                          return { kind: "skip" };

    const em = EXPLAIN.exec