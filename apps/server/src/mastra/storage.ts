/**
 * Shared Postgres storage for Mastra (memory threads/messages + agent metadata).
 *
 * Reuses the SAME Postgres database as Prisma via DATABASE_URL. Mastra creates
 * and manages its own `mastra_*` tables — it does not touch Prisma's tables and
 * needs no Prisma migration.
 */

import { PostgresStore } from "@mastra/pg";
import { env } from "@pass/env/server";

export const mastraStorage = new PostgresStore({
  id: "pass-postgres",
  connectionString: env.DATABASE_URL,
});
