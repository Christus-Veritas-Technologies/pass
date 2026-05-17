import { Hono } from "hono";
import {
  forgotPassword,
  googleCallback,
  googleInit,
  googleNative,
  login,
  logout,
  refresh,
  resetPassword,
  signup,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

const router = new Hono();

// Email + password
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", requireAuth, logout);
router.post("/refresh", refresh);

// Google OAuth — web redirect flow
router.get("/google", googleInit);
router.get("/google/callback", googleCallback);

// Google OAuth — native (expo-auth-session sends the ID token)
router.post("/google/native", googleNative);

// Password recovery
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
