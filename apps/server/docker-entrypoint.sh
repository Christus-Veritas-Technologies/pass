#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
# Container entrypoint for the Pass server image.
#
# Runs BEFORE every container start (not just on first boot):
#   1. `prisma generate` — regenerate the Prisma client from packages/db's
#      current schema. The image already bundled a generated client at
#      build time (tsdown inlines it into dist/index.mjs), so this is
#      mostly defensive: it guards against `--ignore-scripts` installs, and
#      ensures `prisma migrate deploy` below is validating against a client
#      that matches the schema actually shipped in this image/volume.
#   2. `prisma migrate deploy` — apply any pending migrations to DATABASE_URL.
#      This is the non-interactive, CI/container-safe migration command: it
#      never prompts, never generates a new migration, and is a no-op if the
#      database is already up to date. Running it on every container start
#      means a fresh deploy always brings the schema up to date before the
#      app starts serving traffic — no manual migration step required.
#   3. exec "$@" — replace this shell with the actual server process (PID
#      handed off cleanly to whatever CMD/`docker run` passed), so signals
#      (SIGTERM from `docker stop`) reach the Bun process directly.
#
# Both prisma commands run from packages/db, where prisma.config.ts and the
# prisma/ directory (schema + migrations) live.
# ──────────────────────────────────────────────────────────────────────────
set -Eeuo pipefail

cd /app/packages/db

echo "[entrypoint] Generating Prisma client…"
pnpm exec prisma generate

echo "[entrypoint] Applying pending migrations (prisma migrate deploy)…"
pnpm exec prisma migrate deploy

cd /app

echo "[entrypoint] Starting Pass server…"
exec "$@"
