import { Hono } from "hono";
import { qrHandler } from "../whatsapp/admin/qrEndpoint";

const router = new Hono();

// GET /whatsapp/qr — admin only (gated by x-admin-token header or ?token= query)
router.get("/qr", (c) => qrHandler(c));

export default router;
