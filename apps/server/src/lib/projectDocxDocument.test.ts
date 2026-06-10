import { describe, expect, test } from "bun:test";
import { generateProjectDocxBuffer } from "./projectDocxDocument";
import type { Project } from "@pass/db";

const MOCK: Project = {
  id: "test-proj-docx-001",
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
    "### 1.2 Data Table",
    "",
    "| Parameter    | Safe Level | Measured |",
    "|-------------|-----------|---------|",
    "| pH           | 6.5 – 8.5 | 5.2     |",
    "| Dissolved O2 | >5 mg/L   | 2.1 mg/L|",
    "",
    "## Stage 2: Investigation",
    "",
    "Literature review indicates _Tilapia rendalli_ is acid-sensitive.",
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

describe("generateProjectDocxBuffer", () => {
  test("returns a Buffer", async () => {
    const buf = await generateProjectDocxBuffer(MOCK);
    expect(buf).toBeInstanceOf(Buffer);
  }, 30_000);

  test("DOCX magic bytes are PK (ZIP signature)", async () => {
    const buf = await generateProjectDocxBuffer(MOCK);
    // .docx is a ZIP archive; every ZIP starts with 0x50 0x4B ('P' 'K')
    expect(buf[0]).toBe(0x50); // P
    expect(buf[1]).toBe(0x4B); // K
  }, 30_000);

  test("output is non-trivially sized", async () => {
    const buf = await generateProjectDocxBuffer(MOCK);
    // Even a minimal DOCX with cover + body is well over 4 KB
    expect(buf.length).toBeGreaterThan(4096);
  }, 30_000);

  test("handles empty content without throwing", async () => {
    const buf = await generateProjectDocxBuffer(
      { ...MOCK, content: "" } as unknown as Project,
    );
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4B);
  }, 30_000);

  test("handles markdown table content", async () => {
    const buf = await generateProjectDocxBuffer({
      ...MOCK,
      content: [
        "## Data",
        "",
        "| Site     | pH  | DO |",
        "|----------|-----|-----|",
        "| Upstream | 7.2 | 6.8 |",
        "| Midpoint | 6.1 | 4.2 |",
      ].join("\n"),
    } as unknown as Project);
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4B);
  }, 30_000);

  test("handles bold/italic inline formatting", async () => {
    const buf = await generateProjectDocxBuffer({
      ...MOCK,
      content: "## Introduction\n\n**Bold text** and _italic text_ in a paragraph.\n",
    } as unknown as Project);
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4B);
  }, 30_000);

  test("A-Level project generates valid DOCX", async () => {
    const buf = await generateProjectDocxBuffer(
      { ...MOCK, grade: "Form 6", subject: "Chemistry" } as unknown as Project,
    );
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4B);
  }, 30_000);
});
