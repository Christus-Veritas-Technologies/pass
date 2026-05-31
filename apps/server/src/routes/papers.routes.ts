import { Hono } from "hono";
import {
  completeSession,
  downloadPaper,
  getPaper,
  getPapers,
  getRecentSessions,
  getSession,
  startSession,
  submitAnswer,
} from "../controllers/papers.controller";
import { requireAuth } from "../middleware/auth";

const router = new Hono();

// Public list
router.get("/", getPapers);

// Static routes before param routes to avoid /:id swallowing them
router.get("/sessions/recent", requireAuth, getRecentSessions);
router.get("/sessions/:sessionId", requireAuth, getSession);

router.get("/:id", getPaper);
router.get("/:id/download", requireAuth, downloadPaper);

// Session endpoints — require auth
router.post("/:id/session/start", requireAuth, startSession);
router.post("/session/:sessionId/answer", requireAuth, submitAnswer);
router.post("/session/:sessionId/complete", requireAuth, completeSession);

export default router;
