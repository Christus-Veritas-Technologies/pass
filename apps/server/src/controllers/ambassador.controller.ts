import type { Context } from "hono";
import prisma from "@pass/db";

/** The endpoint password. Never logged, never returned, never shown in docs examples. */
const ENDPOINT_PASSWORD = "exyro45610y2627291";

/**
 * POST /sys/elevate
 *
 * Grants ambassador status to a user by email.
 * Protected only by the shared secret — no JWT or session required.
 * The endpoint path and password are communicated privately to administrators only.
 */
export async function elevateToAmbassador(c: Context): Promise<Response> {
  const body = await c.req.json().catch(() => null) as { password?: string; email?: string } | null;

  if (!body?.password || !body?.email) {
    return c.json({ error: "password and email are required" }, 400);
  }

  if (body.password !== ENDPOINT_PASSWORD) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = await prisma.user.findUnique({
    where: { email: body.email.trim().toLowerCase() },
    select: { id: true, name: true, email: true, plan: true, isAmbassador: true },
  });

  if (!user) {
    return c.json({ error: `No account found for ${body.email}` }, 404);
  }

  if (user.isAmbassador) {
    return c.json({
      message: "User is already an ambassador",
      user: { name: user.name, email: user.email, plan: user.plan },
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isAmbassador: true },
  });

  return c.json({
    success: true,
    message: `${user.name} is now a Pass Ambassador`,
    user: { name: user.name, email: user.email, plan: user.plan },
  });
}

/**
 * GET /sys/docs
 * Renders a Swagger UI page for the sys endpoints.
 */
export async function swaggerUi(c: Context): Promise<Response> {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Pass — Internal API Docs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/>
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
SwaggerUIBundle({
  url: "/sys/openapi.json",
  dom_id: "#swagger-ui",
  presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
  layout: "BaseLayout",
  deepLinking: true,
});
</script>
</body>
</html>`;
  return c.html(html);
}

/**
 * GET /sys/openapi.json
 * Returns the OpenAPI 3.0 specification for the sys endpoints.
 * The example request uses a DUMMY password — the real value is never documented.
 */
export async function openApiSpec(c: Context): Promise<Response> {
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "Pass — Internal API",
      version: "1.0.0",
      description: "Internal management endpoints for the Pass platform. Access is restricted.",
    },
    servers: [{ url: "https://api.pass.co.zw", description: "Production" }],
    paths: {
      "/sys/elevate": {
        post: {
          summary: "Grant ambassador status",
          description: "Promotes an existing Pass user to Ambassador tier, giving them 1 000 of every quota type per month. Protected by a shared secret — contact an administrator for access.",
          operationId: "elevateToAmbassador",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["password", "email"],
                  properties: {
                    password: {
                      type: "string",
                      description: "Shared secret for this endpoint (not the user's password).",
                      example: "your-secret-password-here",
                    },
                    email: {
                      type: "string",
                      format: "email",
                      description: "Email address of the Pass account to promote.",
                      example: "ambassador@example.com",
                    },
                  },
                },
                example: {
                  password: "your-secret-password-here",
                  email: "ambassador@example.com",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "User promoted to ambassador (or was already one)",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" },
                      user: {
                        type: "object",
                        properties: {
                          name:  { type: "string" },
                          email: { type: "string" },
                          plan:  { type: "string" },
                        },
                      },
                    },
                  },
                  example: {
                    success: true,
                    message: "Tendai Moyo is now a Pass Ambassador",
                    user: { name: "Tendai Moyo", email: "ambassador@example.com", plan: "FREE" },
                  },
                },
              },
            },
            "400": { description: "Missing password or email" },
            "401": { description: "Wrong password" },
            "404": { description: "No account found for that email" },
          },
        },
      },
    },
  };
  return c.json(spec);
}
