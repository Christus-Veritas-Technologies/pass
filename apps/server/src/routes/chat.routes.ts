import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import {
  listThreads,
  createThread,
  updateThread,
  deleteThread,
  listMessages,
  sendMessage,
} from "../controllers/chat.controller";

const router = new Hono();

router.use("/*", requireAuth);

// Threads
router.get("/threads", listThreads);
router.post("/threads", createThread);
router.patch("/threads/:id", updateThread);
router.delete("/threads/:id", deleteThread);

// Messages
router.get("/threads/:id/messages", listMessages);
router.post("/threads/:id/messages", sendMessage); // streaming SSE

export default router;
