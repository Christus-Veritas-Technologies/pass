import type { Context } from "hono";

export async function signup(c: Context) {
  return c.json({ message: "signup" });
}

export async function login(c: Context) {
  return c.json({ message: "login" });
}

export async function logout(c: Context) {
  return c.json({ message: "logout" });
}
