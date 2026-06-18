# syntax=docker/dockerfile:1.7
# ═══════════════════════════════════════════════════════════════════════════
# Pass server — production image
#
# This is a pnpm/turborepo monorepo: apps/server depends on workspace packages
# (@pass/db, @pass/env, @pass/pricing) via `workspace:*`, so the build needs
# the WHOLE repo, not just apps/server/. Build from the repo ROOT, pointing
# -f at this file:
#
#   docker build -f apps/server/Dockerfile -t pass-server .
#
# Two-base, two-stage build — each tool where it actually works:
#   • build stage  → node:slim + pnpm (via corepack). pnpm is NOT present in
#     the bun image, and packages/db's postinstall runs `node ./scripts/
#     postinstall.mjs`, which needs a real Node binary. So the install/build
#     happens on Node.
#   • runtime stage → oven/bun:slim. The server is launched with `bun
#     dist/index.mjs` (see the server's package.json `start`), and this is
#     also where Chromium for whatsapp-web.js lives.
#
# What this image does on every `docker run` (see docker-entrypoint.sh):
#   1. `prisma migrate deploy` — apply any pending migrations (non-interactive)
#   2. start the bundled server (dist/index.mjs, built by tsdown)
#
# Two runtime concerns this image bakes in support for:
#   - WhatsApp (whatsapp-web.js) needs a real Chromium browser (installed via
#     apt below) and a *persistent* session directory — mount a volume at
#     /data/wwebjs_auth or every restart will require re-scanning the QR code.
#   - Static past-paper PDFs are served from packages/papers/papers, which is
#     gitignored (downloaded separately, not part of the build context) — it
#     must be supplied as a volume too, or as an entirely different path via
#     PAPERS_LOCAL_DIR (see apps/server/src/lib/papersDir.ts).
# ═══════════════════════════════════════════════════════════════════════════

ARG NODE_VERSION=22
ARG BUN_VERSION=1.3

# ──────────────────────────────────────────────────────────────────────────
# Stage 1/2 — build: install the workspace and bundle the server (Node+pnpm).
#
# We install WITH devDependencies (no `--prod`): tsdown/typescript are needed
# to build, `prisma` (used by the entrypoint's `migrate deploy`) lives in
# @pass/db's devDependencies, and Chromium in the runtime stage dwarfs the
# size of these dev tools anyway.
# ──────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app

# pnpm via corepack (ships with Node — no separate install / version drift
# from package.json's "packageManager" field).
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# whatsapp-web.js depends on `puppeteer`, which tries to download its own
# Chromium on install. We use the distro Chromium from the runtime stage
# instead, so skip that download.
#
# puppeteer 23+ added a second download target (chrome-headless-shell) with
# its own skip flag — set both, plus the legacy CHROMIUM name for older
# versions. PUPPETEER_CACHE_DIR keeps any cache writes inside /tmp instead of
# trying to create ~/.cache/puppeteer inside a non-home-dir container user.
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROME_HEADLESS_SHELL_DOWNLOAD=true \
    PUPPETEER_CACHE_DIR=/tmp/.cache/puppeteer

# Copy the WHOLE repo before installing: workspace packages have postinstall
# hooks that need their own source present (packages/db runs `prisma generate`
# via scripts/postinstall.mjs). A manifest-only copy would break that hook.
COPY . .

# `--frozen-lockfile`: refuse to install (and silently mutate the lockfile)
# if package.json and pnpm-lock.yaml have drifted apart — fail loudly.
# `--prod=false`: force devDependencies to install even when NODE_ENV=production
# is present in the build environment (Coolify injects it as a build-time var).
# The build NEEDS devDeps — tsdown/typescript to bundle, and `prisma` (a devDep
# of @pass/db) for the postinstall's `prisma generate`. Without this, pnpm skips
# them and the @pass/db postinstall fails ("Cannot find module 'prisma/config'").
RUN pnpm install --frozen-lockfile --prod=false

# Explicit Prisma client generation. The install hook above already runs it,
# but doing it here too makes the dependency visible in build logs and is a
# hard requirement if this image is ever rebuilt with `--ignore-scripts`.
RUN pnpm --filter @pass/db run db:generate

# Bundles apps/server/src/index.ts → dist/index.mjs via tsdown (rolldown).
# @pass/db / @pass/env / @pass/pricing are inlined (tsdown.config.ts sets
# noExternal for /@pass\/.*\/), including Prisma's WASM query compiler.
RUN pnpm --filter server run build

# ──────────────────────────────────────────────────────────────────────────
# Stage 2/2 — runtime: Chromium + the built app, run by Bun as a non-root user.
# ──────────────────────────────────────────────────────────────────────────
FROM oven/bun:${BUN_VERSION}-slim AS runtime

# - google-chrome-stable: the browser puppeteer 24.x is built and tested
#                     against. Debian's `chromium` package is too old: the CDP
#                     protocol version in puppeteer 24.38 requires Chrome 126+,
#                     but Debian bookworm ships Chrome 128 *packaged* as chromium
#                     and there is a known CDP regression in that build that
#                     causes wwebjs to stall after "authenticated" and never
#                     emit "ready". Google Chrome stable is downloaded directly
#                     from Google; it also pulls in libgbm1 as a hard dep.
# - fonts-*:         headless Chrome needs fonts to render emoji / non-Latin
#                     glyphs that WhatsApp messages routinely contain.
# - procps:          provides `pgrep`/`pkill` (NOT in base coreutils) used by
#                     start.ts's killAllChrome() to reap orphaned Chrome.
# - ca-certificates / openssl: TLS for outbound HTTPS and Prisma.
# - dumb-init:       a real PID 1 to reap Chrome's helper zombies and
#                     forward SIGTERM from `docker stop`.
# - curl:            used by the HEALTHCHECK below.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates wget \
    && wget -q "https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb" \
         -O /tmp/google-chrome.deb \
    && apt-get install -y /tmp/google-chrome.deb \
    && rm /tmp/google-chrome.deb \
    && apt-get install -y --no-install-recommends \
         fonts-liberation \
         fonts-noto-color-emoji \
         procps \
         openssl \
         dumb-init \
         curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Fixed, non-root UID/GID so bind-mounted volume ownership is stable across
# image rebuilds.
RUN groupadd --gid 10001 pass \
    && useradd --uid 10001 --gid pass --shell /bin/bash --create-home pass

WORKDIR /app

# Pull the fully-installed workspace + built dist from the build stage.
# apps/web and apps/native were only present so `pnpm install` could resolve
# the workspace graph — the server never imports them, so drop them to keep
# the final image leaner. Safe: pnpm's real package contents live in the root
# node_modules/.pnpm store, still referenced by the remaining packages.
#
# `--chown=pass:pass` sets ownership DURING the copy. Doing it in a separate
# `RUN chown -R /app` instead forces overlayfs to copy the entire (multi-GB)
# node_modules tree into a new layer — doubling build-host disk usage and
# overflowing it (the build was killed with no error at exactly that step).
COPY --from=build --chown=pass:pass /app /app
RUN rm -rf apps/web apps/native packages/papers/node_modules

# Mount points for state that must outlive/precede any single container.
# /app is already pass-owned (COPY --chown above), so only chown the freshly
# created dirs here — NOT a second recursive chown over all of /app.
RUN mkdir -p /app/packages/papers/papers \
    && chown -R pass:pass /app/packages/papers/papers

ENV NODE_ENV=production \
    PORT=5006 \
    CHROME_PATH=/usr/bin/google-chrome-stable \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROME_HEADLESS_SHELL_DOWNLOAD=true \
    PUPPETEER_CACHE_DIR=/tmp/.cache/puppeteer \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# A brand-new named volume mounted here on first run inherits the (correctly
# owned, empty) directories baked in above, instead of a root-owned empty dir.
VOLUME ["/app/packages/papers/papers"]

RUN chmod +x apps/server/docker-entrypoint.sh

USER pass

EXPOSE 5006

# GET / returns a plain "OK" (apps/server/src/index.ts) — cheap liveness check.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS "http://localhost:${PORT}/" || exit 1

ENTRYPOINT ["dumb-init", "--", "apps/server/docker-entrypoint.sh"]

# Invoked directly with `bun`, bypassing the `pnpm`/`bun run` script wrapper
# so Docker's restart policy reads the server process's real exit status.
CMD ["bun", "apps/server/dist/index.mjs"]
