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
  const year = new Date(project.createdAt).getFullYear();

  const infoRows = [
    { label: "Student Name",     value: project.studentName    && project.studentName    !== "_" ? esc(project.studentName)    : "—" },
    { label: "School",           value: project.schoolName     && project.schoolName     !== "_" ? esc(project.schoolName)     : "—" },
    { label: "Centre Number",    value: project.centreNumber   && project.centreNumber   !== "_" ? esc(project.centreNumber)   : "—" },
    { label: "Candidate Number", value: project.candidateNumber && project.candidateNumber !== "_" ? esc(project.candidateNumber) : "—" },
    { label: "Grade / Form",     value: esc(project.grade) },
    { label: "Subject",          value: esc(project.subject) },
    { label: "Academic Year",    value: String(year) },
  ];

  const infoTableHtml = infoRows.map((row, i) =>
    `<tr class="${i % 2 === 0 ? "" : "alt"}"><td class="lbl">${row.label}</td><td>${row.value}</td></tr>`
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

  /* ── Cover page ── */
  .cover-top-bar {
    height: 6px;
    background: #1e3a5f;
  }
  .cover-body {
    padding: 48px 64px 36px;
    font-family: Arial, Helvetica, sans-serif;
  }
  .cover-institution {
    font-size: 8.5pt;
    color: #777;
    text-align: center;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 28px;
    line-height: 1.6;
  }
  .cover-rule {
    border: none;
    border-top: 1px solid #ddd;
    margin: 0 0 24px;
  }
  .cover-title {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 22pt;
    font-weight: bold;
    color: #111;
    text-align: center;
    line-height: 1.4;
    margin: 0 0 12px;
  }
  .cover-subtitle {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    color: #777;
    text-align: center;
    margin: 0 0 40px;
  }

  /* ── Candidate info table ── */
  .info-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #ddd;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9.5pt;
  }
  .info-table tr.alt { background: #f7f8fa; }
  .info-table td {
    padding: 7px 12px;
    border-bottom: 1px solid #ddd;
    color: #111;
    vertical-align: top;
  }
  .info-table tr:last-child td { border-bottom: none; }
  .info-table td.lbl {
    font-weight: bold;
    color: #333;
    width: 38%;
    background: #f7f8fa;
    border-right: 1px solid #ddd;
  }

  /* ── Cover footer ── */
  .cover-spacer { height: 48px; }
  .cover-footer-rule {
    border: none;
    border-top: 1px solid #ddd;
    margin: 0 0 12px;
  }
  .cover-footer {
    display: flex;
    justify-content: space-between;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8pt;
    color: #bbb;
  }

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

  <!-- Cover -->
  <div class="cover-top-bar"></div>
  <div class="cover-body">
    <p class="cover-institution">
      Zimbabwe School Examinations Council<br/>
      Heritage-Based Curriculum Project
    </p>
    <hr class="cover-rule"/>
    <h1 class="cover-title" style="border:none;padding:0;margin-bottom:12px;">${esc(project.topic)}</h1>
    <p class="cover-subtitle">HBC 5.0 — ${esc(project.subject)}</p>

    <table class="info-table">
      ${infoTableHtml}
    </table>

    <div class="cover-spacer"></div>
    <hr class="cover-footer-rule"/>
    <div class="cover-footer">
      <span>Generated via Pass Study Platform</span>
      <span>pass.ac.zw</span>
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
