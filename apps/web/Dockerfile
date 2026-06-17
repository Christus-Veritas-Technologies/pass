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
# Stage 1/2 — build: install the full workspace and run `next build`.
# ──────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app

# pnpm via corepack (ships with Node, no extra install step / version drift
# from package.json's "packageManager" field).
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy the WHOLE repo before installing: workspace packages have postinstall
# hooks that need their own source present (packages/db runs `prisma generate`
# via scripts/postinstall.mjs). A manifest-only copy would break that hook.
COPY . .

# `--prod=false`: force devDependencies to install even when NODE_ENV=production
# is present in the build environment (Coolify injects it as a build-time var).
# The build NEEDS devDeps — next/typescript/tailwind to compile, and `prisma`
# (a devDep of @pass/db) for that package's postinstall. Without this, pnpm skips
# them and the @pass/db postinstall fails ("Cannot find module 'prisma/config'").
RUN pnpm install --frozen-lockfile --prod=false

# Build-time-only public config — see the warning at the top of this file.
ARG NEXT_PUBLIC_SERVER_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL} \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY} \
    NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter web run build

# ──────────────────────────────────────────────────────────────────────────
# Stage 2/2 — runtime: just the standalone server + static assets.
#
# `next build` runs with its cwd at apps/web, so .next lives at
# apps/web/.next. `output: "standalone"` reproduces this app's path *within
# the monorepo* under apps/web/.next/standalone (i.e. the server entrypoint
# is apps/web/.next/standalone/apps/web/server.js). .next/static and public/
# are deliberately excluded from the standalone trace (Next docs) and must be
# copied in manually, landing next to server.js at the matching nested path.
# ──────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-slim AS runtime
WORKDIR /app

RUN groupadd --gid 10001 web \
    && useradd --uid 10001 --gid web --shell /bin/bash --create-home web

# Standalone tree → /app (gives /app/apps/web/server.js + /app/node_modules).
COPY --from=build /app/apps/web/.next/standalone ./
# Static assets + public/ are not in the trace — copy them to the nested path.
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

RUN chown -R web:web /app
USER web

ENV NODE_ENV=production \
    PORT=5005 \
    HOSTNAME=0.0.0.0

EXPOSE 5005

# "/" is the public marketing landing page (apps/web/src/app/(marketing)/page.tsx)
# — no auth required, cheap to poll for liveness. No curl in this slim image,
# so use Node's global fetch (Node 22).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://localhost:'+process.env.PORT+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
