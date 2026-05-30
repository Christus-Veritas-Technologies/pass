import { Hono } from "hono";
import {
  generateProject,
  getProject,
  getProjectHtml,
  getProjectPdf,
  getProjectDocx,
  getProjects,
} from "../controllers/projects.controller";
import { requireAuth } from "../middleware/auth";

const router = new Hono();

// These validate their own token and must be before requireAuth.
router.get("/:id/html", getProjectHtml);
router.get("/:id/pdf", getProjectPdf);
router.get("/:id/docx", getProjectDocx);

router.use("/*", requireAuth);
router.get("/", getProjects);
router.get("/:id", getProject);
router.post("/generate", generateProject);

export default router;
