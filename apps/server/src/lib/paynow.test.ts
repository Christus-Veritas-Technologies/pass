import { test, expect, describe } from "bun:test";
import crypto from "node:crypto";
import { verifyPaynowHash } from "./paynow";

const key = process.env.PAYNOW_INTEGRATION_KEY;

/** Reproduce Paynow's signing: SHA-512(values… + integrationKey), uppercase hex. */
function sign(fields: Record<string, string>): string {
  return crypto
    .createHash("sha512")
    .update(Object.values(fields).join("") + key, "utf8")
    .digest("hex")
    .toUpperCase();
}

// Needs the integration key to compute a valid signature; skipped if absent.
describe.skipIf(!key)("verifyPaynowHash", () => {
  test("accepts a correctly signed body", () => {
    const f = { reference: "TXN-1", paynowreference: "99", amount: "5.00", status: "Paid" };
    const body = new URLSearchParams({ ...f, hash: sign(f) }).toString();
    expect(verifyPaynowHash(body)).toBe(true);
  });

  test("rejects a tampered field (status flipped after signing)", () => {
    const f = { reference: "TXN-1", amount: "5.00", status: "Paid" };
    const body = new URLSearchParams({ ...f, hash: sign(f) }).toString();
    const tampered = body.replace("status=Paid", "status=Cancelled");
    expect(verifyPaynowHash(tampered)).toBe(false);
  });

  test("rejects a missing hash", () => {
    expect(verifyPaynowHash("reference=TXN-1&status=Paid")).toBe(false);
  });

  test("rejects a garbage hash", () => {
    expect(verifyPaynowHash("reference=TXN-1&status=Paid&hash=NOPE")).toBe(false);
  });
});
