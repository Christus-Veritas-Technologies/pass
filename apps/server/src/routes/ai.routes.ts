import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { evaluateAnswer, explainAnswer, generateProject } from "../controllers/ai.controller";

const router = new Hono();

router.use("/*", requireAuth);

// POST /ai/evaluate/:sessionId — evaluate a question answer (cached after first call)
router.post("/evaluate/:sessionId", evaluateAnswer);

// POST /ai/explain/:sessionId/:questionNumber — stream explanation for a wrong answer
router.post("/explain/:sessionId/:questionNumber", explainAnswer);

// POST /ai/projects/generate — stream project generation, returns X-Project-Id header
router.post("/projects/generate", generateProject);

export default router;
