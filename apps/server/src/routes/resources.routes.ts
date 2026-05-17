import { Hono } from "hono";
import { getResource, getResources } from "../controllers/resources.controller";

const router = new Hono();

router.get("/", getResources);
router.get("/:id", getResource);

export default router;
