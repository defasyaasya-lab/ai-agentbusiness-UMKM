import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { ActiveRoute, ConnectionStatus, RiskState } from "@/lib/connectivity/types";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  storeName: text("store_name").notNull(),
  ownerName: text("owner_name").notNull(),
  telegramChatId: text("telegram_chat_id").notNull(),
  estimatedDailyRevenue: integer("estimated_daily_revenue").notNull(),
  primaryWifiName: text("primary_wifi_name").notNull(),
  backupWifiName: text("backup_wifi_name").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const networkLogs = sqliteTable("network_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  connectionStatus: text("connection_status").$type<ConnectionStatus>().notNull(),
  activeRoute: text("active_route").$type<ActiveRoute>().notNull(),
  speedMbps: integer("speed_mbps").notNull(),
  latencyMs: integer("latency_ms").notNull(),
  riskState: text("risk_state").$type<RiskState>().notNull(),
  timestamp: text("timestamp").notNull(),
});

export const incidents = sqliteTable("incidents", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull(),
  diagnosis: text("diagnosis").notNull(),
  actionTaken: text("action_taken").notNull(),
  protectedRevenue: integer("protected_revenue").notNull(),
  startedAt: text("started_at").notNull(),
  resolvedAt: text("resolved_at"),
});
