import { Hono } from "hono";
import {
  generateProject,
  getProject,
  getProjects,
} from "../controllers/projects.controller";
import { requireAuth } from "../middleware/auth";

const router = new Hono();

router.use("/*", requireAuth);
router.get("/", getProjects);
router.get("/:id", getProject);
router.post("/generate", generateProject);

export default router;
