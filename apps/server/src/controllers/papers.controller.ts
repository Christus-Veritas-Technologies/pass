import type { Context } from "hono";

export async function getPapers(c: Context) {
  return c.json({ message: "getPapers" });
}

export async function getPaper(c: Context) {
  return c.json({ message: "getPaper", id: c.req.param("id") });
}

export async function startSession(c: Context) {
  return c.json({ message: "startSession", id: c.req.param("id") });
}

export async function submitAnswer(c: Context) {
  return c.json({ message: "submitAnswer", id: c.req.param("id") });
}
