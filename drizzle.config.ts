import { defineConfig } from "drizzle-kit";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

function loadLocalEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [key, ...valueParts] = trimmed.split("=");
    if (!key || process.env[key]) continue;

    process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
  }
}

function getDatabaseUrl() {
  loadLocalEnv();
  const databaseUrl = process.env.DATABASE_URL?.trim() || "./data/business-guardian.sqlite";
  const filePath = databaseUrl.startsWith("file:")
    ? databaseUrl.replace(/^file:/, "")
    : databaseUrl;

  return isAbsolute(filePath) ? filePath : join(process.cwd(), filePath);
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
