/**
 * Canonical HTML document builder for ZIMSEC HBC projects.
 * Used by:
 *  - GET /projects/:id/html  → "screen" mode (gray bg, white A4 paper shadow)
 *  - GET /projects/:id/pdf   → "print" mode  (plain, handed to puppeteer)
 *  - WhatsApp PDF rendering  → "print" mode
 */

import type { Project } from "@pass/db";

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
      if (line.startsWith("# "))  return `<h1>${esc(line.slice(2))}</h1>`;
      if (line.startsWith("## ")) return `<h2>${esc(line.slice(3))}</h2>`;
      if (line.startsWith("### ")) return `<h3>${esc(line.slice(4))}</h3>`;
      if (line.startsWith("- ") || line.startsWith("* "))
        return `<li>${esc(line.slice(2))}</li>`;
      if (/^\d+\.\s/.test(line))
        return `<li>${esc(line.replace(/^\d+\.\s/, ""))}</li>`;
      if (line.trim() === "") return "<br/>";
      // Inline **bold**
      return `<p>${esc(line).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")}</p>`;
    })
    .join("\n");
}

/**
 * Build the full HTML document for a project.
 *
 * @param mode
 *   "screen" — wraps content in a gray viewport with a white A4 paper card.
 *              Used for the iframe preview in the web app.
 *   "print"  — minimal wrapper; @page rules + puppeteer's print-media do
 *              the heavy lifting. Use for PDF generation.
 */
export function buildProjectHtml(
  project: Project,
  mode: "screen" | "print" = "print",
): string {
  const contentHtml = contentToHtml(project.content);
  const year = new Date(project.createdAt).getFullYear();

  const screenStyles = `
  html, body { background: #e8eaed; min-height: 100%; }
  .shell { padding: 24px 12px 48px; }
  .doc {
    background: #fff;
    max-width: 794px;
    margin: 0 auto;
    padding: 48px 56px 64px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.10), 0 4px 20px rgba(0,0,0,0.08);
    border-radius: 2px;
  }`;

  const printStyles = `
  html, body { background: #fff; }
  .shell {}
  .doc {}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(project.topic)} — ZIMSEC HBC Project</title>
<style>
  /* ── Page / reset ── */
  @page { size: A4; margin: 25mm 20mm; }
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }

  /* ── Mode-specific shell ── */
  ${mode === "screen" ? screenStyles : printStyles}

  /* ── Document typography ── */
  .doc {
    font-family: "Times New Roman", Times, serif;
    font-size: 12pt;
    line-height: 1.65;
    color: #000;
  }

  /* ── Cover page ── */
  .cover {
    text-align: center;
    page-break-after: always;
    padding-top: 60mm;
    padding-bottom: 20mm;
  }
  .cover-header {
    font-size: 13pt;
    font-weight: bold;
    letter-spacing: 1px;
    text-transform: uppercase;
    border-bottom: 2.5px solid #000;
    padding-bottom: 10px;
    margin-bottom: 32px;
  }
  .cover-title {
    font-size: 18pt;
    font-weight: bold;
    line-height: 1.4;
    margin-bottom: 52px;
  }
  .cover-meta { font-size: 12pt; line-height: 2.5; }
  .cover-meta table { margin: 0 auto; text-align: left; border-collapse: collapse; }
  .cover-meta td { padding: 1px 6px; }
  .cover-meta td:first-child { font-weight: bold; text-align: right; padding-right: 10px; }

  /* ── Body headings ── */
  h1 {
    font-size: 15pt; font-weight: bold;
    margin: 24px 0 10px;
    border-bottom: 1.5px solid #000;
    padding-bottom: 4px;
    page-break-after: avoid;
  }
  h2 {
    font-size: 13pt; font-weight: bold;
    margin: 20px 0 8px;
    page-break-after: avoid;
  }
  h3 {
    font-size: 12pt; font-weight: bold;
    margin: 15px 0 6px;
    page-break-after: avoid;
  }

  /* ── Body text ── */
  p { margin: 5px 0; text-align: justify; orphans: 3; widows: 3; }
  li { margin: 3px 0 3px 24px; }
  strong { font-weight: bold; }
  br { display: block; content: ""; margin-top: 4px; }

  /* ── Print overrides ── */
  @media print {
    html, body { background: #fff; margin: 0; padding: 0; }
    .shell { padding: 0; }
    .doc { box-shadow: none; border-radius: 0; padding: 0; max-width: none; }
  }
</style>
</head>
<body>
<div class="shell">
<div class="doc">

  <div class="cover">
    <div class="cover-header">ZIMSEC Heritage-Based Curriculum Project</div>
    <div class="cover-title">${esc(project.topic)}</div>
    <div class="cover-meta">
      <table>
        <tr><td>Name:</td><td>${esc(project.studentName || "Student")}</td></tr>
        <tr><td>Centre Number:</td><td>${esc(project.centreNumber || "—")}</td></tr>
        <tr><td>Candidate Number:</td><td>${esc(project.candidateNumber || "—")}</td></tr>
        <tr><td>Grade:</td><td>${esc(project.grade)}</td></tr>
        <tr><td>Subject:</td><td>${esc(project.subject)}</td></tr>
        <tr><td>Year:</td><td>${year}</td></tr>
      </table>
    </div>
  </div>

  <div class="body-content">
    ${contentHtml}
  </div>

</div>
</div>
</body>
</html>`;
}
