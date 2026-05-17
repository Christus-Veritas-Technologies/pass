import { Hono } from "hono";
import { login, logout, signup } from "../controllers/auth.controller";

const router = new Hono();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

export default router;
