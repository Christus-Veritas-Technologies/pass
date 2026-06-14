import { describe, expect, test } from "bun:test";
import { splitName, levelLabel, academicYearSpan, coverFieldRows } from "./projectCover";
import type { Project } from "@pass/db";

const BASE: Project = {
  id: "cover-001",
  userId: "u1",
  grade: "Form 6",
  subject: "Physics",
  topic: "Application of Gravitational Field Principles in Satellite Technology",
  content: "# Title\n\n## Stage 1\n\nBody.",
  studentName: "Delay A Muzaruwetu",
  schoolName: "Sakubva 1 High",
  centreNumber: "020384",
  candidateNumber: "5216",
  district: "Mutare",
  province: "Manicaland",
  outline: null,
  category: "",
  pdfUrl: null,
  createdAt: new Date("2025-09-01T00:00:00.000Z"),
} as unknown as Project;

describe("splitName", () => {
  test("splits multi-token name: last token = surname", () => {
    expect(splitName("Delay A Muzaruwetu")).toEqual({ surname: "Muzaruwetu", name: "Delay A" });
  });
  test("two tokens", () => {
    expect(splitName("Tendai Moyo")).toEqual({ surname: "Moyo", name: "Tendai" });
  });
  test("single token → surname only", () => {
    expect(splitName("Muzaruwetu")).toEqual({ surname: "Muzaruwetu", name: "" });
  });
  test("'_' placeholder → blank", () => {
    expect(splitName("_")).toEqual({ surname: "", name: "" });
  });
  test("empty/undefined → blank", () => {
    expect(splitName("")).toEqual({ surname: "", name: "" });
    expect(splitName(undefined)).toEqual({ surname: "", name: "" });
  });
  test("collapses extra whitespace", () => {
    expect(splitName("  Delay   A   Muzaruwetu  ")).toEqual({ surname: "Muzaruwetu", name: "Delay A" });
  });
});

describe("levelLabel", () => {
  test("Form 6 → ADVANCED", () => expect(levelLabel("Form 6")).toBe("ADVANCED"));
  test("A-Level → ADVANCED", () => expect(levelLabel("A-Level")).toBe("ADVANCED"));
  test("Form 4 → ORDINARY", () => expect(levelLabel("Form 4")).toBe("ORDINARY"));
  test("Grade 7 → JUNIOR", () => expect(levelLabel("Grade 7")).toBe("JUNIOR"));
});

describe("academicYearSpan", () => {
  test("derives a span from the created year", () => {
    expect(academicYearSpan(new Date("2025-09-01T00:00:00.000Z"))).toBe("2025-2026");
  });
  test("accepts an ISO string", () => {
    expect(academicYearSpan("2026-01-15T08:00:00.000Z")).toBe("2026-2027");
  });
});

describe("coverFieldRows", () => {
  test("produces the 11 rows in order", () => {
    const labels = coverFieldRows(BASE).map((r) => r.label);
    expect(labels).toEqual([
      "SURNAME", "NAME", "SCHOOL", "CENTRE NUMBER", "CANDIDATE NUMBER",
      "LEVEL", "ACADEMIC YEAR", "DISTRICT", "PROVINCE", "LEARNING AREA", "PROJECT TITLE",
    ]);
  });

  test("maps values correctly for a full project", () => {
    const rows = Object.fromEntries(coverFieldRows(BASE).map((r) => [r.label, r.value]));
    expect(rows["SURNAME"]).toBe("Muzaruwetu");
    expect(rows["NAME"]).toBe("Delay A");
    expect(rows["SCHOOL"]).toBe("Sakubva 1 High");
    expect(rows["CENTRE NUMBER"]).toBe("020384");
    expect(rows["CANDIDATE NUMBER"]).toBe("5216");
    expect(rows["LEVEL"]).toBe("ADVANCED");
    expect(rows["ACADEMIC YEAR"]).toBe("2025-2026");
    expect(rows["DISTRICT"]).toBe("Mutare");
    expect(rows["PROVINCE"]).toBe("Manicaland");
    expect(rows["LEARNING AREA"]).toBe("Physics");
    expect(rows["PROJECT TITLE"]).toContain("Gravitational Field");
  });

  test("blank/placeholder fields render an em dash", () => {
    const rows = Object.fromEntries(
      coverFieldRows({ ...BASE, district: "", province: "_", centreNumber: "", candidateNumber: "_" } as unknown as Project)
        .map((r) => [r.label, r.value]),
    );
    expect(rows["DISTRICT"]).toBe("—");
    expect(rows["PROVINCE"]).toBe("—");
    expect(rows["CENTRE NUMBER"]).toBe("—");
    expect(rows["CANDIDATE NUMBER"]).toBe("—");
  });
});
