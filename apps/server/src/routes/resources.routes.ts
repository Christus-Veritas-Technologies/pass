import { Hono } from "hono";
import {
  downloadResource,
  getFeaturedResources,
  getResource,
  getResources,
} from "../controllers/resources.controller";

const router = new Hono();

router.get("/", getResources);
router.get("/featured", getFeaturedResources);
router.get("/:id", getResource);
router.get("/:id/download", downloadResource);

export default router;
