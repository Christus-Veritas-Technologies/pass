import { Hono } from "hono";
import {
  completeSession,
  getPaper,
  getPapers,
  getRecentSessions,
  startSession,
  submitAnswer,
} from "../controllers/papers.controller";
import { requireAuth } from "../middleware/auth";

const router = new Hono();

// Public list
router.get("/", getPapers);
router.get("/sessions/recent", getRecentSessions);
router.get("/:id", getPaper);

// Session endpoints — require auth
router.post("/:id/session/start", requireAuth, startSession);
router.post("/session/:sessionId/answer", requireAuth, submitAnswer);
router.post("/session/:sessionId/complete", requireAuth, completeSession);

export default router;
