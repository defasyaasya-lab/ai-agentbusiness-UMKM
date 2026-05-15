import { defineConfig } from "drizzle-kit";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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

loadLocalEnv();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required for Drizzle. Set it to your Supabase/PostgreSQL connection string.",
  );
}

if (!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL)) {
  throw new Error(
    "DATABASE_URL must be a PostgreSQL connection string, for example postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require.",
  );
}

function normalizePostgresUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const sslMode = url.searchParams.get("sslmode");

  if (sslMode === "require" || sslMode === "prefer" || sslMode === "verify-ca") {
    url.searchParams.set("sslmode", "no-verify");
  }

  return url.toString();
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: normalizePostgresUrl(process.env.DATABASE_URL),
  },
});
