import { Hono } from "hono";
import {
  generateProject,
  getProject,
  getProjects,
} from "../controllers/projects.controller";

const router = new Hono();

router.get("/", getProjects);
router.get("/:id", getProject);
router.post("/generate", generateProject);

export default router;
