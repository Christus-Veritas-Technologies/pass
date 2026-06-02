/**
 * Project PDF generator — PDFKit direct implementation.
 *
 * Replaces the @react-pdf/renderer version which had an unresolvable Yoga
 * layout-engine bug producing "unsupported number: -2.50178899950105e+21"
 * inside renderText regardless of how styles were structured.
 *
 * PDFKit is the same underlying library @react-pdf/renderer wraps for PDF
 * primitives. Using it directly eliminates the React/Yoga layer entirely.
 * The output matches the original template: A4, Helvetica headings,
 * Times-Roman body, navy accents, running header, page footer.
 */

import PDFDocument from "pdfkit";
import type { Project } from "@pass/db";

// ── Page geometry ─────────────────────────────────────────────────────────────

const PAGE_W   = 595.28;   // A4 width  (pt)
const PAGE_H   = 841.89;   // A4 height (pt)
const ML       = 64;       // left margin
const MR       = 64;       // right margin
const CW       = PAGE_W - ML - MR;   // content width = 467.28 pt
const HEADER_H = 42;       // running-header zone (top of each body page)
const FOOTER_Y = PAGE_H - 48;        // Y where the footer rule is drawn
const BODY_TOP = HEADER_H + 2;       // first usable content Y on body pages
const BODY_BOT = FOOTER_Y - 12;      // last usable content Y before footer

// ── Palette ───────────────────────────────────────────────────────────────────

const BLACK       = "#111111";
const BODY_GREY   = "#333333";
const MID_GREY    = "#666666";
const LIGHT_GREY  = "#bbbbbb";
const RULE_GREY   = "#dddddd";
const ACCENT      = "#1e3a5f";   // deep navy
const ACCENT_SOFT = "#2c5282";   // h2 colour
const BG_SUBTLE   = "#f7f8fa";   // table header / cover label bg

// ── Types ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PDFDoc = any; // PDFKit document — use `any` to avoid @types/pdfkit version skew

type Span = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  sub?: boolean;
  sup?: boolean;
};

type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "p";  spans: Span[] }
  | { type: "li"; spans: Span[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "spacer" };

// ── Sanitisation ──────────────────────────────────────────────────────────────

/** Strip non-Latin-1 characters from short metadata strings. */
function sanitizeMeta(s: unknown): string {
  return String(s ?? "")
    .replace(/[–—]/g, "-")
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/…/g, "...")
    .replace(/[^\x00-\xFF]/g, "");
}

/** Full preprocessing for AI-generated body content. */
function preprocessContent(raw: string): string {
  let s = raw;

  // HTML entities
  s = s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&hellip;/g, "...").replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–").replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'").replace(/&rsquo;/g, "'").replace(/&deg;/g, "°")
    .replace(/&plusmn;/g, "±").replace(/&times;/g, "×").replace(/&divide;/g, "÷")
    .replace(/&micro;/g, "µ").replace(/&copy;/g, "©").replace(/&reg;/g, "®")
    .replace(/&trade;/g, "™").replace(/&frac12;/g, "½").replace(/&frac14;/g, "¼")
    .replace(/&frac34;/g, "¾");

  // HTML sub/sup tags
  s = s.replace(/<sub>([\s\S]*?)<\/sub>/gi, (_m, i: string) => `[[sub:${i.trim()}]]`);
  s = s.replace(/<sup>([\s\S]*?)<\/sup>/gi, (_m, i: string) => `[[sup:${i.trim()}]]`);

  // Unicode subscript / superscript characters
  const subMap: Record<string, string> = {
    "₀":"0","₁":"1","₂":"2","₃":"3","₄":"4","₅":"5","₆":"6","₇":"7","₈":"8","₉":"9",
    "ₐ":"a","ₑ":"e","ₒ":"o","ₓ":"x","ₕ":"h","ₖ":"k","ₗ":"l","ₘ":"m","ₙ":"n","ₚ":"p","ₛ":"s","ₜ":"t",
  };
  s = s.replace(/[₀-ₜ]+/g, m => `[[sub:${[...m].map(c => subMap[c] ?? c).join("")}]]`);

  const supMap: Record<string, string> = {
    "⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9","ⁿ":"n","ⁱ":"i",
  };
  s = s.replace(/[⁰¹²³⁴-⁹ⁿⁱ]+/g, m => `[[sup:${[...m].map(c => supMap[c] ?? c).join("")}]]`);

  // Math / arrow symbols → ASCII
  s = s
    .replace(/→/g, "->").replace(/←/g, "<-").replace(/↑/g, "^").replace(/↓/g, "v")
    .replace(/⇒/g, "=>").replace(/⇐/g, "<=").replace(/⇔/g, "<=>").replace(/↔/g, "<->")
    .replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/≠/g, "!=").replace(/≈/g, "~=")
    .replace(/∞/g, "infinity").replace(/√/g, "sqrt").replace(/∑/g, "sum")
    .replace(/∏/g, "product").replace(/∫/g, "integral").replace(/∂/g, "d")
    .replace(/[Δ∆]/g, "delta").replace(/−/g, "-").replace(/[·⋅]/g, "*")
    .replace(/α/g, "alpha").replace(/β/g, "beta").replace(/γ/g, "gamma")
    .replace(/δ/g, "delta").replace(/ε/g, "epsilon").replace(/θ/g, "theta")
    .replace(/λ/g, "lambda").replace(/μ/g, "mu").replace(/π/g, "pi")
    .replace(/σ/g, "sigma").replace(/ω/g, "omega").replace(/Ω/g, "Omega")
    .replace(/Σ/g, "Sigma").replace(/Π/g, "Pi")
    .replace(/‑/g, "-").replace(/′/g, "'").replace(/″/g, "''");

  // Final safety pass: strip any remaining non-Latin-1 character
  const EXTRA: Record<string, string> = {
    "•":"-","‣":"-","●":"-","○":"o","■":"-","✓":"v","✔":"v","✗":"x","✘":"x",
    "★":"*","☆":"*","−":"-","‐":"-","―":"-","─":"-",
    "­":"","⁠":"","​":"","‌":"","‍":"","﻿":"",
  };
  s = s.replace(/[^\x00-\xFF]/g, ch => EXTRA[ch] ?? "");

  return s;
}

// ── Span parser ───────────────────────────────────────────────────────────────

function parseSpans(line: string): Span[] {
  const spans: Span[] = [];
  const re = /\*\*([^*]+)\*\*|_([^_]+)_|\[\[sub:([^\]]+)\]\]|\[\[sup:([^\]]+)\]\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) spans.push({ text: line.slice(last, m.index) });
    if      (m[1] !== undefined) spans.push({ text: m[1], bold: true });
    else if (m[2] !== undefined) spans.push({ text: m[2], italic: true });
    else if (m[3] !== undefined) spans.push({ text: m[3], sub: true });
    else if (m[4] !== undefined) spans.push({ text: m[4], sup: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) spans.push({ text: line.slice(last) });
  return spans.filter(s => s.text.length > 0);
}

function spansToPlainText(spans: Span[]): string {
  return spans.map(s => s.text).join("");
}

// ── Markdown parser ───────────────────────────────────────────────────────────

function parseMarkdown(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = (lines[i] ?? "").trimEnd();

    if (line.startsWith("# "))   { blocks.push({ type: "h1", text: line.slice(2).trim()  }); i++; continue; }
    if (line.startsWith("## "))  { blocks.push({ type: "h2", text: line.slice(3).trim()  }); i++; continue; }
    if (line.startsWith("### ")) { blocks.push({ type: "h3", text: line.slice(4).trim()  }); i++; continue; }

    if (/^\s*\|/.test(line)) {
      const tLines: string[] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i] ?? "")) { tLines.push(lines[i] ?? ""); i++; }
      const t = parseTable(tLines);
      if (t) blocks.push(t);
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

function parseTable(lines: string[]): (Block & { type: "table" }) | null {
  const split = (l: string): string[] =>
    l.split("|").map(c => c.trim()).filter((_c, idx, a) => idx > 0 && idx < a.length - 1);
  const rows = lines.map(split);
  if (!rows.length) return null;
  const headers  = rows[0] ?? [];
  const dataFrom = rows.length > 1 && (rows[1] ?? []).every(c => /^[-: ]+$/.test(c)) ? 2 : 1;
  const data     = rows.slice(dataFrom).filter(r => r.some(c => c.trim().length > 0));
  return headers.length ? { type: "table", headers, rows: data } : null;
}

// ── PDFKit drawing helpers ────────────────────────────────────────────────────

function hRule(doc: PDFDoc, x: number, y: number, w: number, color = RULE_GREY, lw = 0.5) {
  doc.save().strokeColor(color).lineWidth(lw)
    .moveTo(x, y).lineTo(x + w, y).stroke().restore();
}

function fillRect(doc: PDFDoc, x: number, y: number, w: number, h: number, color: string) {
  doc.save().rect(x, y, w, h).fill(color).restore();
}

function strokeRect(doc: PDFDoc, x: number, y: number, w: number, h: number, color = RULE_GREY, lw = 0.5) {
  doc.save().rect(x, y, w, h).lineWidth(lw).stroke(color).restore();
}

// ── Span rendering ────────────────────────────────────────────────────────────

/**
 * Render inline spans using PDFKit's `continued` API.
 * PDFKit handles inline glyph positioning directly — no layout engine involved.
 */
function renderSpans(
  doc: PDFDoc,
  spans: Span[],
  x: number,
  y: number,
  w: number,
  baseSize: number,
  baseFont: string,
) {
  if (!spans.length) return;

  const hasFormatting = spans.some(s => s.bold || s.italic || s.sub || s.sup);

  if (!hasFormatting) {
    // Fast path: flat text, no mixed formatting
    doc.font(baseFont).fontSize(baseSize).fillColor(BODY_GREY)
      .text(spansToPlainText(spans), x, y, { width: w, align: "left", lineBreak: true });
    return;
  }

  doc.fillColor(BODY_GREY);

  for (let i = 0; i < spans.length; i++) {
    const s      = spans[i]!;
    const isLast = i === spans.length - 1;
    let font = baseFont;
    let size = baseSize;
    let rise = 0;

    if (s.bold && s.italic) {
      font = baseFont.startsWith("Times") ? "Times-BoldItalic" : "Helvetica-BoldOblique";
    } else if (s.bold) {
      font = baseFont.startsWith("Times") ? "Times-Bold" : "Helvetica-Bold";
    } else if (s.italic) {
      font = baseFont.startsWith("Times") ? "Times-Italic" : "Helvetica-Oblique";
    } else if (s.sub) {
      size = Math.max(6, Math.round(baseSize * 0.65));
      rise = -2;
    } else if (s.sup) {
      size = Math.max(6, Math.round(baseSize * 0.65));
      rise = 3;
    }

    doc.font(font).fontSize(size);

    if (i === 0) {
      doc.text(s.text, x, y, { width: w, continued: !isLast, lineBreak: isLast, rise });
    } else {
      doc.text(s.text, { continued: !isLast, lineBreak: isLast, rise });
    }
  }

  // Restore base font/size after inline formatting
  doc.font(baseFont).fontSize(baseSize);
}

// ── Page chrome ───────────────────────────────────────────────────────────────

function drawRunningHeader(doc: PDFDoc, title: string, grade: string) {
  doc.save()
    .font("Helvetica").fontSize(7.5).fillColor(LIGHT_GREY)
    .text(title, ML, 20, { width: CW * 0.65, lineBreak: false })
    .text(grade,  ML, 20, { width: CW, align: "right", lineBreak: false })
    .restore();
  hRule(doc, ML, 34, CW);
}

function stampFooter(doc: PDFDoc, bodyPageNum: number, totalBodyPages: number) {
  hRule(doc, ML, FOOTER_Y, CW);
  doc.save()
    .font("Helvetica").fontSize(7.5).fillColor(LIGHT_GREY)
    .text("pass.ac.zw", ML, FOOTER_Y + 9, { width: CW / 2, lineBreak: false })
    .text(`Page ${bodyPageNum} of ${totalBodyPages}`, ML, FOOTER_Y + 9, { width: CW, align: "right", lineBreak: false })
    .restore();
}

// ── Cover page ────────────────────────────────────────────────────────────────

function renderCoverPage(doc: PDFDoc, project: Project) {
  // Navy top bar
  fillRect(doc, 0, 0, PAGE_W, 5, ACCENT);

  let y = 64;

  // Institution
  doc.font("Helvetica").fontSize(8.5).fillColor(MID_GREY)
    .text("Zimbabwe School Examinations Council", ML, y, { width: CW, align: "center" })
    .text("Heritage-Based Curriculum Project",   ML, y + 13, { width: CW, align: "center" });
  y += 46;

  hRule(doc, ML, y, CW, RULE_GREY);
  y += 20;

  // Title
  const title = sanitizeMeta(project.topic || `${project.subject} Heritage Project`);
  doc.font("Helvetica-Bold").fontSize(22).fillColor(BLACK)
    .text(title, ML, y, { width: CW, align: "center", lineBreak: true });
  y = (doc.y as number) + 12;

  // Subtitle
  doc.font("Helvetica").fontSize(11).fillColor(MID_GREY)
    .text(`HBC 5.0 — ${sanitizeMeta(project.subject)}`, ML, y, { width: CW, align: "center" });
  y = (doc.y as number) + 40;

  // Student info table
  const year = String(new Date(project.createdAt).getFullYear());
  const rows: [string, string][] = [
    ["Student Name",     sanitizeMeta(project.studentName    && project.studentName    !== "_" ? project.studentName    : "—")],
    ["School",           sanitizeMeta(project.schoolName     && project.schoolName     !== "_" ? project.schoolName     : "—")],
    ["Centre Number",    sanitizeMeta(project.centreNumber   && project.centreNumber   !== "_" ? project.centreNumber   : "—")],
    ["Candidate Number", sanitizeMeta(project.candidateNumber && project.candidateNumber !== "_" ? project.candidateNumber : "—")],
    ["Grade / Form",     sanitizeMeta(project.grade ?? "—")],
    ["Subject",          sanitizeMeta(project.subject)],
    ["Academic Year",    year],
  ];

  const LABEL_W = 150;
  const VAL_W   = CW - LABEL_W;
  const ROW_H   = 22;

  strokeRect(doc, ML, y, CW, rows.length * ROW_H);

  for (let i = 0; i < rows.length; i++) {
    const [label, val] = rows[i]!;
    const ry = y + i * ROW_H;
    if (i > 0) hRule(doc, ML, ry, CW);
    fillRect(doc, ML, ry, LABEL_W, ROW_H, BG_SUBTLE);
    // Vertical divider
    doc.save().strokeColor(RULE_GREY).lineWidth(0.5)
      .moveTo(ML + LABEL_W, ry).lineTo(ML + LABEL_W, ry + ROW_H).stroke().restore();
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(BODY_GREY)
      .text(label, ML + 10, ry + 7, { width: LABEL_W - 18, lineBreak: false });
    doc.font("Helvetica").fontSize(9.5).fillColor(BLACK)
      .text(val,  ML + LABEL_W + 10, ry + 7, { width: VAL_W - 18, lineBreak: false });
  }

  // Cover footer
  const footerY = PAGE_H - 38;
  hRule(doc, ML, footerY, CW, RULE_GREY);
  doc.save().font("Helvetica").fontSize(8).fillColor(LIGHT_GREY)
    .text("Generated via Pass Study Platform", ML, footerY + 9, { width: CW / 2, lineBreak: false })
    .text("pass.ac.zw", ML, footerY + 9, { width: CW, align: "right", lineBreak: false })
    .restore();
}

// ── Block-level rendering ─────────────────────────────────────────────────────

function ensureRoom(doc: PDFDoc, needed: number) {
  if ((doc.y as number) + needed > BODY_BOT) doc.addPage();
}

function renderTable(
  doc: PDFDoc,
  headers: string[],
  rows: string[][],
) {
  const numCols   = Math.max(1, headers.length);
  const colW      = CW / numCols;
  const H_ROW_H   = 22;
  const D_ROW_H   = 20;

  ensureRoom(doc, H_ROW_H + (rows.length > 0 ? D_ROW_H : 0));

  const startY = doc.y as number;

  // Header row
  fillRect(doc, ML, startY, CW, H_ROW_H, BG_SUBTLE);
  hRule(doc, ML, startY + H_ROW_H, CW, ACCENT, 1.5);
  strokeRect(doc, ML, startY, CW, H_ROW_H);

  for (let c = 0; c < numCols; c++) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(BLACK)
      .text(sanitizeMeta(headers[c] ?? ""), ML + c * colW + 6, startY + 7, { width: colW - 12, lineBreak: false });
  }

  let y = startY + H_ROW_H;

  for (let r = 0; r < rows.length; r++) {
    if ((y as number) + D_ROW_H > BODY_BOT) {
      doc.addPage(); // pageAdded event draws header + resets doc.y
      y = doc.y as number;
    }
    const row = rows[r] ?? [];
    if (r % 2 !== 0) fillRect(doc, ML, y, CW, D_ROW_H, "#fcfcfd");
    hRule(doc, ML, y, CW, RULE_GREY);
    strokeRect(doc, ML, y, CW, D_ROW_H);

    for (let c = 0; c < numCols; c++) {
      doc.font("Times-Roman").fontSize(9.5).fillColor(BODY_GREY)
        .text(sanitizeMeta(row[c] ?? ""), ML + c * colW + 6, y + 6, { width: colW - 12, lineBreak: false });
    }
    y += D_ROW_H;
  }

  doc.y = y + 4;
}

function renderBlocks(doc: PDFDoc, blocks: Block[]) {
  for (const block of blocks) {

    if (block.type === "spacer") {
      doc.y = (doc.y as number) + 4;
      continue;
    }

    if (block.type === "h1") {
      ensureRoom(doc, 32);
      const y = doc.y as number;
      const topGap = y > BODY_TOP + 8 ? 14 : 0;
      doc.font("Helvetica-Bold").fontSize(14).fillColor(BLACK)
        .text(sanitizeMeta(block.text), ML, y + topGap, { width: CW, lineBreak: true });
      hRule(doc, ML, doc.y as number, CW, ACCENT, 2);
      doc.y = (doc.y as number) + 8;
      continue;
    }

    if (block.type === "h2") {
      ensureRoom(doc, 26);
      const y = doc.y as number;
      const topGap = y > BODY_TOP + 8 ? 10 : 0;
      doc.font("Helvetica-Bold").fontSize(12).fillColor(ACCENT_SOFT)
        .text(sanitizeMeta(block.text), ML, y + topGap, { width: CW, lineBreak: true });
      doc.y = (doc.y as number) + 4;
      continue;
    }

    if (block.type === "h3") {
      ensureRoom(doc, 20);
      const y = doc.y as number;
      const topGap = y > BODY_TOP + 8 ? 6 : 0;
      doc.font("Helvetica-Bold").fontSize(11).fillColor(BODY_GREY)
        .text(sanitizeMeta(block.text), ML, y + topGap, { width: CW, lineBreak: true });
      doc.y = (doc.y as number) + 3;
      continue;
    }

    if (block.type === "p") {
      const text = spansToPlainText(block.spans).trim();
      if (!text) continue;
      ensureRoom(doc, 18);
      renderSpans(doc, block.spans, ML, doc.y as number, CW, 11, "Times-Roman");
      doc.y = (doc.y as number) + 5;
      continue;
    }

    if (block.type === "li") {
      const text = spansToPlainText(block.spans).trim();
      if (!text) continue;
      ensureRoom(doc, 16);
      const y = doc.y as number;
      // Bullet
      doc.font("Times-Roman").fontSize(11).fillColor(MID_GREY)
        .text("–", ML + 14, y, { width: 14, lineBreak: false });
      // Text (indented)
      renderSpans(doc, block.spans, ML + 28, y, CW - 28, 11, "Times-Roman");
      doc.y = (doc.y as number) + 3;
      continue;
    }

    if (block.type === "table") {
      renderTable(doc, block.headers, block.rows);
      continue;
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateProjectPdfBuffer(project: Project): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = new (PDFDocument as any)({
      size: "A4",
      margin: 0,
      bufferPages: true,
      autoFirstPage: false,
      info: {
        Title:    sanitizeMeta(project.topic ?? project.subject),
        Author:   sanitizeMeta(project.studentName ?? "Student"),
        Subject:  `ZIMSEC HBC Project — ${sanitizeMeta(project.subject)}`,
        Keywords: "ZIMSEC, HBC, Zimbabwe, heritage",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data",  (c: Buffer) => chunks.push(c));
    doc.on("error", reject);

    // Page counter so we can skip drawing the header on the cover page
    let pagesAdded = 0;
    let runTitle = "";
    let runGrade = "";

    doc.on("pageAdded", () => {
      pagesAdded++;
      if (pagesAdded >= 2) {
        // Every body page: draw running header then set Y below it
        drawRunningHeader(doc, runTitle, runGrade);
        doc.y = BODY_TOP + 2;
      }
    });

    try {
      // ── Cover page ────────────────────────────────────────────────────────
      doc.addPage(); // pagesAdded = 1, no header
      renderCoverPage(doc, project);

      // ── Body pages ────────────────────────────────────────────────────────
      const content = preprocessContent(project.content ?? "");
      const blocks  = parseMarkdown(content);

      runTitle = sanitizeMeta((project.topic || project.subject).slice(0, 60));
      runGrade = sanitizeMeta(project.grade ?? "");

      doc.addPage(); // pagesAdded = 2, header drawn, doc.y = BODY_TOP + 2
      renderBlocks(doc, blocks);

      // ── Stamp footer on all body pages ────────────────────────────────────
      const range      = doc.bufferedPageRange() as { start: number; count: number };
      const totalBody  = range.count - 1; // exclude cover

      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        if (i === 0) continue; // cover — no footer
        stampFooter(doc, i, totalBody);
      }

      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
