# syntax=docker/dockerfile:1.7
# ═══════════════════════════════════════════════════════════════════════════
# Pass server — production image
#
# This is a pnpm/turborepo monorepo: apps/server depends on workspace
# packages (@pass/db, @pass/env, @pass/pricing) via `workspace:*`, so the
# build needs the WHOLE repo, not just apps/server/. Build from the repo
# ROOT, pointing -f at this file:
#
#   docker build -f apps/server/Dockerfile -t pass-server .
#
# Run (see docker-compose.yml at the repo root for the full wiring):
#
#   docker run -d --name pass-server -p 3000:3000 \
#     --env-file apps/server/.env \
#     -v pass_wwebjs_auth:/data/wwebjs_auth \
#     -v pass_papers:/app/packages/papers/papers \
#     pass-server
#
# What this image does on every `docker run` (see docker-entrypoint.sh):
#   1. `prisma generate`      — regenerate the Prisma client from the schema
#   2. `prisma migrate deploy` — apply any pending migrations (non-interactive)
#   3. start the bundled server (dist/index.mjs, built by tsdown)
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

ARG BUN_VERSION=1.3

# ──────────────────────────────────────────────────────────────────────────
# Stage 1/3 — deps: install the full pnpm workspace.
#
# We deliberately install WITH devDependencies (no `--prod`) even for the
# production image: `prisma` (the CLI used for `migrate deploy`/`generate`
# at every container start) lives in @pass/db's devDependencies, and
# tsdown/typescript here are needed to build the next stage. Chromium
# (~300-400MB) dwarfs the size of these dev tools, so there's little to gain
# from the extra complexity of a separate prod-only install.
# ──────────────────────────────────────────────────────────────────────────
FROM oven/bun:${BUN_VERSION}-slim AS deps
WORKDIR /app

# whatsapp-web.js depends on `puppeteer` (not `puppeteer-core`), which tries
# to download its own Chromium on install. We use the distro Chromium
# installed in the runtime stage instead, so skip that download. The repo's
# own .puppeteerrc.cjs (skipDownload: true) only takes effect when pnpm's
# install cwd matches its location exactly — these env vars work regardless,
# so set them too as belt-and-suspenders.
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy only manifests first (+ the workspace/lockfile) so this layer is
# cached unless an actual dependency changes — editing application source
# below won't bust the `pnpm install` cache.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .puppeteerrc.cjs ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/native/package.json apps/native/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/env/package.json packages/env/package.json
COPY packages/pricing/package.json packages/pricing/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/papers/package.json packages/papers/package.json

# `--frozen-lockfile`: refuse to install (and silently mutate the lockfile)
# if package.json and pnpm-lock.yaml have drifted apart — fail loudly
# instead of shipping a build no one reviewed.
RUN pnpm install --frozen-lockfile

# ──────────────────────────────────────────────────────────────────────────
# Stage 2/3 — build: generate the Prisma client and bundle the server.
# ──────────────────────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app

# Now bring in the actual source.
COPY . .

# `pnpm install`'s postinstall hook for @pass/db already runs `prisma
# generate` once — this explicit step is for two reasons: (1) it's a no-op
# if scripts ran, but a hard requirement if this image is ever rebuilt with
# `--ignore-scripts`; (2) it makes the dependency on a generated Prisma
# client visible in build logs instead of buried in an install hook.
RUN pnpm --filter @pass/db run db:generate

# Bundles apps/server/src/index.ts → dist/*.mjs via tsdown (rolldown).
# @pass/db / @pass/env / @pass/pricing are inlined (tsdown.config.ts sets
# noExternal for /@pass\/.*\/), including Prisma's WASM query compiler —
# the runtime stage therefore needs none of those workspace packages, only
# apps/server's true runtime npm dependencies (whatsapp-web.js, hono, the
# Anthropic/AWS SDKs, pdfkit, etc.) which tsdown leaves external.
RUN pnpm --filter server run build

# ──────────────────────────────────────────────────────────────────────────
# Stage 3/3 — runtime: Chromium + the built app, as a non-root user.
# ──────────────────────────────────────────────────────────────────────────
FROM oven/bun:${BUN_VERSION}-slim AS runtime

# - chromium:        the actual browser whatsapp-web.js drives via Puppeteer.
#                     Debian's package pulls in every shared lib (libnss3,
#                     libatk, libgtk, fonts, etc.) it needs automatically —
#                     unlike a from-scratch/distroless base, apt's own
#                     dependency resolution handles this, no need to
#                     hand-enumerate 30+ .so packages.
# - fonts-liberation / fonts-noto-color-emoji: WhatsApp messages routinely
#                     contain emoji/non-Latin glyphs; headless Chromium needs
#                     fonts installed to render (and in rarer cases, parse)
#                     them correctly.
# - procps:           provides `pgrep`/`pkill`, NOT part of base coreutils.
#                     apps/server/src/whatsapp/start.ts's killAllChrome()
#                     shells out to both to reap orphaned Chrome processes
#                     after a crash/restart — without this package those
#                     calls fail silently (wrapped in try/catch) and orphaned
#                     Chrome keeps the session profile locked forever.
# - ca-certificates:  TLS verification for outbound HTTPS (Anthropic/OpenRouter
#                     API, WhatsApp Web sockets, R2/S3, Paynow, SMTP-over-TLS).
# - dumb-init:        a real PID 1. Headless Chromium forks helper/zygote
#                     processes; without an init process reaping them you
#                     accumulate zombies, and SIGTERM from `docker stop`
#                     won't propagate correctly to the process tree.
# - curl:             used by the HEALTHCHECK below.
RUN apt-get update && apt-get install -y \
      chromium \
      fonts-liberation \
      fonts-noto-color-emoji \
    && apt-get install -y --no-install-recommends \
      procps \
      ca-certificates \
      dumb-init \
      curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Fixed, non-root UID/GID so bind-mounted volume ownership is stable across
# image rebuilds (a UID that changes between deploys would otherwise orphan
# permissions on the wwebjs session / papers volumes).
RUN groupadd --gid 10001 pass \
    && useradd --uid 10001 --gid pass --shell /bin/bash --create-home pass

WORKDIR /app

# Pull the fully-installed workspace + built dist from the build stage.
# apps/web and apps/native were only present so `pnpm install` could resolve
# the workspace graph — the server never imports them, so drop them now to
# keep the final image leaner. This is safe: pnpm's real package contents
# live in the root node_modules/.pnpm virtual store, which apps/server,
# packages/db/env/pricing still reference via relative symlinks untouched
# by removing apps/web and apps/native.
COPY --from=build /app /app
RUN rm -rf apps/web apps/native packages/papers/node_modules

# Mount points for state that must outlive/precede any single container:
#   /data/wwebjs_auth                — whatsapp-web.js LocalAuth session.
#                                       Without a volume here, every restart
#                                       needs a fresh QR scan.
#   /app/packages/papers/papers      — past-paper PDFs. Gitignored upstream
#                                       (downloaded out-of-band, not part of
#                                       the build context — see .dockerignore),
#                                       so the directory only exists as an
#                                       empty mount point in the image itself.
RUN mkdir -p /data/wwebjs_auth /app/packages/papers/papers \
    && chown -R pass:pass /data /app

ENV NODE_ENV=production \
    PORT=3000 \
    CHROME_PATH=/usr/bin/chromium \
    WHATSAPP_SESSION_DIR=/data/wwebjs_auth \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Declaring these means a brand-new named volume mounted here on first run
# inherits the (now correctly-owned, empty) directories baked into the
# image, instead of an empty root-owned directory Docker would otherwise
# create — avoiding an EACCES on first boot as the `pass` user.
VOLUME ["/data/wwebjs_auth", "/app/packages/papers/papers"]

RUN chmod +x apps/server/docker-entrypoint.sh

USER pass

EXPOSE 3000

# GET / returns a plain "OK" (apps/server/src/index.ts) — cheap liveness
# check Docker/Compose/orchestrators can poll without hitting the DB.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS "http://localhost:${PORT}/" || exit 1

ENTRYPOINT ["dumb-init", "--", "apps/server/docker-entrypoint.sh"]

# Invoked directly with `bun`, bypassing `pnpm`/`bun run`'s script wrapper
# (the extra process layer that turned a Chrome crash into a confusing
# "ELIFECYCLE Command failed" in production logs instead of a clean exit
# code) — Docker's restart policy reads this process's actual exit status.
CMD ["bun", "apps/server/dist/index.mjs"]
