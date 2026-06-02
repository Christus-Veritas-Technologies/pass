/**
 * PM2 ecosystem config for the Pass server.
 *
 * Start:   pm2 start ecosystem.config.cjs
 * Logs:    pm2 logs pass-server
 * Reload:  pm2 reload pass-server
 * Stop:    pm2 stop pass-server
 *
 * The server is a compiled Bun binary (apps/server/server). Build it first:
 *   cd apps/server && bun run compile
 * Or run from source (slower, dev only):
 *   change `script` below to "bun" and `args` to "run src/index.ts"
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

module.exports = {
  apps: [
    {
      name: "pass-server",

      // ── Run the pre-compiled binary ─────────────────────────────────────────
      // Build it with: bun run compile  (produces apps/server/server)
      script: path.join(__dirname, "server"),
      interpreter: "none", // compiled binary, not a JS file

      // ── Or run from source (uncomment to use) ───────────────────────────────
      // script: "bun",
      // args: "run src/index.ts",
      // interpreter: "none",

      cwd: __dirname,

      // Load .env from the server directory
      env_file: path.join(__dirname, ".env"),

      // ── Logging ─────────────────────────────────────────────────────────────
      // merge_logs: true so both stdout and stderr appear in `pm2 logs pass-server`
      merge_logs: true,
      out_file: path.join(__dirname, "logs", "out.log"),
      error_file: path.join(__dirname, "logs", "error.log"),
      log_date_format: "YYYY-MM-DD HH:mm:ss",

      // ── Restart policy ──────────────────────────────────────────────────────
      max_memory_restart: "512M",
      restart_delay: 2000,
      max_restarts: 10,

      // ── Environment ─────────────────────────────────────────────────────────
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
