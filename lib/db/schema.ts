import { index, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import type {
  ActiveRoute,
  BusinessImpact,
  ConnectionStatus,
  LocalAgentConnection,
  RiskPatternInsight,
  RiskState,
  SwitchEvent,
} from "@/lib/connectivity/types";

export const users = pgTable("users", {
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

export const networkLogs = pgTable(
  "network_logs",
  {
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
  },
  (table) => ({
    userTimestampIdx: index("network_logs_user_timestamp_idx").on(
      table.userId,
      table.timestamp,
    ),
    statusTimestampIdx: index("network_logs_status_timestamp_idx").on(
      table.connectionStatus,
      table.timestamp,
    ),
  }),
);

export const connectivityStates = pgTable("connectivity_states", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  connectionStatus: text("connection_status").$type<ConnectionStatus>().notNull(),
  activeRoute: text("active_route").$type<ActiveRoute>().notNull(),
  primaryConnection: jsonb("primary_connection").$type<LocalAgentConnection>().notNull(),
  backupConnection: jsonb("backup_connection").$type<LocalAgentConnection>().notNull(),
  speedMbps: integer("speed_mbps").notNull(),
  latencyMs: integer("latency_ms").notNull(),
  riskState: text("risk_state").$type<RiskState>().notNull(),
  businessImpact: jsonb("business_impact").$type<BusinessImpact>().notNull(),
  chartValues: jsonb("chart_values").$type<number[]>().notNull(),
  latestSwitchEvent: jsonb("latest_switch_event").$type<SwitchEvent>().notNull(),
  riskInsight: jsonb("risk_insight").$type<RiskPatternInsight>().notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const incidents = pgTable("incidents", {
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
