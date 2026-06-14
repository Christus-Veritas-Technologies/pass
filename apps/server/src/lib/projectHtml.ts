/**
 * Canonical HTML document builder for ZIMSEC HBC projects.
 * Used by:
 *  - GET /projects/:id/html  → "screen" mode (gray bg, white A4 paper shadow)
 *  - GET /projects/:id/pdf   → "print" mode  (plain, handed to puppeteer)
 *  - WhatsApp PDF rendering  → "print" mode
 *
 * Visual design matches projectPdfDocument.tsx — clean Word-like academic style.
 */

import type { Project } from "@pass/db";
import { coverFieldRows } from "./projectCover";

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function contentToHtml(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      if (line.startsWith("# "))   return `<h1>${esc(line.slice(2))}</h1>`;
      if (line.startsWith("## "))  return `<h2>${esc(line.slice(3))}</h2>`;
      if (line.startsWith("### ")) return `<h3>${esc(line.slice(4))}</h3>`;
      if (line.startsWith("- ") || line.startsWith("* "))
        return `<li>${esc(line.slice(2))}</li>`;
      if (/^\d+\.\s/.test(line))
        return `<li>${esc(line.replace(/^\d+\.\s/, ""))}</li>`;
      if (line.trim() === "") return "<br/>";
      return `<p>${esc(line).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")}</p>`;
    })
    .join("\n");
}

export function buildProjectHtml(
  project: Project,
  mode: "screen" | "print" = "print",
): string {
  const contentHtml = contentToHtml(project.content);

  // Shared cover rows (SURNAME, NAME, …, PROJECT TITLE) — same source the PDF
  // and DOCX renderers use, so all three covers stay identical.
  const coverRowsHtml = coverFieldRows(project).map((row) =>
    `<tr><td class="lbl">${esc(row.label)}</td><td class="sep">:</td><td class="val">${esc(row.value)}</td></tr>`
  ).join("\n");

  const screenStyles = `
    html, body { background: #e8eaed; min-height: 100%; }
    .shell { padding: 32px 16px 64px; }
    .doc {
      background: #fff;
      max-width: 794px;
      margin: 0 auto;
      box-shadow: 0 1px 4px rgba(0,0,0,0.10), 0 4px 24px rgba(0,0,0,0.08);
      border-radius: 2px;
      overflow: hidden;
    }`;

  const printStyles = `
    html, body { background: #fff; }
    .shell, .doc {}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(project.topic)} — ZIMSEC HBC Project</title>
<style>
  /* ── Reset ── */
  @page { size: A4; margin: 22mm 18mm 22mm; }
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }

  /* ── Mode shell ── */
  ${mode === "screen" ? screenStyles : printStyles}

  /* ── Cover page (bordered candidate-information sheet) ── */
  .cover-body {
    padding: 40px;
    font-family: Arial, Helvetica, sans-serif;
  }
  .cover-frame {
    border: 1.5px solid #000;
    min-height: 1040px;        /* fill most of an A4 page like the reference */
    padding: 56px 52px;
  }
  .cover-table {
    border-collapse: collapse;
    width: 100%;
    font-size: 13pt;
    color: #000;
  }
  .cover-table td {
    padding: 11px 0;
    vertical-align: top;
  }
  .cover-table td.lbl {
    font-weight: bold;
    white-space: nowrap;
    width: 210px;
    text-transform: uppercase;
  }
  .cover-table td.sep { width: 18px; }
  .cover-table td.val { font-family: "Times New Roman", Times, serif; }

  /* ── Body content ── */
  .body-content {
    font-family: "Times New Roman", Times, serif;
    font-size: 11pt;
    line-height: 1.7;
    color: #333;
    padding: 40px 64px 56px;
    page-break-before: always;
  }

  /* ── Body headings ── */
  h1 {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14pt;
    font-weight: bold;
    color: #111;
    margin: 24px 0 8px;
    padding-bottom: 5px;
    border-bottom: 2px solid #1e3a5f;
    page-break-after: avoid;
  }
  h2 {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12pt;
    font-weight: bold;
    color: #2c5282;
    margin: 18px 0 5px;
    page-break-after: avoid;
  }
  h3 {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    font-weight: bold;
    color: #555;
    margin: 12px 0 3px;
    page-break-after: avoid;
  }

  /* ── Body text ── */
  p  { margin: 0 0 5px; text-align: justify; orphans: 3; widows: 3; }
  li { margin: 2px 0 2px 20px; list-style: none; padding-left: 4px; }
  li::before { content: "–"; margin-right: 6px; color: #888; }
  strong { font-weight: bold; }

  /* ── Print overrides ── */
  @media print {
    html, body { background: #fff; margin: 0; padding: 0; }
    .shell { padding: 0; }
    .doc { box-shadow: none; border-radius: 0; }
    .body-content { padding-top: 0; }
  }
</style>
</head>
<body>
<div class="shell">
<div class="doc">

  <!-- Cover: bordered candidate-information sheet -->
  <div class="cover-body">
    <div class="cover-frame">
      <table class="cover-table">
        ${coverRowsHtml}
      </table>
    </div>
  </div>

  <!-- Body -->
  <div class="body-content">
    ${contentHtml}
  </div>

</div>
</div>
</body>
</html>`;
}
