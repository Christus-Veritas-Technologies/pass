import { Hono } from "hono";
import {
  generateProject,
  getProject,
  getProjectHtml,
  getProjects,
} from "../controllers/projects.controller";
import { requireAuth } from "../middleware/auth";

const router = new Hono();

// HTML export validates its own token (Authorization header OR ?token= query param)
// so it must be registered BEFORE requireAuth.
router.get("/:id/html", getProjectHtml);

router.use("/*", requireAuth);
router.get("/", getProjects);
router.get("/:id", getProject);
router.post("/generate", generateProject);

export default router;
