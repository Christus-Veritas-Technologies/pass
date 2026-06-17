#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
# Container entrypoint for the Pass server image.
#
# Runs BEFORE every container start (not just on first boot):
#   1. `prisma migrate deploy` — apply any pending migrations to DATABASE_URL.
#      This is the non-interactive, CI/container-safe migration command: it
#      never prompts, never generates a new migration, and is a no-op if the
#      database is already up to date. Running it on every container start
#      means a fresh deploy always brings the schema up to date before the
#      app starts serving traffic — no manual migration step required.
#   2. exec "$@" — replace this shell with the actual server process (PID
#      handed off cleanly to whatever CMD/`docker run` passed), so signals
#      (SIGTERM from `docker stop`) reach the Bun process directly.
#
# Invoked via `bunx` because the runtime stage is the bun image (no pnpm/node):
# `bunx` resolves the `prisma` CLI from node_modules/.bin (prisma is a devDep
# of @pass/db, copied in from the build stage). The Prisma *client* itself is
# already bundled into dist/index.mjs by tsdown, so no `prisma generate` is
# needed here at runtime — only `migrate deploy`.
#
# Run from packages/db, where prisma.config.ts and the prisma/ directory
# (schema + migrations) live.
# ──────────────────────────────────────────────────────────────────────────
set -Eeuo pipefail

cd /app/packages/db

echo "[entrypoint] Applying pending migrations (prisma migrate deploy)…"
bunx prisma migrate deploy

cd /app

echo "[entrypoint] Starting Pass server…"
exec "$@"
