import { Hono } from "hono";
import { qrHandler, qrPageHandler } from "../whatsapp/admin/qrEndpoint";

const router = new Hono();

// GET /whatsapp/qr      — JSON, for programmatic polling
// GET /whatsapp/qr/page — browser page with live-rendering QR + auto-refresh
router.get("/qr",      (c) => qrHandler(c));
router.get("/qr/page", (c) => qrPageHandler(c));

export default router;
