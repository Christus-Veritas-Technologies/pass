import { test, expect, describe } from "bun:test";
import { currentMonthKey, nextMonthlyResetISO } from "./planLimits";

describe("currentMonthKey", () => {
  test("returns the current month as YYYY-MM (UTC)", () => {
    const key = currentMonthKey();
    expect(key).toMatch(/^\d{4}-\d{2}$/);
    const now = new Date();
    const expected = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    expect(key).toBe(expected);
  });
});

describe("nextMonthlyResetISO", () => {
  test("is the first day of next month at UTC midnight", () => {
    const d = new Date(nextMonthlyResetISO());
    expect(d.getUTCDate()).toBe(1);
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getUTCSeconds()).toBe(0);
  });

  test("is in the future, within ~32 days", () => {
    const ms = new Date(nextMonthlyResetISO()).getTime() - Date.now();
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(32 * 24 * 60 * 60 * 1000);
  });
});
