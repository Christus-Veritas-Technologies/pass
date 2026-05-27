/**
 * Renders ZIMSEC question text with proper structure (React Native version):
 *   • Instruction headers  ("READ THE FOLLOWING PASSAGE…")
 *   • Passage blocks       ([Passage: …])
 *   • MCQ options          (A … B … C … D … on separate lines)
 *   • Regular paragraphs and bullet/labeled lists
 */
import { Text, View, ScrollView } from "react-native";

const BRAND = "#4F46E5";

// ─── Types ────────────────────────────────────────────────────────────────────

type Block =
  | { kind: "instruction"; text: string }
  | { kind: "passage"; paragraphs: string[] }
  | { kind: "stem"; text: string }
  | { kind: "mcq"; options: Array<{ label: string; text: string }> }
  | { kind: "paragraph"; text: string }
  | { kind: "bullet"; items: string[] }
  | { kind: "labeled"; items: string[] };

// ─── MCQ detection ────────────────────────────────────────────────────────────

const MCQ_LINE_RE = /^([A-D])[ \t]+(.+)$/;

function tryExtractMCQ(
  text: string,
): { preamble: string; options: Array<{ label: string; text: string }> } | null {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Strategy 1: options on their own lines  "A …\nB …"
  const lines = normalized.split("\n");
  const optLines: Array<{ label: string; text: string; idx: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].trim().match(MCQ_LINE_RE);
    if (m) optLines.push({ label: m[1], text: m[2].trim(), idx: i });
  }
  if (optLines.length >= 2) {
    const firstIdx = optLines[0].idx;
    return {
      preamble: lines.slice(0, firstIdx).join("\n").trim(),
      options: optLines.map((o) => ({ label: o.label, text: o.text })),
    };
  }

  // Strategy 2: options inline  "… A option B option C option D option"
  const positions: Array<{ label: string; contentStart: number; matchStart: number }> = [];
  const inlineRe = /(?:^|\s)([A-D])\s+/g;
  let m: RegExpExecArray | null;
  while ((m = inlineRe.exec(normalized)) !== null) {
    const isWordStart = m.index === 0 || /\s/.test(normalized[m.index]);
    if (isWordStart) {
      const labelIndex = m.index + (m[0].length - m[1].length - 1);
      positions.push({
        label: m[1],
        matchStart: labelIndex,
        contentStart: m.index + m[0].length,
      });
    }
  }

  if (positions.length >= 2 && positions[0].label === "A") {
    const preamble = normalized.slice(0, positions[0].matchStart).trim();
    const options = positions.map((p, i) => {
      const end =
        i + 1 < positions.length ? positions[i + 1].matchStart : normalized.length;
      return { label: p.label, text: normalized.slice(p.contentStart, end).trim() };
    });
    return { preamble, options };
  }

  return null;
}

// ─── Passage detection ────────────────────────────────────────────────────────

function tryExtractPassage(text: string): {
  instruction: st