import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { DEMO_USER_ID, getDb } from "@/lib/db";
import { networkLogs } from "@/lib/db/schema";
import type { ConnectivityHistoryEntry, ConnectivityStatus } from "@/lib/connectivity/types";

const MAX_PATTERN_LOGS = 200;

export function insertNetworkLog(status: ConnectivityStatus) {
  getDb()
    .insert(networkLogs)
    .values({
      id: randomUUID(),
      userId: DEMO_USER_ID,
      connectionStatus: status.connectionStatus,
      activeRoute: status.activeRoute,
      speedMbps: status.speedMbps,
      latencyMs: status.latencyMs,
      riskState: status.riskState,
      timestamp: status.updatedAt,
    })
    .run();

  console.log(
    `[db] network_logs inserted: status=${status.connectionStatus} route=${status.activeRoute} timestamp=${status.updatedAt}`,
  );
}

export function getRecentNetworkLogs(userId = DEMO_USER_ID): ConnectivityHistoryEntry[] {
  return getDb()
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
    .limit(MAX_PATTERN_LOGS)
    .all()
    .reverse();
}
