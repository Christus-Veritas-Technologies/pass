import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import {
  getMe,
  updateMe,
  issueWhatsappLinkCode,
  unlinkWhatsapp,
} from "../controllers/users.controller";

const router = new Hono();

router.use("/*", requireAuth);
router.get("/me", getMe);
router.patch("/me", updateMe);

// WhatsApp account linking
router.post("/me/whatsapp/link-code", issueWhatsappLinkCode);
router.delete("/me/whatsapp", unlinkWhatsapp);

export default router;
