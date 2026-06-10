import { test, expect, describe, beforeEach, mock } from "bun:test";

// Mock the Prisma client so this stays a fast unit test (no DB).
let stubSub: { status: string; expiryDate: Date } | null = null;
const findUnique = mock(async () => stubSub);

mock.module("@pass/db", () => ({
  default: { subscription: { findUnique } },
}));

const { effectivePlan } = await import("./effectivePlan");

const future = () => new Date(Date.now() + 24 * 60 * 60 * 1000);
const past = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

describe("effectivePlan", () => {
  beforeEach(() => {
    stubSub = null;
    findUnique.mockClear();
  });

  test("FREE short-circuits without a DB lookup", async () => {
    expect(await effectivePlan("u1", "FREE")).toBe("FREE");
    expect(findUnique).not.toHaveBeenCalled();
  });

  test("paid plan with no subscription row is trusted", async () => {
    stubSub = null;
    expect(await effectivePlan("u1", "PASS")).toBe("PASS");
  });

  test("active, unexpired subscription keeps the paid plan", async () => {
    stubSub = { status: "ACTIVE", expiryDate: future() };
    expect(await effectivePlan("u1", "PASS")).toBe("PASS");
  });

  test("expired-by-date subscription downgrades to FREE", async () => {
    stubSub = { status: "ACTIVE", expiryDate: past() };
    expect(await effectivePlan("u1", "PASS")).toBe("FREE");
  });

  test("EXPIRED status downgrades to FREE", async () => {
    stubSub = { status: "EXPIRED", expiryDate: future() };
    expect(await effectivePlan("u1", "STUDY")).toBe("FREE");
  });
});
