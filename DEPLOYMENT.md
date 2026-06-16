# Deployment notes

## WhatsApp bot (wwebjs / Puppeteer)

wwebjs drives a real Chromium instance. Puppeteer's automatic Chrome download is
disabled (`skipDownload: true` in `.puppeteerrc.cjs`) — you must provide a system
browser instead.

### Ubuntu VPS

```bash
sudo apt-get install -y chromium-browser
```

Then add to `apps/server/.env`:

```
CHROME_PATH=/usr/bin/chromium-browser
```

### Windows (local dev)

Install Google Chrome normally. If it isn't found automatically, set:

```
CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

If `CHROME_PATH` is not set, wwebjs will attempt to find a system browser on its own.

## Docker

`apps/server/Dockerfile` builds a self-contained production image (Chromium
included, so the WhatsApp bot works out of the box). Build context is the
**repo root**, not `apps/server/`, because the build needs the pnpm workspace:

```bash
docker build -f apps/server/Dockerfile -t pass-server .
```

Or use `docker compose up --build` (`docker-compose.yml` at the repo root) for
a ready-made Postgres + server stack.

On every `docker run`, the entrypoint (`apps/server/docker-entrypoint.sh`)
runs `prisma generate` then `prisma migrate deploy` against `DATABASE_URL`
before starting the server — migrations are applied automatically on deploy,
no manual step needed.

Two volumes matter for anything beyond a throwaway container:

- `/data/wwebjs_auth` — the WhatsApp session. Without this, every container
  recreation needs a fresh QR scan.
- `/app/packages/papers/papers` — past-paper PDFs. These are gitignored and
  downloaded out-of-band (`packages/papers`'s own scripts), so they're never
  part of the image — supply them via a volume, or override `PAPERS_LOCAL_DIR`
  to point at an arbitrary host path instead.

See the comments in `apps/server/Dockerfile` for the full rationale (why
Chromium needs `procps`, why the image runs as a non-root user, etc.).
