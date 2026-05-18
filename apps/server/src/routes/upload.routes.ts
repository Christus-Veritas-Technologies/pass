import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { presignUpload } from "../controllers/upload.controller";

const router = new Hono();

router.post("/presign", requireAuth, presignUpload);

export default router;
