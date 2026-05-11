import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { createSeedConnectivityStatus } from "@/lib/connectivity/mock-status";
import type { ConnectivityHistoryEntry, ConnectivityStatus } from "@/lib/connectivity/types";
import { DEMO_USER_ID, getDb } from "@/lib/db";
import { ensureDemoUser } from "@/lib/db/profile-repository";
import { connectivityStates, networkLogs } from "@/lib/db/schema";

const MAX_PATTERN_LOGS = 200;

function toConnectivityStatus(
  row: typeof connectivityStates.$inferSelect,
): ConnectivityStatus {
  return {
    connectionStatus: row.connectionStatus,
    activeRoute: row.activeRoute,
    primaryConnection: row.primaryConnection,
    backupConnection: row.backupConnection,
    speedMbps: row.speedMbps,
    latencyMs: row.latencyMs,
    riskState: row.riskState,
    businessImpact: row.businessImpact,
    chartValues: row.chartValues,
    latestSwitchEvent: row.latestSwitchEvent,
    riskInsight: row.riskInsight,
    updatedAt: row.updatedAt,
  };
}

export async function upsertConnectivityState(
  status: ConnectivityStatus,
  userId = DEMO_USER_ID,
) {
  await ensureDemoUser();

  await getDb()
    .insert(connectivityStates)
    .values({
      userId,
      connectionStatus: status.connectionStatus,
      activeRoute: status.activeRoute,
      primaryConnection: status.primaryConnection,
      backupConnection: status.backupConnection,
      speedMbps: status.speedMbps,
      latencyMs: status.latencyMs,
      riskState: status.riskState,
      businessImpact: status.businessImpact,
      chartValues: status.chartValues,
      latestSwitchEvent: status.latestSwitchEvent,
      riskInsight: status.riskInsight,
      updatedAt: status.updatedAt,
    })
    .onConflictDoUpdate({
      target: connectivityStates.userId,
      set: {
        connectionStatus: status.connectionStatus,
        activeRoute: status.activeRoute,
        primaryConnection: status.primaryConnection,
        backupConnection: status.backupConnection,
        speedMbps: status.speedMbps,
        latencyMs: status.latencyMs,
        riskState: status.riskState,
        businessImpact: status.businessImpact,
        chartValues: status.chartValues,
        latestSwitchEvent: status.latestSwitchEvent,
        riskInsight: status.riskInsight,
        updatedAt: status.updatedAt,
      },
    });
}

export async function getConnectivityState(
  userId = DEMO_USER_ID,
): Promise<ConnectivityStatus> {
  await ensureDemoUser();

  const rows = await getDb()
    .select()
    .from(connectivityStates)
    .where(eq(connectivityStates.userId, userId))
    .limit(1);

  if (rows[0]) return toConnectivityStatus(rows[0]);

  const seedStatus = createSeedConnectivityStatus();
  await upsertConnectivityState(seedStatus, userId);
  console.log("[db] seeded default connectivity state");
  return seedStatus;
}

export async function insertNetworkLog(status: ConnectivityStatus) {
  await ensureDemoUser();

  await getDb().insert(networkLogs).values({
    id: randomUUID(),
    userId: DEMO_USER_ID,
    connectionStatus: status.connectionStatus,
    activeRoute: status.activeRoute,
    speedMbps: status.speedMbps,
    latencyMs: status.latencyMs,
    riskState: status.riskState,
    timestamp: status.updatedAt,
  });

  console.log(
    `[db] network_logs inserted: status=${status.connectionStatus} route=${status.activeRoute} timestamp=${status.updatedAt}`,
  );
}

export async function getRecentNetworkLogs(
  userId = DEMO_USER_ID,
): Promise<ConnectivityHistoryEntry[]> {
  await ensureDemoUser();

  const rows = await getDb()
    .select({
      timestamp: networkLogs.timestamp,
      connectionStatus: networkLogs.connectionStatus,
      activeRoute: networkLogs.activeRoute,
      speedMbps: networkLogs.speedMbps,
      latencyMs: networkLogs.latencyMs,
      riskState: networkLogs.riskState,
    })
    .from(networkLogs)
    .where(eq(networkLogs.userId, userId))
    .orderBy(desc(networkLogs.timestamp))
    .limit(MAX_PATTERN_LOGS);

  return rows.reverse();
}
