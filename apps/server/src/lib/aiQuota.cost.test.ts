import { test, expect, describe, beforeEach, mock } from "bun:test";

/**
 * Unit test for the `cost` parameter on checkAndIncrementAiMessage.
 *
 * Prisma is mocked with an in-memory MonthlyUsage row whose updateMany honours
 * the same atomic conditional the real query uses (`aiMessagesUsed <= limit - cost`),
 * so we can assert the reject-don't-clamp boundary behaviour without a DB.
 */

let plan = "FREE";
let used = 0;
const LIMIT = 20; // PLAN_LIMITS.FREE.aiMessages

const userFindUnique = mock(async () => ({ plan, isAmbassador: false }));
const subFindUnique = mock(async () => null); // no subscription → effectivePlan trusts plan
const usageUpsert = mock(async () => ({}));
const usageFindUnique = mock(async () => ({ aiMessagesUsed: used }));
const usageUpdateMany = mock(async ({ where }: { where: { aiMessagesUsed: { lte: number } } }) => {
  // Mirror the real atomic conditional: only consume if the FULL cost fits.
  if (used <= where.aiMessagesUsed.lte) {
    const cost = LIMIT - where.aiMessagesUsed.lte; // limit - (limit - cost) = cost
    used += cost;
    return { count: 1 };
  }
  return { count: 0 };
});

mock.module("@pass/db", () => ({
  default: {
    user: { findUnique: userFindUnique },
    subscription: { findUnique: subFindUnique },
    monthlyUsage: {
      upsert: usageUpsert,
      findUnique: usageFindUnique,
      updateMany: usageUpdateMany,
    },
  },
}));

const { checkAndIncrementAiMessage } = await import("./aiQuota");

describe("checkAndIncrementAiMessage cost", () => {
  beforeEach(() => {
    plan = "FREE";
    used = 0;
  });

  test("cost=1 default is unchanged at the boundary (used=limit-1 still allowed)", async () => {
    used = LIMIT - 1;
    const r = await checkAndIncrementAiMessage("u1");
    expect(r.allowed).toBe(true);
    expect(used).toBe(LIMIT);
  });

  test("cost=1 rejects once the cap is reached", async () => {
    used = LIMIT;
    const r = await checkAndIncrementAiMessage("u1", 1);
    expect(r.allowed).toBe(false);
    expect(used).toBe(LIMIT);
  });

  test("cost=2 with only 1 left is rejected, not clamped", async () => {
    used = LIMIT - 1;
    const r = await checkAndIncrementAiMessage("u1", 2);
    expect(r.allowed).toBe(false);
    expect(used).toBe(LIMIT - 1); // untouched — never partially charged
  });

  test("cost=2 with 2 left is allowed and consumes both", async () => {
    used = LIMIT - 2;
    const r = await checkAndIncrementAiMessage("u1", 2);
    expect(r.allowed).toBe(true);
    expect(used).toBe(LIMIT);
  });

  test("unlimited plan short-circuits regardless of cost (no DB write)", async () => {
    plan = "PASS";
    usageUpdateMany.mockClear();
    const r = await checkAndIncrementAiMessage("u1", 2);
    expect(r.allowed).toBe(true);
    expect(r.limit).toBe(Infinity);
    expect(usageUpdateMany).not.toHaveBeenCalled();
  });
});
