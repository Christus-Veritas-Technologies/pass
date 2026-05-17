import type { Context } from "hono";

export async function getProjects(c: Context) {
  return c.json({ message: "getProjects" });
}

export async function getProject(c: Context) {
  return c.json({ message: "getProject", id: c.req.param("id") });
}

export async function generateProject(c: Context) {
  return c.json({ message: "generateProject" });
}
