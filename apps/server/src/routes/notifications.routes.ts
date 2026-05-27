import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import {
  subscribeWebPush,
  unsubscribeWebPush,
  registerNativePush,
  unregisterNativePush,
  getNotificationSettings,
  updateNotificationSettings,
} from "../controllers/notifications.controller";

const router = new Hono();

router.use("/*", requireAuth);

router.post("/web-push/subscribe", subscribeWebPush);
router.delete("/web-push/subscribe", unsubscribeWebPush);

router.post("/native-push/register", registerNativePush);
router.delete("/native-push/register", unregisterNativePush);

router.get("/settings", getNotificationSettings);
router.patch("/settings", updateNotificationSettings);

export default router;
