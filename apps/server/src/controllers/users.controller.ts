import type { Context } from "hono";

export async function getMe(c: Context) {
  return c.json({ message: "getMe" });
}

export async function updateMe(c: Context) {
  return c.json({ message: "updateMe" });
}
