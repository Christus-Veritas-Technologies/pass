import { Hono } from "hono";
import {
  getPaper,
  getPapers,
  getRecentSessions,
  startSession,
  submitAnswer,
} from "../controllers/papers.controller";

const router = new Hono();

router.get("/", getPapers);
router.get("/sessions/recent", getRecentSessions);
router.get("/:id", getPaper);
router.post("/:id/session", startSession);
router.post("/:id/session/answer", submitAnswer);

export default router;
