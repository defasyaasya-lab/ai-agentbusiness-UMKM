import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import * as schema from "@/lib/db/schema";

export const DEMO_USER_ID = "demo-user";
const DB_FILE = join(process.cwd(), "data", "business-guardian.sqlite");

type DbGlobal = typeof globalThis & {
  businessGuardianSqlite?: Database.Database;
  businessGuardianDb?: ReturnType<typeof drizzle<typeof schema>>;
};

function createSqliteClient() {
  mkdirSync(dirname(DB_FILE), { recursive: true });
  const sqlite = new Database(DB_FILE);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      store_name TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      telegram_chat_id TEXT NOT NULL,
      estimated_daily_revenue INTEGER NOT NULL,
      primary_wifi_name TEXT NOT NULL,
      backup_wifi_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS network_logs (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      connection_status TEXT NOT NULL,
      active_route TEXT NOT NULL,
      speed_mbps INTEGER NOT NULL,
      latency_ms INTEGER NOT NULL,
      risk_state TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS network_logs_user_timestamp_idx
      ON network_logs (user_id, timestamp);

    CREATE INDEX IF NOT EXISTS network_logs_status_timestamp_idx
      ON network_logs (connection_status, timestamp);

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      diagnosis TEXT NOT NULL,
      action_taken TEXT NOT NULL,
      protected_revenue INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  return sqlite;
}

export function getDb() {
  const dbGlobal = globalThis as DbGlobal;

  if (!dbGlobal.businessGuardianSqlite) {
    dbGlobal.businessGuardianSqlite = createSqliteClient();
    dbGlobal.businessGuardianDb = drizzle(dbGlobal.businessGuardianSqlite, { schema });
    seedDemoUser(dbGlobal.businessGuardianDb);
  }

  return dbGlobal.businessGuardianDb!;
}

function seedDemoUser(db: ReturnType<typeof drizzle<typeof schema>>) {
  const existingUser = db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.id, DEMO_USER_ID))
    .get();

  if (existingUser) return;

  const now = new Date().toISOString();
  db.insert(schema.users)
    .values({
      id: DEMO_USER_ID,
      storeName: "Toko Sinar Rasa",
      ownerName: "Pemilik Toko",
      telegramChatId: process.env.TELEGRAM_CHAT_ID ?? "demo-telegram-chat",
      estimatedDailyRevenue: 8500000,
      primaryWifiName: "WiFi Utama Toko",
      backupWifiName: "Hotspot HP Cadangan",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  console.log(`[db] seeded default demo user in ${DB_FILE}`);
}
