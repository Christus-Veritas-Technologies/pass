import { Hono } from "hono";
import { getFeaturedResources, getResource, getResources } from "../controllers/resources.controller";

const router = new Hono();

router.get("/", getResources);
router.get("/featured", getFeaturedResources);
router.get("/:id", getResource);

export default router;
