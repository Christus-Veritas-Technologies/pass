import { join } from "node:path";
import { PAPERS_DIR, resolvePaperPath } from "./lib/papersDir";
import { env } from "@pass/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import aiRoutes from "./routes/ai.routes";
import authRoutes from "./routes/auth.routes";
import papersRoutes from "./routes/papers.routes";
import paymentsRoutes from "./routes/payments.routes";
import projectsRoutes from "./routes/projects.routes";
import resourcesRoutes from "./routes/resources.routes";
import studyRoutes from "./routes/study.routes";
import uploadRoutes from "./routes/upload.routes";
import usersRoutes from "./routes/users.routes";
import whatsappRoutes from "./routes/whatsapp.routes";
import notificationsRoutes from "./routes/notifications.routes";
import sysRoutes from "./routes/sys.routes";

const app = new Hono();

// Allowed web origins (exact match)
const WEB_ORIGINS = new Set([
  "https://pass.co.zw",
  "https://www.pass.co.zw",
  "http://localhost:5005", // Next.js web dev server
  "http://localhost:3001", // legacy dev port
  "http://localhost:3000",
  "http://localhost:8081",
]);

app.use(logger());
app.use(
  "/*",
  cors({
    // Mobile apps send requests with a null or absent Origin header.
    // Web requests get reflected back only if in the allow-list.
    origin: (origin) => {
      if (!origin || origin === "null") return "*";
      return WEB_ORIGINS.has(origin) ? origin : null;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.get("/", (c) => c.text("OK"));

// Always return JSON for unhandled errors so clients can parse the response.
app.onError((err, c) => {
  console.error("Unhandled server error:", err);
  const status = "status" in err && typeof err.status === "number" ? err.status as 400 | 401 | 403 | 404 | 409 | 500 : 500;
  return c.json({ error: err.message ?? "Internal server error" }, status);
});

// ─── Static past-paper PDFs ───────────────────────────────────────────────────
// PDFs live in packages/papers/papers (or the path overridden via PAPERS_LOCAL_DIR).
// PAPERS_DIR / resolvePaperPath handle bundle-depth differences and extra-nesting
// deployments automatically — see src/lib/papersDir.ts.

app.get("/static/papers/*", async (c) => {
  const rel = decodeURIComponent(c.req.path.replace(/^\/static\/papers\//, ""));
  // Reject path traversal
  if (rel.includes("..") || rel.startsWith("/")) {
    return c.text("Forbidden", 403);
  }
  const abs = resolvePaperPath(rel);
  if (!abs) {
    console.warn(`[static] paper not found: ${join(PAPERS_DIR, rel)}`);
    return c.text("Not found", 404);
  }
  const file = Bun.file(abs);
  return new Response(file, {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

app.route("/ai", aiRoutes);
app.route("/auth", authRoutes);
app.route("/payments", paymentsRoutes);
app.route("/resources", resourcesRoutes);
app.route("/papers", papersRoutes);
app.route("/projects", projectsRoutes);
app.route("/study", studyRoutes);
app.route("/upload", uploadRoutes);
app.route("/users", usersRoutes);
app.route("/notifications", notificationsRoutes);
app.route("/whatsapp", whatsappRoutes);
app.route("/sys", sysRoutes);

// ─── WhatsApp bot (opt-in via env flag) ──────────────────────────────────────
if (env.WHATSAPP_ENABLED === "true") {
  import("./whatsapp/start")
    .then(({ startWhatsappBot }) =>
      startWhatsappBot(app).catch((err) =>
        console.error("[whatsapp] Startup error:", err),
      ),
    )
    .catch((err) => console.error("[whatsapp] Import error:", err));
}

export default app;
