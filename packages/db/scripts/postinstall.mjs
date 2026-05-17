import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const fallbackDatabaseUrl = "postgresql://postgres:postgres@localhost:5432/pass";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = fallbackDatabaseUrl;
}

const localPrismaBinary = process.platform === "win32"
  ? path.join(process.cwd(), "node_modules", ".bin", "prisma.cmd")
  : path.join(process.cwd(), "node_modules", ".bin", "prisma");

const command = existsSync(localPrismaBinary) ? localPrismaBinary : "npx";
const args = existsSync(localPrismaBinary) ? ["generate"] : ["prisma", "generate"];

const result = spawnSync(command, args, {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

if (result.error) {
  console.error("Failed to run Prisma generate:", result.error.message);
  process.exit(1);
}

if (typeof result.status === "number" && result.status !== 0) {
  process.exit(result.status);
}
