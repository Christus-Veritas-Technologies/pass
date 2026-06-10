import { describe, expect, test } from "bun:test";
import { generateProjectPdfBuffer } from "./projectPdfDocument";
import type { Project } from "@pass/db";

// Full mock project covering all fields the PDF renderer reads
const MOCK: Project = {
  id: "test-proj-pdf-001",
  userId: "user-001",
  grade: "Form 4",
  subject: "Biology",
  topic: "The Impact of Water Pollution on Aquatic Life in the Munyati River",
  content: [
    "# The Impact of Water Pollution on Aquatic Life in the Munyati River",
    "",
    "## Stage 1: Problem Identification",
    "",
    "### 1.1 Background",
    "",
    "Water pollution is a **major concern** in Zimbabwe. The Munyati River near",
    "Kadoma provides water for both domestic use and agriculture.",
    "",
    "- Industrial discharge increases every year",
    "- Runoff from farms carries fertilisers into the river",
    "",
    "### 1.2 Problem Statement",
    "",
    "Levels of dissolved oxygen have dropped below 3 mg/L, threatening fish.",
    "",
    "| Parameter     | Safe Level | Measured |",
    "|---------------|-----------|---------|",
    "| pH            | 6.5 – 8.5 | 5.2     |",
    "| Dissolved O2  | >5 mg/L   | 2.1 mg/L|",
    "",
    "## Stage 2: Investigation",
    "",
    "### 2.1 Literature Review",
    "",
    "Previous studies by the Environmental Management Agency (2024) indicate that",
    "pH below 6.0 causes acid stress in _Tilapia rendalli_.",
  ].join("\n"),
  studentName: "Tendai Moyo",
  schoolName: "Harare High School",
  centreNumber: "12345",
  candidateNumber: "6789",
  outline: null,
  category: "Environment",
  pdfUrl: null,
  isGroupProject: false,
  createdAt: new Date("2026-01-15T08:00:00.000Z"),
  updatedAt: new Date("2026-01-15T08:01:00.000Z"),
} as unknown as Project;

describe("generateProjectPdfBuffer", () => {
  test("returns a Buffer", async () => {
    const buf = await generateProjectPdfBuffer(MOCK);
    expect(buf).toBeInstanceOf(Buffer);
  }, 30_000);

  test("PDF magic bytes are %PDF", async () => {
    const buf = await generateProjectPdfBuffer(MOCK);
    // Every valid PDF starts with the 4-byte signature %PDF
    expect(buf.slice(0, 4).toString("ascii")).toBe("%PDF");
  }, 30_000);

  test("PDF end-of-file marker is present", async () => {
    const buf = await generateProjectPdfBuffer(MOCK);
    // All valid PDFs end with %%EOF (possibly followed by a newline)
    expect(buf.toString("latin1")).toContain("%%EOF");
  }, 30_000);

  test("output is non-trivially sized", async () => {
    const buf = await generateProjectPdfBuffer(MOCK);
    // Even a cover-only PDF with one body page is well over 2 KB
    expect(buf.length).toBeGreaterThan(2048);
  }, 30_000);

  test("handles empty content without throwing", async () => {
    const buf = await generateProjectPdfBuffer(
      { ...MOCK, content: "" } as unknown as Project,
    );
    expect(buf.slice(0, 4).toString("ascii")).toBe("%PDF");
  }, 30_000);

  test("handles content with special characters", async () => {
    const buf = await generateProjectPdfBuffer({
      ...MOCK,
      content: [
        "# Title",
        "",
        "CO₂ concentration → H₂O + CO₂. Temperature ≥ 25°C.",
        "Greek: alpha beta gamma. Value: sqrt(x²) ≈ pi.",
      ].join("\n"),
    } as unknown as Project);
    expect(buf.slice(0, 4).toString("ascii")).toBe("%PDF");
  }, 30_000);

  test("handles markdown tables without throwing", async () => {
    const buf = await generateProjectPdfBuffer({
      ...MOCK,
      content: [
        "## Data Collection",
        "",
        "| Site    | pH  | DO (mg/L) |",
        "|---------|-----|-----------|",
        "| Upstream| 7.2 | 6.8       |",
        "| Midpoint| 6.1 | 4.2       |",
        "| Outlet  | 5.0 | 2.1       |",
      ].join("\n"),
    } as unknown as Project);
    expect(buf.slice(0, 4).toString("ascii")).toBe("%PDF");
  }, 30_000);

  test("A-Level grade generates valid PDF", async () => {
    const buf = await generateProjectPdfBuffer(
      { ...MOCK, grade: "Form 6", subject: "Chemistry" } as unknown as Project,
    );
    expect(buf.slice(0, 4).toString("ascii")).toBe("%PDF");
  }, 30_000);

  test("Grade 7 project generates valid PDF", async () => {
    const buf = await generateProjectPdfBuffer(
      { ...MOCK, grade: "Grade 7", subject: "Science" } as unknown as Project,
    );
    expect(buf.slice(0, 4).toString("ascii")).toBe("%PDF");
  }, 30_000);
});
