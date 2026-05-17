import type { Context } from "hono";

export async function getResources(c: Context) {
  return c.json({ message: "getResources" });
}

export async function getResource(c: Context) {
  return c.json({ message: "getResource", id: c.req.param("id") });
}
