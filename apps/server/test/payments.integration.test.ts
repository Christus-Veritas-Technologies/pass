/**
 * Integration test — requires a real (throwaway) Postgres.
 *
 * Run with:  RUN_DB_TESTS=1 DATABASE_URL=postgres://… bun test
 * Skipped by default so `bun test` stays green without a database.
 *
 * Verifies the atomic + idempotent payment activation: concurrent/duplicate
 * Paynow callbacks (webhook + poll, or retries) must upgrade the plan exactly
 * once and never re-date the subscription.
 */
import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import prisma from "@pass/db";
import { activatePaidTransaction } from "../src/lib/subscriptions";

const RUN = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!RUN)("activatePaidTransaction (DB integration)", () => {
  let userId = "";
  let txnId = "";

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `paytest-${Date.now()}@example.com`, name: "Pay Test", plan: "FREE" },
    });
    userId = user.id;
    const txn = await prisma.paymentTransaction.create({
      data: { userId, amount: 5, plan: "STUDY", billingCycle: "MONTHLY", status: "pending" },
    });
    txnId = txn.id;
  });

  afterAll(async () => {
    await prisma.subscription.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.paymentTransaction.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  });

  test("activates exactly once under concurrent callbacks", async () => {
    const [a, b] = await Promise.all([
      activatePaidTransaction(txnId),
      activatePaidTransaction(txnId),
    ]);
    expect([a.activated, b.activated].filter(Boolean).length).toBe(1);

    const txn = await prisma.paymentTransaction.findUnique({ where: { id: txnId } });
    expect(txn?.status).toBe("paid");

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.plan).toBe("STUDY");

    const sub = await prisma.subscription.findUnique({ where: { userId } });
    expect(sub).not.toBeNull();
    const firstExpiry = sub!.expiryDate.getTime();

    // A later duplicate callback is a no-op and must not move the expiry.
    const again = await activatePaidTransaction(txnId);
    expect(again.activated).toBe(false);
    const sub2 = await prisma.subscription.findUnique({ where: { userId } });
    expect(sub2!.expiryDate.getTime()).toBe(firstExpiry);
  });
});
