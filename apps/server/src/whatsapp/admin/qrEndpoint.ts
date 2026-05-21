/**
 * Admin endpoint: GET /whatsapp/qr
 * Returns the current QR code as JSON so an operator can re-scan without
 * needing server console access.  Protected by WHATSAPP_ADMIN_TOKEN.
 */

import type { Context } from "hono";
import { env } from "@pass/env/server";

let _latestQr: string | null = null;
let _connected = false;

export function setQr(qr: string): void      { _latestQr = qr; }
export function setConnected(v: boolean): void { _connected = v; if (v) _latestQr = null; }

export function qrHandler(c: Context): Response {
  const token = c.req.header("x-admin-token") ?? c.req.query("token");
  if (env.WHATSAPP_ADMIN_TOKEN && token !== env.WHATSAPP_ADMIN_TOKEN) {
    return c.text("Forbidden", 403);
  }
  if (_connected)   return c.json({ status: "connected",   qr: null });
  if (!_latestQr)   return c.json({ status: "not_ready",   qr: null });
  return c.json({ status: "needs_scan", qr: _latestQr });
}
