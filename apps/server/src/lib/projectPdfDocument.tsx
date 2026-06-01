/** @jsxImportSource react */
/**
 * @react-pdf/renderer document for ZIMSEC HBC projects.
 *
 * Clean academic report style — Word-like professional layout.
 * Single accent colour used sparingly (headings + cover rule only).
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

// ── Palette ───────────────────────────────────────────────────────────────────

const BLACK       = "#111111";
const BODY_GREY   = "#333333";
const MID_GREY    = "#666666";
const LIGHT_GREY  = "#bbbbbb";
const RULE_GREY   = "#dddddd";
const WHITE       = "#ffffff";
const ACCENT      = "#1e3a5f";   // deep navy — used for H1 underline + cover bar
const ACCENT_SOFT = "#2c5282";   // H2 text colour

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({

  // ── Cover page ───────────────────────────────────────────────────────────
  coverPage: {
    backgroundColor: WHITE,
    paddingTop: 0,
    paddingBottom: 0,
    flexDirection: "column",
  },

  coverTopBar: {
    height: 5,
    backgroundColor: ACCENT,
  },

  coverBody: {
    flex: 1,
    paddingHorizontal: 64,
    paddingTop: 56,
    paddingBottom: 40,
    flexDirection: "column",
  },

  coverInstitution: {
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: MID_GREY,
    textAlign: "center",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 32,
  },

  coverTitleRule: {
    height: 1,
    backgroundColor: RULE_GREY,
    marginBottom: 28,
  },

  coverTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: BLACK,
    textAlign: "center",
    lineHeight: 1.45,
    marginBottom: 14,
  },

  coverSubtitle: {
    fontFamily: "Helvetica",
    fontSize: 11,
    color: MID_GREY,
    textAlign: "center",
    marginBottom: 48,
  },

  coverTableWrapper: {
    borderWidth: 1,
    borderColor: RULE_GREY,
    marginTop: 0,
  },

  coverTableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: RULE_GREY,
  },

  coverTableRowLast: {
    flexDirection: "row",
  },

  coverTableLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    color: BODY_GREY,
    width: 150,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: RULE_GREY,
    backgroundColor: "#f7f8fa",
  },

  coverTableValue: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: BLACK,
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },

  coverSpacer: { flex: 1 },

  coverBottomRule: {
    height: 1,
    backgroundColor: RULE_GREY,
    marginBottom: 14,
  },

  coverFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  coverFooterLeft: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: LIGHT_GREY,
  },

  coverFooterRight: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: LIGHT_GREY,
  },

  // ── Body pages ────────────────────────────────────────────────────────────
  bodyPage: {
    backgroundColor: WHITE,
    paddingTop: 56,
    paddingBottom: 56,
    paddingLeft: 64,
    paddingRight: 64,
    fontFamily: "Times-Roman",
    fontSize: 11,
    lineHeight: 1.7,
    color: BODY_GREY,
  },

  // ── Running header ────────────────────────────────────────────────────────
  runningHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: RULE_GREY,
    paddingBottom: 6,
    marginBottom: 18,
  },

  runningHeaderLeft: {
    fontFamily: "Helvetica",
    fontSize: 7.5,
    color: LIGHT_GREY,
  },

  runningHeaderRight: {
    fontFamily: "Helvetica",
    fontSize: 7.5,
    color: LIGHT_GREY,
  },

  // ── Headings ──────────────────────────────────────────────────────────────
  h1Wrapper: {
    marginTop: 24,
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
  },

  h1Text: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: BLACK,
  },

  h2Wrapper: {
    marginTop: 18,
    marginBottom: 5,
  },

  h2Text: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: ACCENT_SOFT,
  },

  h3Text: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: BODY_GREY,
    marginTop: 12,
    marginBottom: 3,
  },

  // ── Paragraph & list ─────────────────────────────────────────────────────
  paragraph: {
    marginBottom: 5,
    textAlign: "justify",
    fontSize: 11,
    color: BODY_GREY,
    fontFamily: "Times-Roman",
  },

  bulletRow: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 14,
  },

  bulletDot: {
    width: 14,
    fontFamily: "Times-Roman",
    fontSize: 11,
    color: MID_GREY,
  },

  bulletText: {
    flex: 1,
    fontFamily: "Times-Roman",
    fontSize: 11,
    color: BODY_GREY,
    textAlign: "justify",
  },

  spacer: { height: 5 },

  // ── Table ─────────────────────────────────────────────────────────────────
  tableWrapper: {
    marginTop: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: RULE_GREY,
  },

  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: ACCENT,
    backgroundColor: "#f7f8fa",
  },

  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: RULE_GREY,
  },

  tableRowAlt: {
    backgroundColor: "#fcfcfd",
  },

  tableHeaderCell: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: BLACK,
  },

  tableCell: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontFamily: "Times-Roman",
    fontSize: 9.5,
    color: BODY_GREY,
  },

  // ── Page footer ───────────────────────────────────────────────────────────
  // NOTE: Do NOT use `right` on absolutely-positioned Views that also have
  // borderTopWidth — Yoga overflows to ~-2.5e21 when resolving the clip path.
  // Instead use an explicit width (A4 595 − 64 − 64 = 467 pt) and a separate
  // backgroundColor View for the rule line.
  footerLine: {
    position: "absolute",
    bottom: 44,
    left: 64,
    width: 467,
    height: 0.5,
    backgroundColor: RULE_GREY,
  },

  footerLeft: {
    position: "absolute",
    bottom: 24,
    left: 64,
    width: 233,
    fontFamily: "Helvetica",
    fontSize: 7.5,
    color: LIGHT_GREY,
  },

  footerRight: {
    position: "absolute",
    bottom: 24,
    left: 64,
    width: 467,
    textAlign: "right",
    fontFamily: "Helvetica",
    fontSize: 7.5,
    color: LIGHT_GREY,
  },
});

// ── Content preprocessor ─────────────────────────────────────────────────────

function preprocessContent(raw: string): string {
  let s = raw;

  s = s
    .replace(/&amp;/g,    "&")
    .replace(/&lt;/g,     "<")
    .replace(/&gt;/g,     ">")
    .replace(/&nbsp;/g,   " ")
    .replace(/&hellip;/g, "...")
    .replace(/&mdash;/g,  "—")
    .replace(/&ndash;/g,  "–")
    .replace(/&ldquo;/g,  "“")
    .replace(/&rdquo;/g,  "”")
    .replace(/&lsquo;/g,  "‘")
    .replace(/&rsquo;/g,  "’")
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

  s = s.replace(/<sub>([\s\S]*?)<\/sub>/gi, (_m, inner: string) => `[[sub:${inner.trim()}]]`);
  s = s.replace(/<sup>([\s\S]*?)<\/sup>/gi, (_m, inner: string) => `[[sup:${inner.trim()}]]`);

  const subCharMap: Record<string, string> = {
    "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
    "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
    "ₐ": "a", "ₑ": "e", "ₒ": "o", "ₓ": "x",
    "ₕ": "h", "ₖ": "k", "ₗ": "l", "ₘ": "m",
    "ₙ": "n", "ₚ": "p", "ₛ": "s", "ₜ": "t",
  };
  s = s.replace(/[₀-ₜ]+/g, (m) =>
    `[[sub:${[...m].map(c => subCharMap[c] ?? c).join("")}]]`
  );

  const supCharMap: Record<string, string> = {
    "⁰": "0", "¹": "1", "²": "2", "³": "3",
    "⁴": "4", "⁵": "5", "⁶": "6",
    "⁷": "7", "⁸": "8", "⁹": "9",
    "ⁿ": "n", "ⁱ": "i",
  };
  s = s.replace(/[⁰¹²³⁴-⁹ⁿⁱ]+/g, (m) =>
    `[[sup:${[...m].map(c => supCharMap[c] ?? c).join("")}]]`
  );

  s = s
    .replace(/→/g, "->").replace(/←/g, "<-")
    .replace(/↑/g, "^").replace(/↓/g, "v")
    .replace(/⇒/g, "=>").replace(/⇐/g, "<=")
    .replace(/⇔/g, "<=>").replace(/↔/g, "<->")
    .replace(/≥/g, ">=").replace(/≤/g, "<=")
    .replace(/≠/g, "!=").replace(/≈/g, "~=")
    .replace(/∞/g, "infinity").replace(/√/g, "sqrt")
    .replace(/∑/g, "sum").replace(/∏/g, "product")
    .replace(/∫/g, "integral").replace(/∂/g, "d")
    .replace(/[Δ∆]/g, "delta").replace(/−/g, "-")
    .replace(/·/g, "*").replace(/⋅/g, "*")
    .replace(/α/g, "alpha").replace(/β/g, "beta")
    .replace(/γ/g, "gamma").replace(/δ/g, "delta")
    .replace(/ε/g, "epsilon").replace(/θ/g, "theta")
    .replace(/λ/g, "lambda").replace(/μ/g, "mu")
    .replace(/π/g, "pi").replace(/σ/g, "sigma")
    .replace(/ω/g, "omega").replace(/Ω/g, "Omega")
    .replace(/Σ/g, "Sigma").replace(/Π/g, "Pi")
    .replace(/​/g, "").replace(/﻿/g, "")
    .replace(/‑/g, "-").replace(/′/g, "'")
    .replace(/″/g, "''");

  // Final pass: PDFKit's built-in fonts (Helvetica, Times-Roman) only support
  // Latin-1 (U+0000–U+00FF). Any character outside that range produces a zero-
  // or NaN-width glyph advance, which cascades into an out-of-range transform
  // value and crashes pdfkit with "unsupported number: -2.5e+21".
  // Apply a targeted replacement table for commonly-generated Unicode, then
  // drop anything still outside Latin-1 rather than crash.
  const EXTRA_MAP: Record<string, string> = {
    "•": "-",    // bullet •
    "‣": "-",    // triangular bullet ‣
    "●": "-",    // black circle ●
    "○": "o",    // white circle ○
    "■": "-",    // black square ■
    "✓": "v",    // check mark ✓
    "✔": "v",    // heavy check mark ✔
    "✗": "x",    // ballot x ✗
    "✘": "x",    // heavy ballot x ✘
    "★": "*",    // black star ★
    "☆": "*",    // white star ☆
    "·": "*",    // middle dot ·  (already Latin-1 but explicit)
    "−": "-",    // minus sign −  (already handled above, belt-and-suspenders)
    "‑": "-",    // non-breaking hyphen
    "‐": "-",    // hyphen
    "―": "-",    // horizontal bar ―
    "─": "-",    // box drawing light horizontal ─
    "­": "",     // soft hyphen (invisible)
    "⁠": "",     // word joiner (invisible)
    "​": "",     // zero-width space
    "‌": "",     // zero-width non-joiner
    "‍": "",     // zero-width joiner
    "﻿": "",     // BOM / zero-width no-break space
  };
  s = s.replace(/[^\x00-\xFF]/g, (ch) => EXTRA_MAP[ch] ?? "");

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

// ── Markdown parser ───────────────────────────────────────────────────────────

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

function parseTable(tableLines: string[]): (Block & { type: "table" }) | null {
  const splitCells = (line: string): string[] =>
    line.split("|").map(c => c.trim()).filter((_c, idx, arr) =>
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

// ── Span renderer ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SUB_STYLE: any = { fontSize: 7, rise: -2 };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SUP_STYLE: any = { fontSize: 7, rise:  4 };

function Spans({ spans, bold = "Helvetica-Bold", italic = "Times-Italic" }: {
  spans: Span[];
  bold?: string;
  italic?: string;
}) {
  return (
    <>
      {spans.map((s, i) => {
        if (s.bold)   return <Text key={i} style={{ fontFamily: bold }}>{s.text}</Text>;
        if (s.italic) return <Text key={i} style={{ fontFamily: italic }}>{s.text}</Text>;
        if (s.sub)    return <Text key={i} style={SUB_STYLE}>{s.text}</Text>;
        if (s.sup)    return <Text key={i} style={SUP_STYLE}>{s.text}</Text>;
        return <Text key={i}>{s.text}</Text>;
      })}
    </>
  );
}

// ── Block renderer ────────────────────────────────────────────────────────────

function BlockView({ block }: { block: Block }) {
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
      <Text style={S.bulletDot}>{"–"}</Text>
      <Text style={S.bulletText}><Spans spans={block.spans} /></Text>
    </View>
  );

  if (block.type === "table") return (
    <View style={S.tableWrapper}>
      <View style={S.tableHeaderRow}>
        {block.headers.map((h, i) => (
          <Text key={i} style={S.tableHeaderCell}>
            <Spans spans={parseSpans(h)} bold="Helvetica-Bold" italic="Helvetica-Oblique" />
          </Text>
        ))}
      </View>
      {block.rows.map((row, ri) => (
        <View key={ri} style={[S.tableRow, ri % 2 !== 0 ? S.tableRowAlt : {}]}>
          {row.map((cell, ci) => (
            <Text key={ci} style={S.tableCell}>
              <Spans spans={parseSpans(cell)} bold="Helvetica-Bold" italic="Helvetica-Oblique" />
            </Text>
          ))}
        </View>
      ))}
    </View>
  );

  return (
    <Text style={S.paragraph}>
      <Spans spans={(block as { type: "p"; spans: Span[] }).spans} />
    </Text>
  );
}

// ── Cover page ────────────────────────────────────────────────────────────────

function CoverPage({ project }: { project: Project }) {
  const year = String(new Date(project.createdAt).getFullYear());
  const infoRows = [
    { label: "Student Name",      value: project.studentName    && project.studentName    !== "_" ? project.studentName    : "—" },
    { label: "School",            value: project.schoolName     && project.schoolName     !== "_" ? project.schoolName     : "—" },
    { label: "Centre Number",     value: project.centreNumber   && project.centreNumber   !== "_" ? project.centreNumber   : "—" },
    { label: "Candidate Number",  value: project.candidateNumber && project.candidateNumber !== "_" ? project.candidateNumber : "—" },
    { label: "Grade / Form",      value: project.grade },
    { label: "Subject",           value: project.subject },
    { label: "Academic Year",     value: year },
  ];

  return (
    <Page size="A4" style={S.coverPage}>
      <View style={S.coverTopBar} />

      <View style={S.coverBody}>
        <Text style={S.coverInstitution}>
          Zimbabwe School Examinations Council{"\n"}Heritage-Based Curriculum Project
        </Text>

        <View style={S.coverTitleRule} />

        <Text style={S.coverTitle}>
          {project.topic || `${project.subject} Heritage Project`}
        </Text>

        <Text style={S.coverSubtitle}>
          HBC 5.0 — {project.subject}
        </Text>

        <View style={S.coverTableWrapper}>
          {infoRows.map((row, i) => (
            <View
              key={i}
              style={i < infoRows.length - 1 ? S.coverTableRow : S.coverTableRowLast}
            >
              <Text style={S.coverTableLabel}>{row.label}</Text>
              <Text style={S.coverTableValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={S.coverSpacer} />

        <View style={S.coverBottomRule} />
        <View style={S.coverFooter}>
          <Text style={S.coverFooterLeft}>Generated via Pass Study Platform</Text>
          <Text style={S.coverFooterRight}>pass.ac.zw</Text>
        </View>
      </View>
    </Page>
  );
}

// ── Body pages ────────────────────────────────────────────────────────────────

function BodyPages({ project, blocks }: { project: Project; blocks: Block[] }) {
  const raw        = project.topic || project.subject;
  const shortTitle = raw.length > 60 ? raw.slice(0, 60) + "…" : raw;

  return (
    <Page size="A4" style={S.bodyPage} wrap>
      {/* Running header */}
      <View style={S.runningHeader} fixed>
        <Text style={S.runningHeaderLeft}>{shortTitle}</Text>
        <Text style={S.runningHeaderRight}>
          {project.grade}
        </Text>
      </View>

      {blocks.map((block, i) => <BlockView key={i} block={block} />)}

      {/* Page footer — separate elements to avoid right+borderTopWidth Yoga overflow */}
      <View style={S.footerLine} fixed />
      <Text style={S.footerLeft} fixed>pass.ac.zw</Text>
      <Text
        style={S.footerRight}
        fixed
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </Page>
  );
}

// ── Document ──────────────────────────────────────────────────────────────────

function ProjectDocument({ project, blocks }: { project: Project; blocks: Block[] }) {
  return (
    <Document
      title={project.topic ?? project.subject}
      author={project.studentName && project.studentName !== "_" ? project.studentName : "Student"}
      subject={`ZIMSEC HBC Project — ${project.subject}`}
      keywords="ZIMSEC, HBC, Zimbabwe, heritage"
    >
      <CoverPage project={project} />
      <BodyPages project={project} blocks={blocks} />
    </Document>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateProjectPdfBuffer(project: Project): Promise<Buffer> {
  const processedContent = preprocessContent(project.content ?? "");
  const blocks = parseMarkdown(processedContent);

  const buffer = await renderToBuffer(
    <ProjectDocument project={project} blocks={blocks} />
  );
  return Buffer.from(buffer);
}
