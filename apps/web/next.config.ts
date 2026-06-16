import "@pass/env/web";
import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  // Self-contained server bundle (.next/standalone) with only the node_modules
  // it actually traces as used — what the Dockerfile copies into the runtime
  // stage, instead of shipping the full monorepo node_modules.
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
