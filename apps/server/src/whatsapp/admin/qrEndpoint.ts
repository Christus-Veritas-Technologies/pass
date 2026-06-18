/**
 * Admin endpoints: GET /whatsapp/qr (JSON) + GET /whatsapp/qr/page (HTML)
 * Protected by WHATSAPP_ADMIN_TOKEN.
 *
 * /whatsapp/qr/page — open this in a browser. It polls the JSON endpoint
 * every 5 s, renders the QR visually, and auto-updates when a new code
 * arrives. No log-watching, no expiry race.
 */

import type { Context } from "hono";
import { env } from "@pass/env/server";

let _latestQr: string | null = null;
let _connected = false;

export function setQr(qr: string): void        { _latestQr = qr; }
export function setConnected(v: boolean): void  { _connected = v; if (v) _latestQr = null; }

function checkToken(c: Context): boolean {
  if (!env.WHATSAPP_ADMIN_TOKEN) return true;
  const token = c.req.header("x-admin-token") ?? c.req.query("token");
  return token === env.WHATSAPP_ADMIN_TOKEN;
}

export function qrHandler(c: Context): Response {
  if (!checkToken(c)) return c.text("Forbidden", 403);
  if (_connected)  return c.json({ status: "connected",  qr: null });
  if (!_latestQr)  return c.json({ status: "not_ready",  qr: null });
  return c.json({ status: "needs_scan", qr: _latestQr });
}

export function qrPageHandler(c: Context): Response {
  if (!checkToken(c)) return c.text("Forbidden", 403);
  const token = c.req.query("token") ?? "";
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>WhatsApp QR — Pass</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#0f172a;color:#f1f5f9;
         min-height:100vh;display:flex;align-items:center;justify-content:center}
    .card{background:#1e293b;border-radius:16px;padding:32px 40px;text-align:center;
          max-width:360px;width:100%;box-shadow:0 25px 50px rgba(0,0,0,.5)}
    h1{font-size:1.1rem;font-weight:600;margin-bottom:4px;color:#e2e8f0}
    .sub{font-size:.8rem;color:#64748b;margin-bottom:24px}
    #qrdiv{display:flex;justify-content:center;margin-bottom:20px}
    #qrdiv canvas,#qrdiv img{border-radius:8px}
    .status{font-size:.85rem;padding:10px 16px;border-radius:8px;margin-bottom:16px}
    .status.connected{background:#14532d;color:#86efac}
    .status.waiting{background:#1e3a5f;color:#93c5fd}
    .status.scanning{background:#1c1917;color:#fcd34d}
    .dot{display:inline-block;width:8px;height:8px;border-radius:50%;
         margin-right:6px;vertical-align:middle}
    .connected .dot{background:#4ade80}
    .waiting .dot{background:#60a5fa;animation:pulse 1.5s infinite}
    .scanning .dot{background:#fbbf24;animation:pulse .8s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
    .refresh{font-size:.7rem;color:#475569;margin-top:8px}
  </style>
</head>
<body>
<div class="card">
  <h1>Pass WhatsApp</h1>
  <p class="sub">Admin QR scanner</p>
  <div id="statusbox" class="status waiting"><span class="dot"></span>Connecting…</div>
  <div id="qrdiv"></div>
  <p class="refresh" id="countdown">Refreshing in 5s</p>
</div>
<script>
  let qrObj = null;
  let lastQr = null;
  let secs = 5;

  function tick(){
    secs--;
    document.getElementById('countdown').textContent = secs > 0
      ? 'Refreshing in '+secs+'s' : 'Refreshing…';
    if(secs <= 0){ secs = 5; poll(); }
  }
  setInterval(tick, 1000);

  async function poll(){
    try{
      const r = await fetch('/whatsapp/qr${tokenParam}');
      const d = await r.json();
      const box = document.getElementById('statusbox');
      const div = document.getElementById('qrdiv');
      if(d.status === 'connected'){
        box.className='status connected';
        box.innerHTML='<span class="dot"></span>Connected ✓ — bot is live';
        div.innerHTML='';
        qrObj=null; lastQr=null;
      } else if(d.status === 'needs_scan' && d.qr){
        box.className='status scanning';
        box.innerHTML='<span class="dot"></span>Scan with WhatsApp';
        if(d.qr !== lastQr){
          lastQr = d.qr;
          div.innerHTML='';
          qrObj = new QRCode(div,{text:d.qr,width:240,height:240,
            colorDark:'#0f172a',colorLight:'#f8fafc',correctLevel:QRCode.CorrectLevel.M});
        }
      } else {
        box.className='status waiting';
        box.innerHTML='<span class="dot"></span>Waiting for WhatsApp to start…';
        div.innerHTML=''; qrObj=null; lastQr=null;
      }
    } catch(e){
      document.getElementById('statusbox').innerHTML='<span class="dot"></span>Server unreachable';
    }
  }
  poll();
</script>
</body>
</html>`;
  return c.html(html);
}
