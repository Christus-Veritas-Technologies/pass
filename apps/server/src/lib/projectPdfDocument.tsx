/** @jsxImportSource react */
/**
 * @react-pdf/renderer document for ZIMSEC HBC projects.
 *
 * Features:
 * - 5 distinct visual layout profiles — each project gets its own look
 * - 3 heading style variants (banner, sideline, underline)
 * - 3 H2 sub-heading variants (accent-line, primary-topline, accent-fill)
 * - 4 footer style variants (twoCol, centered, threeCol, italic)
 * - Markdown table parser (| col | col | format)
 * - Running page headers with page numbers
 * - Bold/italic/subscript/superscript inline span support
 * - Full special-character pre-processor (HTML entities, Unicode sub/sup,
 *   non-WinAnsi Greek/arrows/math → ASCII equivalents)
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { Project } from "@pass/db";

// ── Shared neutrals (independent of theme) ────────────────────────────────────

const WHITE     = "#ffffff";
const BLACK     = "#111111";
const GREY_TEXT = "#555555";
const GREY_RULE = "#cccccc";

// ── Theme definitions ─────────────────────────────────────────────────────────

type H1Style = "banner" | "sideline" | "underline";
type H2Style = "accent-line" | "primary-topline" | "accent-fill";
type BodyFont = "Times-Roman" | "Helvetica";
type FooterStyle = "twoCol" | "centered" | "threeCol" | "italic";

interface Theme {
  primary:        string;
  primaryMid:     string;
  primaryLight:   string;
  accent:         string;
  accentLight:    string;
  h1Style:        H1Style;
  h2Style:        H2Style;
  bodyFont:       BodyFont;
  bodyFontBold:   string;
  bodyFontItalic: string;
  footerStyle:    FooterStyle;
}

const THEMES: Theme[] = [
  // 1 · Emerald Academic
  {
    primary: "#1a5c2e", primaryMid: "#2d7a45", primaryLight: "#e8f5ed",
    accent: "#c8a84b", accentLight: "#fdf6e3",
    h1Style: "banner", h2Style: "accent-line", footerStyle: "twoCol",
    bodyFont: "Times-Roman", bodyFontBold: "Times-Bold", bodyFontItalic: "Times-Italic",
  },
  // 2 · Navy Professional
  {
    primary: "#1c2f5e", primaryMid: "#2d4a8a", primaryLight: "#e8edf8",
    accent: "#5a82b8", accentLight: "#eaf0f7",
    h1Style: "sideline", h2Style: "primary-topline", footerStyle: "centered",
    bodyFont: "Times-Roman", bodyFontBold: "Times-Bold", bodyFontItalic: "Times-Italic",
  },
  // 3 · Crimson Heritage
  {
    primary: "#7a1a1a", primaryMid: "#a03030", primaryLight: "#f8ecec",
    accent: "#c8922a", accentLight: "#fdf4e0",
    h1Style: "banner", h2Style: "accent-line", footerStyle: "threeCol",
    bodyFont: "Times-Roman", bodyFontBold: "Times-Bold", bodyFontItalic: "Times-Italic",
  },
  // 4 · Violet Scientific
  {
    primary: "#4a1a78", primaryMid: "#6a30a0", primaryLight: "#f2ecfb",
    accent: "#c89030", accentLight: "#fdf5e0",
    h1Style: "underline", h2Style: "accent-fill", footerStyle: "threeCol",
    bodyFont: "Times-Roman", bodyFontBold: "Times-Bold", bodyFontItalic: "Times-Italic",
  },
  // 5 · Teal Minimal
  {
    primary: "#1a5c5a", primaryMid: "#2a8078", primaryLight: "#e8f5f4",
    accent: "#c86030", accentLight: "#fdf0ea",
    h1Style: "sideline", h2Style: "accent-line", footerStyle: "italic",
    bodyFont: "Times-Roman", bodyFontBold: "Times-Bold", bodyFontItalic: "Times-Italic",
  },
];

/** Pick a theme deterministically from the project ID so the same project
 *  always renders identically, but different projects look different. */
function pickTheme(projectId: string): Theme {
  let hash = 0;
  for (const c of projectId) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return THEMES[hash % THEMES.length]!;
}

// ── Style factory ─────────────────────────────────────────────────────────────

function buildStyles(t: Theme) {
  // ── H1 heading variants ────────────────────────────────────────────────────
  const h1Wrapper =
    t.h1Style === "banner"
      ? { backgroundColor: t.primary, marginTop: 22, marginBottom: 10, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 2 }
      : t.h1Style === "sideline"
      ? { borderLeftWidth: 4, borderLeftColor: t.primary, marginTop: 22, marginBottom: 10, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: t.primaryLight }
      : /* underline */
        { paddingBottom: 5, paddingTop: 4, borderBottomWidth: 3, borderBottomColor: t.primary, marginTop: 22, marginBottom: 10 };

  const h1Text =
    t.h1Style === "banner"
      ? { fontFamily: "Helvetica-Bold", fontSize: 13, color: WHITE }
      : { fontFamily: "Helvetica-Bold", fontSize: 14, color: t.primary };

  // ── H2 heading variants ────────────────────────────────────────────────────
  const h2Wrapper =
    t.h2Style === "accent-line"
      ? { marginTop: 16, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 2, borderBottomColor: t.accent }
      : t.h2Style === "primary-topline"
      ? { marginTop: 16, marginBottom: 6, paddingTop: 6, paddingBottom: 4, borderTopWidth: 2, borderTopColor: t.primary }
      : /* accent-fill */
        { marginTop: 16, marginBottom: 6, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: t.accentLight, borderLeftWidth: 3, borderLeftColor: t.accent };

  return StyleSheet.create({
    // ── Cover page ───────────────────────────────────────────────────────────
    coverPage:           { backgroundColor: WHITE, flexDirection: "column" },
    coverBanner:         { backgroundColor: t.primary, paddingTop: 48, paddingBottom: 40, paddingHorizontal: 50, alignItems: "center" },
    coverBannerLabel:    { fontFamily: "Helvetica-Bold", fontSize: 9, color: t.accent, marginBottom: 14 },
    coverBannerTitle:    { fontFamily: "Helvetica-Bold", fontSize: 22, color: WHITE, textAlign: "center", lineHeight: 1.4, marginBottom: 10 },
    coverBannerSubtitle: { fontFamily: "Helvetica", fontSize: 11, color: t.accent, textAlign: "center" },
    coverAccentBar:      { height: 6, backgroundColor: t.accent },
    coverCard:           { marginHorizontal: 50, marginTop: 36, marginBottom: 24, borderWidth: 1, borderColor: GREY_RULE, borderRadius: 4 },
    coverCardHeader:     { backgroundColor: t.primary, paddingVertical: 8, paddingHorizontal: 16 },
    coverCardHeaderText: { fontFamily: "Helvetica-Bold", fontSize: 9, color: WHITE },
    coverRow:            { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: GREY_RULE },
    coverRowAlt:         { backgroundColor: t.primaryLight },
    coverLabel:          { fontFamily: "Helvetica-Bold", fontSize: 10, color: t.primary, width: 140, paddingVertical: 7, paddingHorizontal: 14, borderRightWidth: 1, borderRightColor: GREY_RULE },
    coverValue:          { fontFamily: "Helvetica", fontSize: 10, color: BLACK, flex: 1, paddingVertical: 7, paddingHorizontal: 14 },
    coverSpacer:         { flex: 1 },
    coverFooter:         { backgroundColor: t.primary, paddingVertical: 14, paddingHorizontal: 50, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    coverFooterLeft:     { fontFamily: "Helvetica", fontSize: 9, color: t.accent },
    coverFooterRight:    { fontFamily: "Helvetica-Bold", fontSize: 9, color: WHITE },
    coverFooterCenter:   { fontFamily: "Helvetica", fontSize: 9, color: t.accent, textAlign: "center", flex: 1 },

    // ── Body page ────────────────────────────────────────────────────────────
    bodyPage: { fontFamily: t.bodyFont, fontSize: 11, lineHeight: 1.7, color: BLACK, paddingTop: 60, paddingBottom: 60, paddingLeft: 60, paddingRight: 60 },

    // ── Running header ───────────────────────────────────────────────────────
    runningHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 5, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: t.accent },
    runningHeaderLeft:  { fontFamily: "Helvetica", fontSize: 8, color: t.primary },
    runningHeaderRight: { fontFamily: "Helvetica", fontSize: 8, color: GREY_TEXT },

    // ── Headings ─────────────────────────────────────────────────────────────
    h1Wrapper,
    h1Text,
    h2Wrapper,
    h2Text: { fontFamily: "Helvetica-Bold", fontSize: 12, color: t.primary },
    h3Text: { fontFamily: "Helvetica-Bold", fontSize: 11, color: t.primaryMid, marginTop: 12, marginBottom: 4 },

    // ── Paragraph & bullet ───────────────────────────────────────────────────
    paragraph:  { marginBottom: 5, textAlign: "justify", fontSize: 11, color: BLACK },
    bulletRow:  { flexDirection: "row", marginBottom: 3, paddingLeft: 14 },
    bulletDot:  { width: 14, color: t.accent, fontFamily: "Helvetica-Bold", fontSize: 12 },
    bulletText: { flex: 1, textAlign: "justify", fontSize: 11, color: BLACK },
    spacer:     { height: 6 },

    // ── Table ────────────────────────────────────────────────────────────────
    tableWrapper:    { marginTop: 10, marginBottom: 12, borderWidth: 1, borderColor: t.primary, borderRadius: 3 },
    tableHeaderRow:  { flexDirection: "row", backgroundColor: t.primary },
    tableRow:        { flexDirection: "row", borderTopWidth: 1, borderTopColor: GREY_RULE },
    tableRowAlt:     { backgroundColor: t.primaryLight },
    tableHeaderCell: { flex: 1, paddingVertical: 6, paddingHorizontal: 8, fontFamily: "Helvetica-Bold", fontSize: 9, color: WHITE },
    tableCell:       { flex: 1, paddingVertical: 5, paddingHorizontal: 8, fontFamily: "Helvetica", fontSize: 9, color: BLACK },

    // ── Info box (Candidate Information) ─────────────────────────────────────
    infoBox:           { marginTop: 8, marginBottom: 12, borderWidth: 1, borderColor: t.primary, borderRadius: 3 },
    infoBoxHeader:     { backgroundColor: t.primary, paddingVertical: 6, paddingHorizontal: 12 },
    infoBoxHeaderText: { fontFamily: "Helvetica-Bold", fontSize: 9, color: WHITE },
    infoBoxRow:        { flexDirection: "row", borderTopWidth: 1, borderTopColor: GREY_RULE },
    infoBoxRowAlt:     { backgroundColor: t.accentLight },
    infoBoxLabel:      { fontFamily: "Helvetica-Bold", fontSize: 9, color: t.primary, width: 130, paddingVertical: 6, paddingHorizontal: 10, borderRightWidth: 1, borderRightColor: GREY_RULE },
    infoBoxValue:      { fontFamily: "Helvetica", fontSize: 9, color: BLACK, flex: 1, paddingVertical: 6, paddingHorizontal: 10 },
  });
}

type Styles = ReturnType<typeof buildStyles>;

// ── Content preprocessor ─────────────────────────────────────────────────────
/**
 * Normalises AI-generated markdown before PDF rendering.
 *
 * Handles:
 *  1. HTML entities (&amp; &lt; &deg; etc.)
 *  2. HTML <sub> / <sup> tags  →  [[sub:X]] / [[sup:X]] internal markers
 *  3. Unicode subscript chars (₀–₉, ₐₑₒₓₙ…)  →  [[sub:X]] markers
 *  4. Unicode superscript chars (⁰–⁹, ²³…)   →  [[sup:X]] markers
 *  5. Non-WinAnsi characters (arrows, Greek, math) → ASCII equivalents
 *     (Helvetica / Times-Roman use WinAnsi; chars outside that range → blanks)
 */
function preprocessContent(raw: string): string {
  let s = raw;

  // ── 1. HTML entities ──────────────────────────────────────────────────────
  s = s
    .replace(/&amp;/g,    "&")
    .replace(/&lt;/g,     "<")
    .replace(/&gt;/g,     ">")
    .replace(/&nbsp;/g,   " ")
    .replace(/&hellip;/g, "...")
    .replace(/&mdash;/g,  "—")  // — WinAnsi ✓
    .replace(/&ndash;/g,  "–")  // – WinAnsi ✓
    .replace(/&ldquo;/g,  "“")  // " WinAnsi ✓
    .replace(/&rdquo;/g,  "”")  // " WinAnsi ✓
    .replace(/&lsquo;/g,  "‘")  // ' WinAnsi ✓
    .replace(/&rsquo;/g,  "’")  // ' WinAnsi ✓
    .replace(/&deg;/g,    "°")
    .replace(/&plusmn;/g, "±")
    .replace(/&times;/g,  "×")
    .replace(/&divide;/g, "÷")
    .replace(/&micro;/g,  "µ")
    .replace(/&copy;/g,   "©")
    .replace(/&reg;/g,    "®")
    .replace(/&trade;/g,  "™")
    .replace(/&frac12;/g, "½")
    .replace(/&frac14;/g, "¼")
    .replace(/&frac34;/g, "¾")
    .replace(/&sup1;/g,   "[[sup:1]]")
    .replace(/&sup2;/g,   "[[sup:2]]")
    .replace(/&sup3;/g,   "[[sup:3]]");

  // ── 2. HTML <sub>/<sup> tags → internal markers ───────────────────────────
  s = s.replace(/<sub>([\s\S]*?)<\/sub>/gi, (_m, inner: string) => `[[sub:${inner.trim()}]]`);
  s = s.replace(/<sup>([\s\S]*?)<\/sup>/gi, (_m, inner: string) => `[[sup:${inner.trim()}]]`);

  // ── 3. Unicode subscript chars → [[sub:X]] ────────────────────────────────
  const subCharMap: Record<string, string> = {
    "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
    "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
    "ₐ": "a", "ₑ": "e", "ₒ": "o", "ₓ": "x",
    "ₔ": "e", "ₕ": "h", "ₖ": "k", "ₗ": "l",
    "ₘ": "m", "ₙ": "n", "ₚ": "p", "ₛ": "s", "ₜ": "t",
  };
  s = s.replace(/[₀-ₜ]+/g, (m) =>
    `[[sub:${[...m].map(c => subCharMap[c] ?? c).join("")}]]`
  );

  // ── 4. Unicode superscript chars → [[sup:X]] ──────────────────────────────
  // ² (U+00B2) and ³ (U+00B3) are in WinAnsi but ambiguous — normalise anyway
  const supCharMap: Record<string, string> = {
    "⁰": "0", "¹": "1", "²": "2", "³": "3",
    "⁴": "4", "⁵": "5", "⁶": "6",
    "⁷": "7", "⁸": "8", "⁹": "9",
    "ⁿ": "n", "ⁱ": "i",
  };
  s = s.replace(/[⁰¹²³⁴-⁹ⁿⁱ]+/g, (m) =>
    `[[sup:${[...m].map(c => supCharMap[c] ?? c).join("")}]]`
  );

  // ── 5. Non-WinAnsi → ASCII equivalents ───────────────────────────────────
  // Arrows
  s = s
    .replace(/→/g, "->").replace(/←/g, "<-").replace(/↑/g, "^").replace(/↓/g, "v")
    .replace(/⇒/g, "=>").replace(/⇐/g, "<=").replace(/⇔/g, "<=>").replace(/↔/g, "<->")
    .replace(/↖/g, "^").replace(/↗/g, "^").replace(/↘/g, "v").replace(/↙/g, "v");

  // Math operators
  s = s
    .replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/≠/g, "!=").replace(/≈/g, "~=")
    .replace(/∞/g, "infinity").replace(/√/g, "sqrt").replace(/∑/g, "sum")
    .replace(/∏/g, "product").replace(/∫/g, "integral").replace(/∂/g, "d")
    .replace(/Δ/g, "delta").replace(/∆/g, "delta").replace(/−/g, "-")
    .replace(/·/g, "*").replace(/⋅/g, "*")
    .replace(/∧/g, "AND").replace(/∨/g, "OR").replace(/¬/g, "NOT")
    .replace(/∀/g, "for all").replace(/∃/g, "exists")
    .replace(/∈/g, "in").replace(/∉/g, "not in")
    .replace(/⊂/g, "subset").replace(/⊃/g, "superset")
    .replace(/∩/g, "intersect").replace(/∪/g, "union");

  // Greek (µ U+00B5 IS in WinAnsi — leave it; handle only Unicode Greek block)
  s = s
    .replace(/α/g, "alpha").replace(/β/g, "beta").replace(/γ/g, "gamma")
    .replace(/δ/g, "delta").replace(/ε/g, "epsilon").replace(/ζ/g, "zeta")
    .replace(/η/g, "eta").replace(/θ/g, "theta").replace(/ι/g, "iota")
    .replace(/κ/g, "kappa").replace(/λ/g, "lambda").replace(/μ/g, "mu")
    .replace(/ν/g, "nu").replace(/ξ/g, "xi").replace(/ο/g, "o")
    .replace(/π/g, "pi").replace(/ρ/g, "rho").replace(/σ/g, "sigma")
    .replace(/τ/g, "tau").replace(/υ/g, "upsilon").replace(/φ/g, "phi")
    .replace(/χ/g, "chi").replace(/ψ/g, "psi").replace(/ω/g, "omega")
    .replace(/Α/g, "Alpha").replace(/Β/g, "Beta").replace(/Γ/g, "Gamma")
    .replace(/Θ/g, "Theta").replace(/Λ/g, "Lambda").replace(/Ξ/g, "Xi")
    .replace(/Π/g, "Pi").replace(/Σ/g, "Sigma").replace(/Φ/g, "Phi")
    .replace(/Ψ/g, "Psi").replace(/Ω/g, "Omega");

  // Fractions beyond ½ ¼ ¾ (which are in WinAnsi)
  s = s
    .replace(/⅓/g, "1/3").replace(/⅔/g, "2/3").replace(/⅕/g, "1/5")
    .replace(/⅖/g, "2/5").replace(/⅗/g, "3/5").replace(/⅘/g, "4/5")
    .replace(/⅙/g, "1/6").replace(/⅚/g, "5/6").replace(/⅛/g, "1/8")
    .replace(/⅜/g, "3/8").replace(/⅝/g, "5/8").replace(/⅞/g, "7/8");

  // Remaining uppercase Greek not yet handled
  s = s
    .replace(/Δ/g, "Delta").replace(/Ε/g, "Epsilon").replace(/Ζ/g, "Zeta")
    .replace(/Η/g, "Eta").replace(/Ι/g, "Iota").replace(/Κ/g, "Kappa")
    .replace(/Μ/g, "Mu").replace(/Ν/g, "Nu").replace(/Ο/g, "Omicron")
    .replace(/Ρ/g, "Rho").replace(/Τ/g, "Tau").replace(/Υ/g, "Upsilon")
    .replace(/Χ/g, "Chi");

  // Raw Unicode outside WinAnsi that LLMs occasionally generate directly
  // Using \u escapes so the source file stays ASCII-safe
  s = s
    .replace(/[​‌‍﻿]/g, "")
    .replace(/−/g, "-")
    .replace(/‑/g, "-")
    .replace(/′/g, "'")
    .replace(/″/g, "''");

  return s;
}

// ── Markdown types ────────────────────────────────────────────────────────────

type Span  = { text: string; bold: boolean; italic?: boolean; sub?: boolean; sup?: boolean };

type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "p"; spans: Span[] }
  | { type: "li"; spans: Span[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "spacer" };

// ── Span parser ───────────────────────────────────────────────────────────────
// Handles **bold**, _italic_, [[sub:X]], [[sup:X]]

function parseSpans(line: string): Span[] {
  const spans: Span[] = [];
  const regex = /\*\*([^*]+)\*\*|_([^_]+)_|\[\[sub:([^\]]+)\]\]|\[\[sup:([^\]]+)\]\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) spans.push({ text: line.slice(last, m.index), bold: false });
    if      (m[1] !== undefined) spans.push({ text: m[1], bold: true });
    else if (m[2] !== undefined) spans.push({ text: m[2], bold: false, italic: true });
    else if (m[3] !== undefined) spans.push({ text: m[3], bold: false, sub: true });
    else if (m[4] !== undefined) spans.push({ text: m[4], bold: false, sup: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) spans.push({ text: line.slice(last), bold: false });
  return spans;
}

// ── Markdown → Block parser ───────────────────────────────────────────────────

function parseMarkdown(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.split("\n");
  let i = 0;
  while (i < lines.length) {
    const raw  = lines[i] ?? "";
    const line = raw.trimEnd();

    if (line.startsWith("# "))   { blocks.push({ type: "h1", text: line.slice(2).trim()  }); i++; continue; }
    if (line.startsWith("## "))  { blocks.push({ type: "h2", text: line.slice(3).trim()  }); i++; continue; }
    if (line.startsWith("### ")) { blocks.push({ type: "h3", text: line.slice(4).trim()  }); i++; continue; }

    if (/^\s*\|/.test(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i] ?? "")) {
        tableLines.push(lines[i] ?? ""); i++;
      }
      const parsed = parseTable(tableLines);
      if (parsed) blocks.push(parsed);
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      blocks.push({ type: "li", spans: parseSpans(line.slice(2).trim()) }); i++; continue;
    }
    if (/^\d+\.\s/.test(line)) {
      blocks.push({ type: "li", spans: parseSpans(line.replace(/^\d+\.\s/, "").trim()) }); i++; continue;
    }

    if (line.trim() === "") { blocks.push({ type: "spacer" }); i++; continue; }
    blocks.push({ type: "p", spans: parseSpans(line) });
    i++;
  }
  return blocks;
}

// ── Table parser ──────────────────────────────────────────────────────────────

function parseTable(tableLines: string[]): (Block & { type: "table" }) | null {
  const splitCells = (line: string): string[] =>
    line.split("|").map((c) => c.trim()).filter((_c, idx, arr) =>
      idx > 0 && idx < arr.length - 1 || arr.length <= 2
    );
  const rows = tableLines.map(splitCells);
  if (rows.length === 0) return null;
  const headers  = rows[0] ?? [];
  const dataStart = rows.length > 1 && (rows[1] ?? []).every(c => /^[-: ]+$/.test(c)) ? 2 : 1;
  const dataRows  = rows.slice(dataStart).filter(r => r.length > 0 && r.some(c => c.trim().length > 0));
  if (headers.length === 0) return null;
  return { type: "table", headers, rows: dataRows };
}

// ── Candidate info block detector ─────────────────────────────────────────────

function extractCandidateInfo(
  blocks: Block[],
): { infoBlock: { label: string; value: string }[]; rest: Block[] } | null {
  const idx = blocks.findIndex(b =>
    b.type === "h2" && (b as { type: "h2"; text: string }).text.toLowerCase().includes("candidate")
  );
  if (idx === -1) return null;

  const pairs: { label: string; value: string }[] = [];
  const rest: Block[] = [...blocks.slice(0, idx + 1)];

  let j = idx + 1;
  while (j < blocks.length && (blocks[j]?.type === "p" || blocks[j]?.type === "spacer")) {
    const b = blocks[j];
    if (b?.type === "p") {
      const full     = (b as { type: "p"; spans: Span[] }).spans.map(s => s.text).join("").trim();
      const colonIdx = full.indexOf(":");
      if (colonIdx > 0) {
        pairs.push({ label: full.slice(0, colonIdx).trim(), value: full.slice(colonIdx + 1).trim() });
      } else if (full) {
        rest.push(b);
      }
    }
    j++;
  }
  rest.push(...blocks.slice(j));
  return pairs.length > 0 ? { infoBlock: pairs, rest } : null;
}

// ── Span renderer ─────────────────────────────────────────────────────────────
// `rise` shifts baseline: negative = down (subscript), positive = up (superscript).
// react-pdf passes this through to pdfkit's text rise operator.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SUB_STYLE: any = { fontSize: 7, rise: -2 };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SUP_STYLE: any = { fontSize: 7, rise:  4 };

function Spans({ spans, boldFont = "Helvetica-Bold", italicFont = "Helvetica-Oblique" }: {
  spans: Span[];
  boldFont?: string;
  italicFont?: string;
}) {
  return (
    <>
      {spans.map((s, i) => {
        if (s.bold)   return <Text key={i} style={{ fontFamily: boldFont }}>{s.text}</Text>;
        if (s.italic) return <Text key={i} style={{ fontFamily: italicFont }}>{s.text}</Text>;
        if (s.sub)    return <Text key={i} style={SUB_STYLE}>{s.text}</Text>;
        if (s.sup)    return <Text key={i} style={SUP_STYLE}>{s.text}</Text>;
        return <Text key={i}>{s.text}</Text>;
      })}
    </>
  );
}

// ── Themed sub-components ─────────────────────────────────────────────────────

function TableBlock({ headers, rows, S }: { headers: string[]; rows: string[][]; S: Styles }) {
  return (
    <View style={S.tableWrapper}>
      <View style={S.tableHeaderRow}>
        {headers.map((h, i) => (
          <Text key={i} style={S.tableHeaderCell}>
            <Spans spans={parseSpans(h)} boldFont="Helvetica-Bold" italicFont="Helvetica-Oblique" />
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={[S.tableRow, ri % 2 !== 0 ? S.tableRowAlt : {}]}>
          {row.map((cell, ci) => (
            <Text key={ci} style={S.tableCell}>
              <Spans spans={parseSpans(cell)} boldFont="Helvetica-Bold" italicFont="Helvetica-Oblique" />
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}


function BlockView({ block, S, t }: { block: Block; S: Styles; t: Theme }) {
  if (block.type === "spacer") return <View style={S.spacer} />;
  if (block.type === "h1") return (
    <View style={S.h1Wrapper}>
      <Text style={S.h1Text}><Spans spans={parseSpans(block.text)} /></Text>
    </View>
  );
  if (block.type === "h2") return (
    <View style={S.h2Wrapper}>
      <Text style={S.h2Text}><Spans spans={parseSpans(block.text)} /></Text>
    </View>
  );
  if (block.type === "h3") return (
    <Text style={S.h3Text}><Spans spans={parseSpans(block.text)} /></Text>
  );
  if (block.type === "li") return (
    <View style={S.bulletRow}>
      <Text style={S.bulletDot}>•</Text>
      <Text style={S.bulletText}>
        <Spans spans={block.spans} boldFont={t.bodyFontBold} italicFont={t.bodyFontItalic} />
      </Text>
    </View>
  );
  if (block.type === "table") return <TableBlock headers={block.headers} rows={block.rows} S={S} />;
  return (
    <Text style={S.paragraph}>
      <Spans spans={(block as { type: "p"; spans: Span[] }).spans} boldFont={t.bodyFontBold} italicFont={t.bodyFontItalic} />
    </Text>
  );
}

// ── Cover Page ────────────────────────────────────────────────────────────────

function CoverFooter({ project, S, t, year }: { project: Project; S: Styles; t: Theme; year: string }) {
  const name = project.studentName && project.studentName !== "_" ? project.studentName : "";
  const school = project.schoolName && project.schoolName !== "_" ? project.schoolName : "";
  const rightText = [school, year].filter(Boolean).join(" · ");

  if (t.footerStyle === "centered") {
    const parts = [name, school, year].filter(Boolean).join("  ·  ");
    return (
      <View style={S.coverFooter}>
        <Text style={S.coverFooterCenter}>{parts}</Text>
      </View>
    );
  }
  if (t.footerStyle === "italic") {
    const parts = name && school ? `${name} — ${school}` : (name || school || year);
    return (
      <View style={S.coverFooter}>
        <Text style={[S.coverFooterCenter, { fontFamily: "Helvetica-Oblique" }]}>{parts}</Text>
      </View>
    );
  }
  // twoCol and threeCol both use left/right layout
  return (
    <View style={S.coverFooter}>
      <Text style={S.coverFooterLeft}>{name}</Text>
      <Text style={S.coverFooterRight}>{rightText}</Text>
    </View>
  );
}

function CoverPage({ project, S, t }: { project: Project; S: Styles; t: Theme }) {
  const year = String(new Date(project.createdAt).getFullYear());
  const infoRows = [
    { label: "Student Name",     value: project.studentName && project.studentName !== "_" ? project.studentName : "—" },
    { label: "School",           value: project.schoolName  && project.schoolName  !== "_" ? project.schoolName  : "—" },
    { label: "Centre Number",    value: project.centreNumber  && project.centreNumber  !== "_" ? project.centreNumber  : "—" },
    { label: "Candidate Number", value: project.candidateNumber && project.candidateNumber !== "_" ? project.candidateNumber : "—" },
    { label: "Grade / Form",     value: project.grade },
    { label: "Subject",          value: project.subject },
    { label: "Academic Year",    value: year },
  ];

  return (
    <Page size="A4" style={S.coverPage}>
      <View style={S.coverBanner}>
        <Text style={S.coverBannerLabel}>Zimbabwe School Examinations Council</Text>
        <Text style={S.coverBannerTitle}>{project.topic || `${project.subject} Heritage Project`}</Text>
        <Text style={S.coverBannerSubtitle}>Heritage-Based Curriculum (HBC 5.0) — {project.subject}</Text>
      </View>

      <View style={S.coverAccentBar} />

      <View style={S.coverCard}>
        <View style={S.coverCardHeader}>
          <Text style={S.coverCardHeaderText}>Candidate Information</Text>
        </View>
        {infoRows.map((row, i) => (
          <View key={i} style={[S.coverRow, i % 2 !== 0 ? S.coverRowAlt : {}]}>
            <Text style={S.coverLabel}>{row.label}</Text>
            <Text style={S.coverValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <View style={S.coverSpacer} />

      <CoverFooter project={project} S={S} t={t} year={year} />
    </Page>
  );
}

// ── Body Pages ────────────────────────────────────────────────────────────────

function BodyPages({ project, blocks, S, t }: { project: Project; blocks: Block[]; S: Styles; t: Theme }) {
  const raw       = project.topic || project.subject;
  const shortTitle = raw.length > 55 ? raw.slice(0, 55) + "…" : raw;

  return (
    <Page size="A4" style={S.bodyPage} wrap>
      <View style={S.runningHeader} fixed>
        <Text style={S.runningHeaderLeft}>{shortTitle}</Text>
        <Text
          style={S.runningHeaderRight}
          render={({ pageNumber, totalPages }) =>
            `${project.grade} · Page ${pageNumber} of ${totalPages}`
          }
        />
      </View>

      {blocks.map((block, i) => <BlockView key={i} block={block} S={S} t={t} />)}
    </Page>
  );
}

// ── Document ──────────────────────────────────────────────────────────────────

function ProjectDocument({ project, blocks, S, t }: { project: Project; blocks: Block[]; S: Styles; t: Theme }) {
  return (
    <Document
      title={project.topic ?? project.subject}
      author={project.studentName && project.studentName !== "_" ? project.studentName : "Student"}
      subject={`ZIMSEC HBC Project — ${project.subject}`}
      keywords="ZIMSEC, HBC, Zimbabwe, heritage"
    >
      <CoverPage project={project} S={S} t={t} />
      <BodyPages project={project} blocks={blocks} S={S} t={t} />
    </Document>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a PDF buffer for a project using @react-pdf/renderer.
 * Each project gets a deterministic visual theme derived from its ID.
 */
export async function generateProjectPdfBuffer(project: Project): Promise<Buffer> {
  const theme = pickTheme(project.id);
  const S     = buildStyles(theme);

  const processedContent = preprocessContent(project.content ?? "");
  let blocks = parseMarkdown(processedContent);

  // Upgrade "Candidate Information" paragraph block → styled table
  const candidateExtract = extractCandidateInfo(blocks);
  if (candidateExtract) {
    const { infoBlock, rest } = candidateExtract;
    const h2Idx = rest.findIndex(b =>
      b.type === "h2" && (b as { type: "h2"; text: string }).text.toLowerCase().includes("candidate")
    );
    if (h2Idx !== -1 && infoBlock.length > 0) {
      rest.splice(h2Idx + 1, 0, {
        type: "table",
        headers: ["Field", "Details"],
        rows: infoBlock.map(p => [p.label, p.value]),
      } as Block);
    }
    blocks = rest;
  }

  const buffer = await renderToBuffer(
    <ProjectDocument project={project} blocks={blocks} S={S} t={theme} />
  );
  return Buffer.from(buffer);
}
