import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";

export const DEMO_USER_ID = "demo-user";

type DbGlobal = typeof globalThis & {
  businessGuardianPgPool?: Pool;
  businessGuardianDb?: ReturnType<typeof drizzle<typeof schema>>;
};

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Set it to your Supabase/PostgreSQL connection string before using database-backed APIs.",
    );
  }

  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    throw new Error(
      "DATABASE_URL must be a PostgreSQL connection string, for example postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require.",
    );
  }

  return databaseUrl;
}

export function getDb() {
  const dbGlobal = globalThis as DbGlobal;

  if (!dbGlobal.businessGuardianPgPool) {
    dbGlobal.businessGuardianPgPool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: getDatabaseUrl().includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined,
    });
    dbGlobal.businessGuardianDb = drizzle(dbGlobal.businessGuardianPgPool, { schema });
  }

  return dbGlobal.businessGuardianDb!;
}
