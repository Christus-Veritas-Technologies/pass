# syntax=docker/dockerfile:1.7
# ═══════════════════════════════════════════════════════════════════════════
# Pass web — production image (Next.js standalone server)
#
# Monorepo dependency on workspace packages (@pass/env, @pass/ui, @pass/pricing)
# means this must be built from the repo ROOT, not apps/web/:
#
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_SERVER_URL=https://api.pass.co.zw \
#     -t pass-web .
#
# IMPORTANT — NEXT_PUBLIC_* vars are NOT runtime config. Next.js statically
# inlines every `process.env.NEXT_PUBLIC_*` reference into the client-side
# JS bundle at `next build` time (apps/web/next.config.ts even validates them
# via @pass/env/web at config-load time, i.e. at build time). Setting them
# only as a container/Coolify *runtime* env var has no effect — the bundle
# already shipped with whatever (or nothing) was present at build time. They
# MUST be passed as --build-arg / Coolify "available at buildtime" variables.
#
# Uses Next's `output: "standalone"` (next.config.ts) — a self-contained
# server bundle including only the node_modules Next actually traces as
# used, instead of shipping this whole monorepo's node_modules.
# ═══════════════════════════════════════════════════════════════════════════

ARG NODE_VERSION=22

# ──────────────────────────────────────────────────────────────────────────
# Stage 1/3 — deps: install the full pnpm workspace.
# ──────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app

# pnpm via corepack (ships with Node, no extra install step / version drift
# from package.json's "packageManager" field).
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/native/package.json apps/native/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/env/package.json packages/env/package.json
COPY packages/pricing/package.json packages/pricing/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/papers/package.json packages/papers/package.json

RUN pnpm install --frozen-lockfile

# ──────────────────────────────────────────────────────────────────────────
# Stage 2/3 — build.
# ──────────────────────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY . .

# Build-time-only public config — see the warning at the top of this file.
ARG NEXT_PUBLIC_SERVER_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL} \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY} \
    NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter web run build

# ──────────────────────────────────────────────────────────────────────────
# Stage 3/3 — runtime: just the standalone server + static assets.
#
# `output: "standalone"` reproduces this app's path *within the monorepo*
# under .next/standalone (i.e. .next/standalone/apps/web/server.js) — it
# does NOT flatten to repo root. .next/static and public/ are deliberately
# excluded from the standalone trace (Next docs) and must be copied in
# manually, landing next to server.js at the matching nested path.
# ──────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-slim AS runtime
WORKDIR /app

RUN groupadd --gid 10001 web \
    && useradd --uid 10001 --gid web --shell /bin/bash --create-home web

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

RUN chown -R web:web /app
USER web

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

EXPOSE 3000

# "/" is the public marketing landing page (apps/web/src/app/(marketing)/page.tsx)
# — no auth required, cheap to poll for liveness.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://localhost:'+process.env.PORT+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
