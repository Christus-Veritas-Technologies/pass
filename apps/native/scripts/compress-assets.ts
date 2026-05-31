/**
 * Compresses app icon and splash PNG assets using sharp.
 * Run once before a production build: bun scripts/compress-assets.ts
 *
 * Expo requires specific dimensions:
 *   icon.png          — 1024×1024
 *   adaptive-icon.png — 1024×1024
 *   splash-icon*.png  — any, but typically 1242×2436
 */
import sharp from "sharp";
import { join } from "path";

const ASSETS = join(import.meta.dir, "../assets/images");

const targets = [
  { file: "icon.png",            size: 1024 },
  { file: "adaptive-icon.png",   size: 1024 },
  { file: "splash-icon.png",     width: 1242, height: 2436 },
  { file: "splash-icon-dark.png",width: 1242, height: 2436 },
];

for (const t of targets) {
  const src = join(ASSETS, t.file);
  const w = "size" in t ? t.size : t.width;
  const h = "size" in t ? t.size : t.height;
  await sharp(src)
    .resize(w, h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: false })
    .toFile(src + ".tmp");

  // Replace original only if smaller
  const { size: orig } = Bun.file(src);
  const { size: compressed } = Bun.file(src + ".tmp");
  if (compressed < orig) {
    await Bun.write(src, Bun.file(src + ".tmp"));
    console.log(`✓ ${t.file}: ${(orig/1024).toFixed(0)} KB → ${(compressed/1024).toFixed(0)} KB`);
  } else {
    console.log(`  ${t.file}: already optimal (${(orig/1024).toFixed(0)} KB)`);
  }
  await Bun.file(src + ".tmp").unlink?.().catch(() => {});
}
