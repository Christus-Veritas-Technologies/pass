import { Hono } from "hono";
import {
  generateProject,
  getProject,
  getProjectHtml,
  getProjectPdf,
  getProjects,
} from "../controllers/projects.controller";
import { requireAuth } from "../middleware/auth";

const router = new Hono();

// These two validate their own token (Authorization header OR ?token= query param)
// and must be registered BEFORE requireAuth.
router.get("/:id/html", getProjectHtml);
router.get("/:id/pdf", getProjectPdf);

router.use("/*", requireAuth);
router.get("/", getProjects);
router.get("/:id", getProject);
router.post("/generate", generateProject);

export default router;
