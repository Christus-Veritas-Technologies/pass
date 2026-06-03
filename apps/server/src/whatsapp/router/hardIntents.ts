/**
 * Hard (deterministic, zero-cost) intent matching.
 * These guards fire before any AI call.
 */

import type { ConversationMode } from "../types";

// hi+o? catches "hi", "hii", "hio" (common typo) without matching "history"/"hint".
// hello+ / hey+ catch repeated chars. heya/hiya/yo catch casual openers.
const GREETINGS = /^(hi+o?|helo+|hello+|hey+|heya|hiya|yo+|sup|hesi|mhoro|salibonani|howzit|sawubona)\b/i;
const HELP      = /^(help|menu|what can you do|commands)\b/i;
// "cancel/exit/quit" are unambiguous enough to match as a prefix. The softer
// leave synonyms (stop/back/leave/menu/…) must be the WHOLE message, so an exam
// answer like "Stop the reaction by adding water" is never read as a cancel.
const CANCEL    = /^((cancel|exit|quit)\b|(stop|back|go\s*back|leave|menu|main\s*menu|start\s*over|restart|never\s*mind|nvm|forget\s*it|i\s*give\s*up|i'?m\s*done)\s*[.!]*$)/i;
const LINK      = /^link(\s+my\s+account)?\s*$/i;
const USAGE     = /^(usage|plan|limits?|quota)\s*$/i;
// "upgrade", "upgrade plan", "upgrade my plan", "upgrade subscription"
const UPGRADE   = /^upgrade(\s+(plan|my\s+plan|my\s+subscription|subscription|now))?\s*$/i;
// "project", "projects", "my project", "hbc project", "generate project",
// "I need a project", "write my project on agriculture", etc.
const PROJECT   = /^(((generate|create|write|make|start|do|i\s+need|i\s+want)(\s+(a|an|my|the))?|(?:a|an|my|the))\s+)?(?:(?:hbc|heritage|zimsec|o\.?level|a\.?level|grade\s*\d+|form\s*\d+)\s+)?projects?(\s+(on|about|for)\s+.+)?\s*$/i;
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
// Sample / example project — matches a message whose whole point is "show me a
// sample/example project", in either word order ("sample project" / "project
// sample") and with common request prefixes ("give me a…", "can I see a…", "I
// want a…"). Anchored to ^…$ so long pastes (outlines containing "for example")
// do NOT match — only short, request-shaped messages do.
const SAMPLE    = /^\s*(?:(?:can|could|may|will)\s+i\s+|i(?:'?d|\s+would)?\s+(?:like|want|need)\s+(?:to\s+)?|please\s+|let\s+me\s+|give\s+(?:me\s+)?|show\s+(?:me\s+)?|send\s+(?:me\s+)?|get\s+(?:me\s+)?|see\s+|view\s+)*(?:(?:a|an|the|my|some)\s+)*(?:(?:sample|example)s?(?:\s+(?:of\s+(?:a|an)\s+)?(?:hbc\s+|heritage\s+)?projects?)?|(?:hbc\s+|heritage\s+)?projects?\s+(?:sample|example)s?)\s*$/i;
// Modes where a bare "sample"/"example" safely means "show me a sample project".
// Excludes signup/signin/linking/study/upgrade, where it could be the user's input.
const SAMPLE_SAFE_MODES = new Set<ConversationMode["kind"]>([
  "idle", "ai_chat", "project_brief", "browsing_papers", "paper_action_choice",
]);
// Session history
const HISTORY   = /^(history|past\s*sessions?|my\s*sessions?|results?)\s*$/i;
// Logout / unlink account
const LOGOUT    = /^(logout|log\s*out|unlink|disconnect(\s+account)?|sign\s*out)\s*$/i;
// Paper download: "download 2", "send 3", "get paper 1", "send me paper 4"
const DOWNLOAD_PAPER = /^(?:download|send(?:\s+me)?|get(?:\s+paper)?)\s+(?:paper\s+)?(\d+)$/i;

export interface HardIntentResult {
  kind:
    | "greeting"
    | "help"
    | "cancel"
    | "link"
    | "usage"
    | "upgrade"
    | "project"
    | "sample"
    | "papers"
    | "more"
    | "start"
    | "next"
    | "skip"
    | "link_code"
    | "explain"
    | "number_select"
    | "send_pdf"
    | "download_paper"
    | "history"
    | "signup"
    | "signin"
    | "logout"
    | "none";
  explainQn?: number;
  code?: string;
  n?: number;
}

export function matchHardIntent(text: string, mode: ConversationMode): HardIntentResult {
  const t = text.trim();

  if (LOGOUT.test(t))                              return { kind: "logout" };
  if (SEND_PDF.test(t))                            return { kind: "send_pdf" };
  const dm = DOWNLOAD_PAPER.exec(t);
  if (dm) return { kind: "download_paper", n: Number(dm[1]) };
  if (HISTORY.test(t))                             return { kind: "history" };
  // Greetings reset the conversation unless actively mid-study
  if (GREETINGS.test(t) && mode.kind !== "paper_study")
                                                   return { kind: "greeting" };
  if (HELP.test(t))                               return { kind: "help" };
  if (CANCEL.test(t))                             return { kind: "cancel" };
  if (LINK.test(t))                               return { kind: "link" };
  if (USAGE.test(t))                              return { kind: "usage" };
  if (UPGRADE.test(t))                            return { kind: "upgrade" };
  // SAMPLE must be tested before PROJECT so "sample project" isn't read as "project".
  // Only in browsing/idle modes — never during signup, study, linking or upgrade,
  // where "sample"/"example" could be the user's actual input.
  if (SAMPLE.test(t) && SAMPLE_SAFE_MODES.has(mode.kind))
                                                  return { kind: "sample" };
  if (PROJECT.test(t))                            return { kind: "project" };
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
