import { describe, expect, test } from "bun:test";
import { buildProjectHtml, esc } from "./projectHtml";
import type { Project } from "@pass/db";

// Minimal mock that satisfies all fields read by buildProjectHtml
const MOCK: Project = {
  id: "test-proj-html-001",
  userId: "user-001",
  grade: "Form 4",
  subject: "Biology",
  topic: "The Impact of Water Pollution on Aquatic Life",
  content: [
    "# The Impact of Water Pollution on Aquatic Life",
    "",
    "## Stage 1: Problem Identification",
    "",
    "### 1.1 Background",
    "",
    "Water pollution is a **major concern** in Zimbabwe.",
    "",
    "- River ecosystems are fragile",
    "- Industrial discharge increases every year",
    "",
    "| Parameter | Safe Level | Measured |",
    "|-----------|-----------|---------|",
    "| pH        | 6.5-8.5   | 5.2     |",
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

// ─── esc() helper ────────────────────────────────────────────────────────────

describe("esc()", () => {
  test("escapes &", () => expect(esc("a & b")).toBe("a &amp; b"));
  test("escapes <", () => expect(esc("<div>")).toBe("&lt;div&gt;"));
  test("escapes >", () => expect(esc("x > y")).toBe("x &gt; y"));
  test("escapes double-quote", () => expect(esc('"hi"')).toBe("&quot;hi&quot;"));
  test("leaves plain text unchanged", () => expect(esc("hello world")).toBe("hello world"));
});

// ─── buildProjectHtml ────────────────────────────────────────────────────────

describe("buildProjectHtml", () => {
  test("returns a non-empty string", () => {
    const html = buildProjectHtml(MOCK, "screen");
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(500);
  });

  test("contains DOCTYPE declaration", () => {
    const html = buildProjectHtml(MOCK, "screen");
    expect(html).toContain("<!DOCTYPE html>");
  });

  test("includes candidate info in the output", () => {
    const html = buildProjectHtml(MOCK, "screen");
    // The single studentName is split on the cover: last token = surname.
    expect(html).toContain("Moyo");   // SURNAME
    expect(html).toContain("Tendai"); // NAME
    expect(html).toContain("Harare High School");
    expect(html).toContain("12345");
    expect(html).toContain("6789");
  });

  test("renders the bordered LABEL : value cover sheet incl. the project title", () => {
    const html = buildProjectHtml(MOCK, "screen");
    expect(html).toContain("cover-frame");
    expect(html).toContain("SURNAME");
    expect(html).toContain("LEVEL");
    expect(html).toContain("PROJECT TITLE");
    // The project title is now shown on the cover (not just the body H1)
    expect(html).toContain("The Impact of Water Pollution on Aquatic Life");
  });

  test("includes project content keywords", () => {
    const html = buildProjectHtml(MOCK, "screen");
    expect(html).toContain("Water Pollution");
  });

  test("screen mode includes background color style", () => {
    const html = buildProjectHtml(MOCK, "screen");
    expect(html).toMatch(/background:\s*#e8eaed/);
  });

  test("print mode includes @page rule", () => {
    const html = buildProjectHtml(MOCK, "print");
    expect(html).toContain("@page");
  });

  test("HTML-escapes dangerous characters in topic", () => {
    const html = buildProjectHtml(
      { ...MOCK, topic: '<script>alert("xss")</script>' } as unknown as Project,
      "screen",
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("blank studentName/schoolName shows dash placeholder", () => {
    const html = buildProjectHtml(
      { ...MOCK, studentName: "", schoolName: "" } as unknown as Project,
      "screen",
    );
    // The template substitutes "—" for empty/absent values
    expect(html).toContain("—");
  });
});
