import { Hono } from "hono";
import { elevateToAmbassador, swaggerUi, openApiSpec } from "../controllers/ambassador.controller";

const router = new Hono();

router.post("/elevate", elevateToAmbassador);
router.get("/docs", swaggerUi);
router.get("/openapi.json", openApiSpec);

export default router;
