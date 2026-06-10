import { test, expect, describe } from "bun:test";
import { canonicalSubject, isValidSubject, toSubjectKey } from "./subjects";

describe("isValidSubject", () => {
  test("accepts known subjects case-insensitively", () => {
    expect(isValidSubject("Mathematics")).toBe(true);
    expect(isValidSubject("mathematics")).toBe(true);
    expect(isValidSubject("COMBINED SCIENCE")).toBe(true);
  });
  test("rejects unknown subjects and blanks", () => {
    expect(isValidSubject("Underwater Basket Weaving")).toBe(false);
    expect(isValidSubject("")).toBe(false);
  });
});

describe("canonicalSubject", () => {
  test("returns the properly-cased canonical name", () => {
    expect(canonicalSubject("mathematics")).toBe("Mathematics");
    expect(canonicalSubject("combined science")).toBe("Combined Science");
  });
  test("returns undefined for unknown subjects", () => {
    expect(canonicalSubject("nonsense")).toBeUndefined();
  });
});

describe("toSubjectKey", () => {
  test("normalises whitespace and case", () => {
    expect(toSubjectKey("  Combined   Science ")).toBe(toSubjectKey("combined science"));
  });
});
