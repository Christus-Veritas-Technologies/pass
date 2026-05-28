/** @jsxImportSource react */
/**
 * @react-pdf/renderer document for ZIMSEC HBC projects.
 *
 * Features:
 * - Stunning green/gold cover page with professional layout
 * - Markdown table parser (| col | col | format)
 * - Running page headers with page numbers
 * - Color-coded section headings
 * - Styled tables with alternating rows
 * - Bold/italic inline span support
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

// ── Brand colours ─────────────────────────────────────────────────────────────

const GREEN      = "#1a5c2e";
const GREEN_MID  = "#2d7a45";
const GREEN_LIGHT = "#e8f5ed";
const GOLD       = "#c8a84b";
const GOLD_LIGHT = "#fdf6e3";
const WHITE      = "#ffffff";
const BLACK      = "#111111";
const GREY_TEXT  = "#444444";
const GREY_RULE  = "#cccccc";
const ROW_ALT    = "#f4f9f6";

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // ── Page layouts ──────────────────────────────────────────────────────────
  coverPage: {
    backgroundColor: WHITE,
    flexDirection: "column",
  },
  bodyPage: {
    fontFamily: "Times-Roman",
    fontSize: 11,
    lineHeight: 1.7,
    color: BLACK,
    paddingTop: 60,
    paddingBottom: 60,
    paddingLeft: 60,
    paddingRight: 60,
  },

  // ── Cover: top green banner ────────────────────────────────────────────────
  coverBanner: {
    backgroundColor: GREEN,
    paddingTop: 48,
    paddingBottom: 40,
    paddingHorizontal: 50,
    alignItems: "center",
  },
  coverBannerLabel: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: GOLD,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  coverBannerTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: WHITE,
    textAlign: "center",
    lineHeight: 1.4,
    marginBottom: 10,
  },
  coverBannerSubtitle: {
    fontFamily: "Helvetica",
    fontSize: 11,
    color: GOLD,
    textAlign: "center",
  },

  // ── Cover: gold divider ────────────────────────────────────────────────────
  coverGoldBar: {
    height: 6,
    backgroundColor: GOLD,
  },

  // ── Cover: info card ──────────────────────────────────────────────────────
  coverCard: {
    marginHorizontal: 50,
    marginTop: 36,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: GREY_RULE,
    borderRadius: 4,

  },
  coverCardHeader: {
    backgroundColor: GREEN,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  coverCardHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: WHITE,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  coverRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: GREY_RULE,
  },
  coverRowAlt: {
    backgroundColor: GREEN_LIGHT,
  },
  coverLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: GREEN,
    width: 140,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRightWidth: 1,
    borderRightColor: GREY_RULE,
  },
  coverValue: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: BLACK,
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },

  // ── Cover: footer strip ────────────────────────────────────────────────────
  coverFooter: {
    backgroundColor: GREEN,
    marginTop: "auto",
    paddingVertical: 14,
    paddingHorizontal: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  coverFooterText: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: GOLD,
  },
  coverFooterBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: WHITE,
  },

  // ── Body: running header ───────────────────────────────────────────────────
  runningHeader: {
    position: "absolute",
    top: 20,
    left: 60,
    right: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
  },
  runningHeaderLeft: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: GREEN,
  },
  runningHeaderRight: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: GREY_TEXT,
  },

  // ── Body: page number ──────────────────────────────────────────────────────
  pageNumber: {
    position: "absolute",
    bottom: 20,
    left: 60,
    right: 60,
    textAlign: "center",
    fontFamily: "Helvetica",
    fontSize: 8,
    color: GREY_TEXT,
  },

  // ── Body: headings ────────────────────────────────────────────────────────
  h1Wrapper: {
    backgroundColor: GREEN,
    marginTop: 22,
    marginBottom: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 2,
  },
  h1Text: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: WHITE,
    letterSpacing: 0.5,
  },
  h2Wrapper: {
    marginTop: 16,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
  },
  h2Text: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: GREEN,
  },
  h3Text: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: GREEN_MID,
    marginTop: 12,
    marginBottom: 4,
  },

  // ── Body: paragraph & bullet ──────────────────────────────────────────────
  paragraph: {
    marginBottom: 5,
    textAlign: "justify",
    fontSize: 11,
    color: BLACK,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 14,
  },
  bulletDot: {
    width: 14,
    color: GOLD,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
  },
  bulletText: {
    flex: 1,
    textAlign: "justify",
    fontSize: 11,
    color: BLACK,
  },
  spacer: { height: 6 },

  // ── Table ─────────────────────────────────────────────────────────────────
  tableWrapper: {
    marginTop: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 3,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: GREEN,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: GREY_RULE,
  },
  tableRowAlt: {
    backgroundColor: ROW_ALT,
  },
  tableHeaderCell: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: WHITE,
  },
  tableCell: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: BLACK,
  },

  // ── Info box (for "Candidate Information" table-style block) ──────────────
  infoBox: {
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 3,

  },
  infoBoxHeader: {
    backgroundColor: GREEN,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  infoBoxHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: WHITE,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  infoBoxRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: GREY_RULE,
  },
  infoBoxRowAlt: {
    backgroundColor: GOLD_LIGHT,
  },
  infoBoxLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: GREEN,
    width: 130,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: GREY_RULE,
  },
  infoBoxValue: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: BLACK,
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
});

// ── Markdown types ────────────────────────────────────────────────────────────

type Span = { text: string; bold: boolean; italic?: boolean };

type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "p"; spans: Span[] }
  | { type: "li"; spans: Span[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "spacer" };

// ── Span parser — handles **bold** and _italic_ ───────────────────────────────

function parseSpans(line: string): Span[] {
  const spans: Span[] = [];
  // Match **bold** or _italic_
  const regex = /\*\*([^*]+)\*\*|_([^_]+)_/g;
  let last = 0;
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) spans.push({ text: line.slice(last, m.index), bold: false });
    if (m[1] !== undefined) {
      spans.push({ text: m[1], bold: true });
    } else if (m[2] !== undefined) {
      spans.push({ text: m[2], bold: false, italic: true });
    }
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
    const raw = lines[i] ?? "";
    const line = raw.trimEnd();

    // Headings
    if (line.startsWith("# "))   { blocks.push({ type: "h1", text: line.slice(2).trim() }); i++; continue; }
    if (line.startsWith("## "))  { blocks.push({ type: "h2", text: line.slice(3).trim() }); i++; continue; }
    if (line.startsWith("### ")) { blocks.push({ type: "h3", text: line.slice(4).trim() }); i++; continue; }

    // Tables — detect | ... | lines
    if (/^\s*\|/.test(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i] ?? "")) {
        tableLines.push(lines[i] ?? "");
        i++;
      }
      // Parse the table
      const parsed = parseTable(tableLines);
      if (parsed) blocks.push(parsed);
      continue;
    }

    // Bullets
    if (line.startsWith("- ") || line.startsWith("* ")) {
      blocks.push({ type: "li", spans: parseSpans(line.slice(2).trim()) });
      i++; continue;
    }
    if (/^\d+\.\s/.test(line)) {
      blocks.push({ type: "li", spans: parseSpans(line.replace(/^\d+\.\s/, "").trim()) });
      i++; continue;
    }

    // Key: Value lines (e.g. "Centre Number: 12345") — keep as paragraphs, handled naturally
    if (line.trim() === "") { blocks.push({ type: "spacer" }); i++; continue; }

    blocks.push({ type: "p", spans: parseSpans(line) });
    i++;
  }

  return blocks;
}

// ── Table parser ──────────────────────────────────────────────────────────────

function parseTable(tableLines: string[]): Block & { type: "table" } | null {
  // Split each line into cells, stripping leading/trailing |
  const splitCells = (line: string): string[] =>
    line.split("|").map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1 || (arr.length <= 2));

  const rows = tableLines.map(splitCells);

  if (rows.length === 0) return null;

  // First row is always headers
  const headers = rows[0] ?? [];

  // Second row might be separator (|---|---|) — skip it
  const dataStart = (rows.length > 1 && (rows[1] ?? []).every(c => /^[-: ]+$/.test(c))) ? 2 : 1;
  const dataRows = rows.slice(dataStart).filter(r => r.length > 0 && r.some(c => c.trim().length > 0));

  if (headers.length === 0) return null;

  return { type: "table", headers, rows: dataRows };
}

// ── Candidate info block detector ─────────────────────────────────────────────
// Detects lines like "Centre Number: 12345\nName: ..." after "## Candidate Information"

function extractCandidateInfo(blocks: Block[]): { infoBlock: { label: string; value: string }[]; rest: Block[] } | null {
  const idx = blocks.findIndex(b => b.type === "h2" && (b as { type: "h2"; text: string }).text.toLowerCase().includes("candidate"));
  if (idx === -1) return null;

  const pairs: { label: string; value: string }[] = [];
  const rest: Block[] = [...blocks.slice(0, idx + 1)];

  let j = idx + 1;
  while (j < blocks.length && (blocks[j]?.type === "p" || blocks[j]?.type === "spacer")) {
    const b = blocks[j];
    if (b?.type === "p") {
      // Join all span text
      const full = (b as { type: "p"; spans: Span[] }).spans.map(s => s.text).join("").trim();
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

  if (pairs.length > 0) return { infoBlock: pairs, rest };
  return null;
}

// ── Span renderer ─────────────────────────────────────────────────────────────

function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((s, i) => {
        if (s.bold)   return <Text key={i} style={{ fontFamily: "Helvetica-Bold" }}>{s.text}</Text>;
        if (s.italic) return <Text key={i} style={{ fontFamily: "Helvetica-Oblique" }}>{s.text}</Text>;
        return <Text key={i}>{s.text}</Text>;
      })}
    </>
  );
}

// ── Table renderer ────────────────────────────────────────────────────────────

function TableBlock({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <View style={S.tableWrapper}>
      <View style={S.tableHeaderRow}>
        {headers.map((h, i) => (
          <Text key={i} style={S.tableHeaderCell}>{h}</Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={[S.tableRow, ri % 2 !== 0 ? S.tableRowAlt : {}]}>
          {row.map((cell, ci) => (
            <Text key={ci} style={S.tableCell}>{cell}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Info box renderer ─────────────────────────────────────────────────────────

function InfoBox({ label, pairs }: { label: string; pairs: { label: string; value: string }[] }) {
  return (
    <View style={S.infoBox}>
      <View style={S.infoBoxHeader}>
        <Text style={S.infoBoxHeaderText}>{label}</Text>
      </View>
      {pairs.map((p, i) => (
        <View key={i} style={[S.infoBoxRow, i % 2 !== 0 ? S.infoBoxRowAlt : {}]}>
          <Text style={S.infoBoxLabel}>{p.label}</Text>
          <Text style={S.infoBoxValue}>{p.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Block renderer ────────────────────────────────────────────────────────────

function BlockView({ block }: { block: Block }) {
  if (block.type === "spacer") return <View style={S.spacer} />;
  if (block.type === "h1") return (
    <View style={S.h1Wrapper}>
      <Text style={S.h1Text}>{block.text}</Text>
    </View>
  );
  if (block.type === "h2") return (
    <View style={S.h2Wrapper}>
      <Text style={S.h2Text}>{block.text}</Text>
    </View>
  );
  if (block.type === "h3") return <Text style={S.h3Text}>{block.text}</Text>;
  if (block.type === "li") return (
    <View style={S.bulletRow}>
      <Text style={S.bulletDot}>•</Text>
      <Text style={S.bulletText}><Spans spans={block.spans} /></Text>
    </View>
  );
  if (block.type === "table") return <TableBlock headers={block.headers} rows={block.rows} />;
  // paragraph
  return (
    <Text style={S.paragraph}>
      <Spans spans={(block as { type: "p"; spans: Span[] }).spans} />
    </Text>
  );
}

// ── Cover Page ────────────────────────────────────────────────────────────────

function CoverPage({ project }: { project: Project }) {
  const year = new Date(project.createdAt).getFullYear();

  const infoRows = [
    { label: "Student Name",      value: project.studentName || "Student" },
    ...(project.schoolName ? [{ label: "School", value: project.schoolName }] : []),
    { label: "Centre Number",     value: project.centreNumber || "—" },
    { label: "Candidate Number",  value: project.candidateNumber || "—" },
    { label: "Grade / Form",      value: project.grade },
    { label: "Subject",           value: project.subject },
    { label: "Academic Year",     value: String(year) },
  ];

  return (
    <Page size="A4" style={S.coverPage}>
      {/* Top green banner */}
      <View style={S.coverBanner}>
        <Text style={S.coverBannerLabel}>Zimbabwe School Examinations Council</Text>
        <Text style={S.coverBannerTitle}>{project.topic || `${project.subject} Heritage Project`}</Text>
        <Text style={S.coverBannerSubtitle}>Heritage-Based Curriculum (HBC 5.0) — {project.subject}</Text>
      </View>

      {/* Gold divider */}
      <View style={S.coverGoldBar} />

      {/* Info card */}
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

      {/* Footer */}
      <View style={S.coverFooter}>
        <Text style={S.coverFooterText}>Generated via Pass Study Platform</Text>
        <Text style={S.coverFooterBold}>pass.ac.zw</Text>
      </View>
    </Page>
  );
}

// ── Body Pages ────────────────────────────────────────────────────────────────

function BodyPages({ project, blocks }: { project: Project; blocks: Block[] }) {
  const shortTitle = (project.topic || project.subject).slice(0, 55) + ((project.topic || "").length > 55 ? "…" : "");

  return (
    <Page
      size="A4"
      style={S.bodyPage}
      wrap
    >
      {/* Running header */}
      <View style={S.runningHeader} fixed>
        <Text style={S.runningHeaderLeft}>{shortTitle}</Text>
        <Text style={S.runningHeaderRight}>{project.subject} · {project.grade}</Text>
      </View>

      {/* Page number */}
      <Text
        style={S.pageNumber}
        fixed
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />

      {/* Content */}
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </Page>
  );
}

// ── Document ──────────────────────────────────────────────────────────────────

function ProjectDocument({ project, blocks }: { project: Project; blocks: Block[] }) {
  return (
    <Document
      title={project.topic ?? project.subject}
      author={project.studentName ?? "Student"}
      subject={`ZIMSEC HBC Project — ${project.subject}`}
      keywords="ZIMSEC, HBC, Zimbabwe, heritage"
    >
      <CoverPage project={project} />
      <BodyPages project={project} blocks={blocks} />
    </Document>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a PDF buffer for a project using @react-pdf/renderer.
 */
export async function generateProjectPdfBuffer(project: Project): Promise<Buffer> {
  // Parse the AI-generated markdown
  let blocks = parseMarkdown(project.content ?? "");

  // Upgrade "Candidate Information" paragraph block to styled InfoBox if present
  const candidateExtract = extractCandidateInfo(blocks);
  if (candidateExtract) {
    // Rebuild blocks: replace the h2 + paragraph pairs with h2 + InfoBox trigger
    const { infoBlock, rest } = candidateExtract;
    const h2Idx = rest.findIndex(b => b.type === "h2" && (b as { type: "h2"; text: string }).text.toLowerCase().includes("candidate"));
    if (h2Idx !== -1 && infoBlock.length > 0) {
      // Insert a special sentinel that BlockView will render as InfoBox
      rest.splice(h2Idx + 1, 0, {
        type: "table",
        headers: ["Field", "Details"],
        rows: infoBlock.map(p => [p.label, p.value]),
      } as Block);
    }
    blocks = rest;
  }

  const buffer = await renderToBuffer(
    <ProjectDocument project={project} blocks={blocks} />
  );
  return Buffer.from(buffer);
}
