import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { getStudyStats, prepareStudySession } from "../controllers/study.controller";

const router = new Hono();

router.use("/*", requireAuth);
router.get("/stats", getStudyStats);
router.post("/prepare", prepareStudySession);

export default router;
