import type { Context } from "hono";
import { randomBytes } from "crypto";
import { z } from "zod";
import { isR2Configured, getUploadUrl, getPublicUrl } from "../lib/r2";

const ALLOWED_TYPES: Record<string, string[]> = {
  avatar: ["image/jpeg", "image/png", "image/webp"],
  resource: ["application/pdf"],
};

const MAX_SIZES: Record<string, number> = {
  avatar: 5 * 1024 * 1024,   // 5 MB
  resource: 50 * 1024 * 1024, // 50 MB
};

const requestSchema = z.object({
  type: z.enum(["avatar", "resource"]),
  contentType: z.string().min(1),
  filename: z.string().min(1).max(200),
});

/**
 * POST /upload/presign
 * Returns a pre-signed R2 PUT URL and the final public URL.
 * The client uploads directly to R2, then stores the publicUrl.
 */
export async function presignUpload(c: Context) {
  if (!isR2Configured()) {
    return c.json({ error: "File uploads are not configured" }, 503);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request" }, 400);

  const { type, contentType, filename } = parsed.data;

  const allowed = ALLOWED_TYPES[type];
  if (!allowed.includes(contentType)) {
    return c.json({ error: `Content type ${contentType} is not allowed for ${type}` }, 400);
  }

  // Build a unique key: {type}/{random}/{sanitised-filename}
  const ext = filename.split(".").pop() ?? "";
  const key = `${type}/${randomBytes(16).toString("hex")}.${ext}`;

  const uploadUrl = await getUploadUrl(key, contentType);
  const publicUrl = getPublicUrl(key);

  return c.json({ uploadUrl, publicUrl, key, maxBytes: MAX_SIZES[type] });
}
