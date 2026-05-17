import { Hono } from "hono";
import {
  getPaper,
  getPapers,
  startSession,
  submitAnswer,
} from "../controllers/papers.controller";

const router = new Hono();

router.get("/", getPapers);
router.get("/:id", getPaper);
router.post("/:id/session", startSession);
router.post("/:id/session/answer", submitAnswer);

export default router;
