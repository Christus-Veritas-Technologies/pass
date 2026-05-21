/**
 * WhatsApp message formatting helpers.
 * WhatsApp supports: *bold*  _italic_  ~strikethrough~  `mono`
 */

export function progressBar(used: number, limit: number, segments = 10): string {
  if (limit === Infinity || limit === 0) return "▓▓▓▓▓▓▓▓▓▓";
  const filled = Math.round((Math.min(used, limit) / limit) * segments);
  return "▓".repeat(filled) + "░".repeat(segments - filled);
}

export function formatResetDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

export function nextResetDate(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function chunkMessage(text: string, maxChars = 3_500): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxChars) {
    let cut = remaining.lastIndexOf("\n\n", maxChars);
    if (cut < maxChars / 2) cut = remaining.lastIndexOf("\n", maxChars);
    if (cut < maxChars / 2) cut = maxChars;
    chunks.push(remaining.slice(0, cut).trimEnd());
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
