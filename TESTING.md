# Running the automated tests

The server runs on **Bun**, so the suite uses Bun's built-in test runner
(`bun test`, Jest-compatible API). Tests live next to the code as `*.test.ts`,
plus DB integration tests under `apps/server/test/`.

## Prerequisites

```bash
pnpm install                      # install workspace deps
pnpm -F @pass/db db:generate      # generate the Prisma client (needed by some imports)
```

Make sure `apps/server/.env` exists (the same one `bun run dev` uses) — a few
tests import modules that validate env on load.

## Run the unit tests (no database needed)

```bash
cd apps/server
bun run test          # = bun test --env-file=.env
```

This runs everything except the DB integration tests. Expected: all green in a
couple of seconds.

### What the unit tests cover
| File | Feature under test |
|------|--------------------|
| `src/lib/paynow.test.ts` | Paynow webhook **signature verification** (valid / tampered / missing / garbage hash) |
| `src/lib/effectivePlan.test.ts` | **Subscription-expiry downgrade** (mocked Prisma): FREE short-circuit, no-sub trust, active keeps plan, expired/EXPIRED → FREE |
| `src/lib/planLimits.test.ts` | `currentMonthKey` format + `nextMonthlyResetISO` (first of next month, UTC) |
| `src/lib/subjects.test.ts` | Subject canonicalisation + validation |
| `src/middleware/rateLimit.test.ts` | **Rate limiter**: passes under the cap, 429 + `Retry-After` over it, per-IP buckets, window reset |
| `src/mastra/project/sections.test.ts` | HBC **section-unit** structure, unique ids, per-grade word targets |
| `src/whatsapp/utils/messages.test.ts` | WhatsApp **project review card** + quota-wall copy |

> The Paynow test is **skipped** automatically unless `PAYNOW_INTEGRATION_KEY`
> is set in your env (it needs the key to compute a valid signature).

## Run the DB integration tests (needs a throwaway Postgres)

These exercise real transaction behaviour (atomic, idempotent payment
activation) and are **skipped by default**. Point them at a *disposable* database
— never your real one, they create and delete rows.

```bash
# 1. Spin up a throwaway Postgres (example)
docker run --rm -d --name pass-test-db -e POSTGRES_PASSWORD=test -p 5433:5432 postgres:16

# 2. Apply the schema to it
DATABASE_URL='postgresql://postgres:test@localhost:5433/postgres' \
  pnpm -F @pass/db exec prisma migrate deploy

# 3. Run the integration tests
cd apps/server
RUN_DB_TESTS=1 DATABASE_URL='postgresql://postgres:test@localhost:5433/postgres' bun run test:db

# 4. Tear down
docker rm -f pass-test-db
```

`apps/server/test/payments.integration.test.ts` verifies that two concurrent
"paid" callbacks activate the subscription **exactly once** and that a later
duplicate callback is a no-op that does **not** move the expiry date.

## Adding more

- Drop a `*.test.ts` next to the code (or under `apps/server/test/` for DB
  tests) — Bun auto-discovers them.
- Keep anything that needs a real DB behind `describe.skipIf(!process.env.RUN_DB_TESTS)`
  so the default `bun test` stays fast and green.

See `MANUAL_TESTING.md` for everything that can't be unit-tested (LLM output,
PDFs, WhatsApp, mobile) and must be checked by hand.
