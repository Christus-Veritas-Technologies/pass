import { Hono } from "hono";
import {
  exportProjectHtml,
  generateProject,
  getProject,
  getProjectHtml,
  getProjects,
} from "../controllers/projects.controller";
import { requireAuth } from "../middleware/auth";

const router = new Hono();

// HTML export handles its own auth (supports ?token= query param for new-tab opens)
router.get("/:id/html", getProjectHtml);

router.use("/*", requireAuth);
router.get("/", getProjects);
router.get("/:id/html", exportProjectHtml);
router.get("/:id", getProject);
router.post("/generate", generateProject);

export default router;
