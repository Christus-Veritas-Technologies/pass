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
