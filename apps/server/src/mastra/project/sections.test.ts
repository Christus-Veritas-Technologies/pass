import { test, expect, describe } from "bun:test";
import { buildSectionUnits, getTargetWords, isGrade7, isALevel } from "./sections";

describe("grade detection", () => {
  test("isGrade7", () => {
    expect(isGrade7("Grade 7")).toBe(true);
    expect(isGrade7("grade7")).toBe(true);
    expect(isGrade7("Form 4")).toBe(false);
  });
  test("isALevel", () => {
    expect(isALevel("Form 6")).toBe(true);
    expect(isALevel("A Level")).toBe(true);
    expect(isALevel("A-Level")).toBe(true);
    expect(isALevel("Form 4")).toBe(false);
  });
});

describe("getTargetWords", () => {
  test("scales by grade", () => {
    expect(getTargetWords("Grade 7")).toBe(3000);
    expect(getTargetWords("Form 4")).toBe(4500);
    expect(getTargetWords("Form 6")).toBe(7000);
    expect(getTargetWords("Form 6")).toBeGreaterThan(getTargetWords("Grade 7"));
  });
});

describe("buildSectionUnits", () => {
  for (const grade of ["Grade 7", "Form 4", "Form 6"]) {
    test(`${grade}: ordered units cover all 6 HBC stages + references`, () => {
      const units = buildSectionUnits(grade);
      expect(units.length).toBeGreaterThanOrEqual(6);

      // ids are unique (assembly relies on stable, distinct units)
      const ids = units.map((u) => u.id);
      expect(new Set(ids).size).toBe(ids.length);

      // every unit is non-empty and has a positive word target (top-up safety)
      for (const u of units) {
        expect(u.guide.trim().length).toBeGreaterThan(0);
        expect(u.targetWords).toBeGreaterThan(0);
      }

      const combined = units.map((u) => u.guide).join("\n");
      for (const n of [1, 2, 3, 4, 5, 6]) {
        expect(combined).toContain(`Stage ${n}`);
      }
      expect(combined).toContain("## References");
    });
  }

  test("A-Level data section targets exceed Grade 7's", () => {
    const a = buildSectionUnits("Form 6").find((u) => u.id === "stage5_data")!;
    const g = buildSectionUnits("Grade 7").find((u) => u.id === "stage5_data")!;
    expect(a.targetWords).toBeGreaterThan(g.targetWords);
  });
});
