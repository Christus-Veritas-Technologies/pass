import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  noExternal: [/@pass\/.*/],
  // pdfkit is CJS with embedded binary font data. Bundling it into ESM can
  // break the font loader. Mark it external so Bun loads it natively at runtime.
  external: ["pdfkit"],
});
