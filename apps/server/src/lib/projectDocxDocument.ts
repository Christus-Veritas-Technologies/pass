/**
 * DOCX generation for ZIMSEC HBC projects using the `docx` package.
 * Converts the project's markdown content to a formatted Word document.
 * No platform branding — footer shows student name + school name only.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Footer,
  Header,
  PageNumber,
  convertInchesToTwip,
  ShadingType,
} from "docx";
import type { Project } from "@pass/db";

// ── Colour palette (matches PDF theme 1 by default — not project-specific in DOCX) ──
const PRIMARY = "1a5c2e";
const ACCENT  = "c8a84b";
const LIGHT   = "e8f5ed";

// ── Markdown parser ───────────────────────────────────────────────────────────

type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "li"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "blank" };

function parseMarkdownBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = (lines[i] ?? "").trimEnd();

    if (line.startsWith("# "))   { blocks.push({ type: "h1", text: line.slice(2).trim() }); i++; continue; }
    if (line.startsWith("## "))  { blocks.push({ type: "h2", text: line.slice(3).trim() }); i++; continue; }
    if (line.startsWith("### ")) { blocks.push({ type: "h3", text: line.slice(4).trim() }); i++; continue; }

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
      blocks.push({ type: "li", text: line.slice(2).trim() }); i++; continue;
    }
    if (/^\d+\.\s/.test(line)) {
      blocks.push({ type: "li", text: line.replace(/^\d+\.\s/, "").trim() }); i++; continue;
    }

    if (line.trim() === "") { blocks.push({ type: "blank" }); i++; continue; }
    blocks.push({ type: "p", text: line.trim() }); i++;
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
  const headers = rows[0] ?? [];
  const dataStart = rows.length > 1 && (rows[1] ?? []).every(c => /^[-: ]+$/.test(c)) ? 2 : 1;
  const dataRows = rows.slice(dataStart).filter(r => r.some(c => c.trim().length > 0));
  if (headers.length === 0) return null;
  return { type: "table", headers, rows: dataRows };
}

// ── Inline text runs (bold/italic/sub/sup) ───────────────────────────────────

type RunToken =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "sub"; text: string }
  | { kind: "sup"; text: string };

function tokenise(raw: string): RunToken[] {
  const tokens: RunToken[] = [];
  // Unified regex: **bold**, _italic_, <sub>…</sub>, <sup>…</sup>
  const re = /\*\*([^*]+)\*\*|_([^_]+)_|<sub>([\s\S]*?)<\/sub>|<sup>([\s\S]*?)<\/sup>/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) tokens.push({ kind: "text", text: raw.slice(last, m.index) });
    if      (m[1] !== undefined) tokens.push({ kind: "bold",   text: m[1] });
    else if (m[2] !== undefined) tokens.push({ kind: "italic", text: m[2] });
    else if (m[3] !== undefined) tokens.push({ kind: "sub",    text: m[3] });
    else if (m[4] !== undefined) tokens.push({ kind: "sup",    text: m[4] });
    last = m.index + m[0].length;
  }
  if (last < raw.length) tokens.push({ kind: "text", text: raw.slice(last) });
  return tokens;
}

function textRuns(raw: string, baseSize = 22): TextRun[] {
  const tokens = tokenise(raw);
  if (tokens.length === 0) return [new TextRun({ text: raw, size: baseSize })];

  return tokens.map(t => {
    switch (t.kind) {
      case "bold":   return new TextRun({ text: t.text, bold: true, size: baseSize });
      case "italic": return new TextRun({ text: t.text, italics: true, size: baseSize });
      case "sub":    return new TextRun({ text: t.text, subScript: true, size: Math.round(baseSize * 0.75) });
      case "sup":    return new TextRun({ text: t.text, superScript: true, size: Math.round(baseSize * 0.75) });
      default:       return new TextRun({ text: t.text, size: baseSize });
    }
  });
}

// ── Block → docx elements ─────────────────────────────────────────────────────

function blockToParagraph(block: Block): Paragraph | Table | null {
  if (block.type === "blank") return new Paragraph({ text: "", spacing: { after: 80 } });

  if (block.type === "h1") return new Paragraph({
    text: block.text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
  });

  if (block.type === "h2") return new Paragraph({
    text: block.text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT } },
  });

  if (block.type === "h3") return new Paragraph({
    text: block.text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 60 },
  });

  if (block.type === "p") return new Paragraph({
    children: textRuns(block.text),
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120, line: 360, lineRule: "auto" },
  });

  if (block.type === "li") return new Paragraph({
    children: textRuns(block.text),
    bullet: { level: 0 },
    spacing: { after: 60, line: 320, lineRule: "auto" },
  });

  if (block.type === "table") {
    const headerRow = new TableRow({
      children: block.headers.map(h => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 18 })] })],
        shading: { type: ShadingType.SOLID, color: PRIMARY, fill: PRIMARY },
        width: { size: Math.floor(9072 / block.headers.length), type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
      })),
      tableHeader: true,
    });

    const dataRows = block.rows.map((row, ri) => new TableRow({
      children: row.map((cell) => new TableCell({
        children: [new Paragraph({ children: textRuns(cell, 18), spacing: { after: 0 } })],
        shading: ri % 2 === 1
          ? { type: ShadingType.SOLID, color: LIGHT, fill: LIGHT }
          : undefined,
        width: { size: Math.floor(9072 / (block.headers.length || row.length || 1)), type: WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
      })),
    }));

    return new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 9072, type: WidthType.DXA },
      margins: { top: 120, bottom: 120 },
    });
  }

  return null;
}

// ── Cover page paragraphs ─────────────────────────────────────────────────────

function coverParagraphs(project: Project): (Paragraph | Table)[] {
  const year = new Date(project.createdAt).getFullYear();
  const name     = project.studentName  && project.studentName  !== "_" ? project.studentName  : "—";
  const school   = project.schoolName   && project.schoolName   !== "_" ? project.schoolName   : "—";
  const centre   = project.centreNumber && project.centreNumber !== "_" ? project.centreNumber : "—";
  const candidate = project.candidateNumber && project.candidateNumber !== "_" ? project.candidateNumber : "—";

  return [
    new Paragraph({
      children: [new TextRun({ text: "Zimbabwe School Examinations Council", bold: true, size: 22, color: PRIMARY })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [new TextRun({ text: project.topic || `${project.subject} Heritage Project`, bold: true, size: 48, color: PRIMARY })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Heritage-Based Curriculum (HBC 5.0) — ${project.subject}`, size: 22, color: "555555", italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
    }),
    // Candidate info table
    new Table({
      rows: [
        ["Student Name", name],
        ["School", school],
        ["Centre Number", centre],
        ["Candidate Number", candidate],
        ["Grade / Form", project.grade],
        ["Subject", project.subject],
        ["Academic Year", String(year)],
      ].map(([label, value], i) => new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color: PRIMARY })] })],
            shading: i % 2 === 1 ? { type: ShadingType.SOLID, color: LIGHT, fill: LIGHT } : undefined,
            width: { size: 2500, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 140, right: 140 },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: value, size: 20 })] })],
            shading: i % 2 === 1 ? { type: ShadingType.SOLID, color: LIGHT, fill: LIGHT } : undefined,
            width: { size: 6572, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 140, right: 140 },
          }),
        ],
      })),
      width: { size: 9072, type: WidthType.DXA },
    }),
    // Page break after cover
    new Paragraph({ children: [new TextRun({ break: 1 })], pageBreakBefore: true }),
  ];
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateProjectDocxBuffer(project: Project): Promise<Buffer> {
  const year = new Date(project.createdAt).getFullYear();
  const name   = project.studentName && project.studentName   !== "_" ? project.studentName   : "";
  const school = project.schoolName  && project.schoolName    !== "_" ? project.schoolName    : "";

  const blocks = parseMarkdownBlocks(project.content ?? "");

  const bodyElements: (Paragraph | Table)[] = [];
  for (const block of blocks) {
    // Skip the H1 title in body — it's on the cover page
    if (block.type === "h1") continue;
    // Skip Candidate Information section if present — cover handles it
    if (block.type === "h2" && block.text.toLowerCase().includes("candidate")) continue;

    const el = blockToParagraph(block);
    if (el) bodyElements.push(el);
  }

  const footerParts = [name, school, String(year)].filter(Boolean).join("  ·  ");

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: 22, color: "111111" },
          paragraph: { spacing: { line: 360, lineRule: "auto" }, alignment: AlignmentType.JUSTIFIED },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          run: { bold: true, size: 32, color: PRIMARY, font: "Calibri" },
          paragraph: { spacing: { before: 480, after: 160 } },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          run: { bold: true, size: 26, color: PRIMARY, font: "Calibri" },
          paragraph: { spacing: { before: 360, after: 120 } },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          run: { bold: true, size: 24, color: "444444", font: "Calibri" },
          paragraph: { spacing: { before: 240, after: 80 } },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top:    convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left:   convertInchesToTwip(1.25),
              right:  convertInchesToTwip(1.25),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: project.topic || project.subject, size: 18, color: "777777", italics: true }),
                ],
                alignment: AlignmentType.RIGHT,
                border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" } },
                spacing: { after: 0 },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: footerParts, size: 18, color: "777777" }),
                  new TextRun({ text: "    Page ", size: 18, color: "777777" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "777777" }),
                ],
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" } },
                alignment: AlignmentType.CENTER,
                spacing: { before: 0 },
              }),
            ],
          }),
        },
        children: [
          ...coverParagraphs(project),
          ...bodyElements,
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
