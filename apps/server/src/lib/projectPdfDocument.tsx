/** @jsxImportSource react */
/**
 * @react-pdf/renderer document for ZIMSEC HBC projects.
 *
 * Parses the AI-generated markdown content into PDF primitives
 * (no Puppeteer, no HTML — generates proper text-searchable PDFs).
 */

import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Project } from "@pass/db";

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: "Times-Roman",
    fontSize: 12,
    lineHeight: 1.6,
    color: "#000000",
    paddingTop: 70,
    paddingBottom: 70,
    paddingLeft: 57,  // ~20mm
    paddingRight: 57,
  },

  // Cover page
  cover: { flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1 },
  coverHeader: {
    fontSize: 11,
    fontFamily: "Times-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    borderBottomWidth: 2,
    borderBottomColor: "#000000",
    paddingBottom: 8,
    marginBottom: 24,
    textAlign: "center",
    width: "100%",
  },
  coverTitle: {
    fontSize: 18,
    fontFamily: "Times-Bold",
    lineHeight: 1.4,
    marginBottom: 40,
    textAlign: "center",
  },
  metaRow: { flexDirection: "row", marginBottom: 4 },
  metaLabel: { fontFamily: "Times-Bold", width: 130, textAlign: "right", paddingRight: 8 },
  metaValue: { flex: 1 },

  // Body headings
  h1: {
    fontFamily: "Times-Bold",
    fontSize: 14,
    marginTop: 20,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 3,
  },
  h2: { fontFamily: "Times-Bold", fontSize: 13, marginTop: 16, marginBottom: 6 },
  h3: { fontFamily: "Times-Bold", fontSize: 12, marginTop: 12, marginBottom: 4 },

  // Body text
  paragraph: { marginBottom: 5, textAlign: "justify" },
  bulletRow: { flexDirection: "row", marginBottom: 3, paddingLeft: 16 },
  bulletDot: { width: 14 },
  bulletText: { flex: 1, textAlign: "justify" },

  // Blank separator
  spacer: { height: 6 },
});

// ── Markdown parser ───────────────────────────────────────────────────────────

type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "p"; spans: Span[] }
  | { type: "li"; spans: Span[] }
  | { type: "spacer" };

type Span = { text: string; bold: boolean };

function parseSpans(line: string): Span[] {
  const spans: Span[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) spans.push({ text: line.slice(last, m.index), bold: false });
    spans.push({ text: m[1] ?? "", bold: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) spans.push({ text: line.slice(last), bold: false });
  return spans;
}

function parseMarkdown(content: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of content.split("\n")) {
    const line = raw.trimEnd();
    if (line.startsWith("# "))   { blocks.push({ type: "h1", text: line.slice(2).trim() }); continue; }
    if (line.startsWith("## "))  { blocks.push({ type: "h2", text: line.slice(3).trim() }); continue; }
    if (line.startsWith("### ")) { blocks.push({ type: "h3", text: line.slice(4).trim() }); continue; }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      blocks.push({ type: "li", spans: parseSpans(line.slice(2).trim()) });
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      blocks.push({ type: "li", spans: parseSpans(line.replace(/^\d+\.\s/, "").trim()) });
      continue;
    }
    if (line.trim() === "") { blocks.push({ type: "spacer" }); continue; }
    blocks.push({ type: "p", spans: parseSpans(line) });
  }
  return blocks;
}

// ── Inline span renderer ──────────────────────────────────────────────────────

function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((s, i) =>
        s.bold
          ? <Text key={i} style={{ fontFamily: "Times-Bold" }}>{s.text}</Text>
          : <Text key={i}>{s.text}</Text>
      )}
    </>
  );
}

// ── Document component ────────────────────────────────────────────────────────

function ProjectDocument({ project, blocks }: { project: Project; blocks: Block[] }) {
  const year = new Date(project.createdAt).getFullYear();

  const meta: { label: string; value: string }[] = [
    { label: "Name:", value: project.studentName || "Student" },
    { label: "Centre Number:", value: project.centreNumber || "—" },
    { label: "Candidate Number:", value: project.candidateNumber || "—" },
    { label: "Grade:", value: project.grade },
    { label: "Subject:", value: project.subject },
    { label: "Year:", value: String(year) },
  ];

  return (
    <Document>
      {/* ── Cover page ── */}
      <Page size="A4" style={S.page}>
        <View style={S.cover}>
          <Text style={S.coverHeader}>ZIMSEC Heritage-Based Curriculum Project</Text>
          <Text style={S.coverTitle}>{project.topic}</Text>
          <View>
            {meta.map((m) => (
              <View key={m.label} style={S.metaRow}>
                <Text style={S.metaLabel}>{m.label}</Text>
                <Text style={S.metaValue}>{m.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>

      {/* ── Body pages ── */}
      <Page size="A4" style={S.page}>
        {blocks.map((block, i) => {
          if (block.type === "spacer") return <View key={i} style={S.spacer} />;
          if (block.type === "h1") return <Text key={i} style={S.h1}>{block.text}</Text>;
          if (block.type === "h2") return <Text key={i} style={S.h2}>{block.text}</Text>;
          if (block.type === "h3") return <Text key={i} style={S.h3}>{block.text}</Text>;
          if (block.type === "li") {
            return (
              <View key={i} style={S.bulletRow}>
                <Text style={S.bulletDot}>•</Text>
                <Text style={S.bulletText}><Spans spans={block.spans} /></Text>
              </View>
            );
          }
          // paragraph
          return (
            <Text key={i} style={S.paragraph}>
              <Spans spans={(block as { type: "p"; spans: Span[] }).spans} />
            </Text>
          );
        })}
      </Page>
    </Document>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a PDF buffer for a project using @react-pdf/renderer.
 * Drop-in replacement for the Puppeteer-based htmlToPdfBytes approach.
 */
export async function generateProjectPdfBuffer(project: Project): Promise<Buffer> {
  const blocks = parseMarkdown(project.content ?? "");
  const buffer = await renderToBuffer(<ProjectDocument project={project} blocks={blocks} />);
  return Buffer.from(buffer);
}
