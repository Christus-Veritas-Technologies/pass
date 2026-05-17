import { Hono } from "hono";
import { getMe, updateMe } from "../controllers/users.controller";

const router = new Hono();

router.get("/me", getMe);
router.patch("/me", updateMe);

export default router;
