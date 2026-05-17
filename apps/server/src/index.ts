import { env } from "@pass/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import aiRoutes from "./routes/ai.routes";
import authRoutes from "./routes/auth.routes";
import papersRoutes from "./routes/papers.routes";
import projectsRoutes from "./routes/projects.routes";
import resourcesRoutes from "./routes/resources.routes";
import usersRoutes from "./routes/users.routes";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
  }),
);

app.get("/", (c) => c.text("OK"));

app.route("/ai", aiRoutes);
app.route("/auth", authRoutes);
app.route("/resources", resourcesRoutes);
app.route("/papers", papersRoutes);
app.route("/projects", projectsRoutes);
app.route("/users", usersRoutes);

export default app;
