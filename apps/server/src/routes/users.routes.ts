import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { getMe, updateMe } from "../controllers/users.controller";

const router = new Hono();

router.use("/*", requireAuth);
router.get("/me", getMe);
router.patch("/me", updateMe);

export default router;
