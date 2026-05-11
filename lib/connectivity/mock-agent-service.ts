import {
  getConnectivityState,
  getRecentNetworkLogs,
  insertNetworkLog,
  upsertConnectivityState,
} from "@/lib/db/connectivity-repository";
import type {
  ActiveRoute,
  ConnectionStatus,
  ConnectivityStatus,
  ConnectivityStatusUpdate,
  RiskPatternInsight,
  RiskState,
  SwitchEvent,
  SwitchEventUpdate,
} from "@/lib/connectivity/types";

const RISK_STATUSES: ConnectionStatus[] = ["degraded", "offline", "switching"];

function cloneStatus(status: ConnectivityStatus): ConnectivityStatus {
  return {
    ...status,
    primaryConnection: { ...status.primaryConnection },
    backupConnection: { ...status.backupConnection },
    businessImpact: { ...status.businessImpact },
    chartValues: [...status.chartValues],
    latestSwitchEvent: { ...status.latestSwitchEvent },
    riskInsight: {
      ...status.riskInsight,
      peakHours: [...status.riskInsight.peakHours],
    },
  };
}

function logState(message: string, status: ConnectivityStatus) {
  console.log(
    `[connectivity] ${message}: connectionStatus=${status.connectionStatus} riskState=${status.riskState} speedMbps=${status.speedMbps} activeRoute=${status.activeRoute} updatedAt=${status.updatedAt}`,
  );
}

function emptyRiskInsight(now = new Date().toISOString()): RiskPatternInsight {
  return {
    title: "Jam rawan koneksi melambat",
    message: "Belum ada pola berulang. AI mulai belajar dari update koneksi terbaru.",
    peakHours: [],
    riskUpdateCount: 0,
    totalUpdateCount: 0,
    generatedAt: now,
  };
}

function ensureStatusShape(status: ConnectivityStatus): ConnectivityStatus {
  if (!status.riskInsight) {
    return {
      ...status,
      riskInsight: emptyRiskInsight(status.updatedAt),
    };
  }

  return {
    ...status,
    riskInsight: {
      ...emptyRiskInsight(status.riskInsight.generatedAt),
      ...status.riskInsight,
      peakHours: status.riskInsight.peakHours ?? [],
    },
  };
}

function getJakartaHour(timestamp: string): number | undefined {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return undefined;

  const hourText = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(date);
  const hour = Number(hourText);
  return Number.isFinite(hour) ? hour : undefined;
}

function hourRangeLabel(hour: number) {
  const nextHour = (hour + 1) % 24;
  return `${String(hour).padStart(2, "0")}.00-${String(nextHour).padStart(2, "0")}.00`;
}

async function analyzeRiskPattern(): Promise<RiskPatternInsight> {
  const now = new Date().toISOString();
  const history = await getRecentNetworkLogs();
  const riskEntries = history.filter((entry) =>
    RISK_STATUSES.includes(entry.connectionStatus),
  );

  if (riskEntries.length === 0) {
    return {
      ...emptyRiskInsight(now),
      totalUpdateCount: history.length,
    };
  }

  const countsByHour = new Map<number, number>();
  for (const entry of riskEntries) {
    const hour = getJakartaHour(entry.timestamp);
    if (hour === undefined) continue;
    countsByHour.set(hour, (countsByHour.get(hour) ?? 0) + 1);
  }

  const rankedHours = [...countsByHour.entries()]
    .sort((left, right) => right[1] - left[1] || left[0] - right[0])
    .slice(0, 2)
    .map(([hour]) => hourRangeLabel(hour));

  const message =
    rankedHours.length > 0
      ? `Jam rawan koneksi melambat terdeteksi sekitar ${rankedHours.join(" dan ")}. Siapkan hotspot sebelum jam ini.`
      : "Jam rawan belum cukup jelas, tetapi AI sudah menyimpan pola gangguan terbaru.";

  return {
    title: "Jam rawan koneksi melambat",
    message,
    peakHours: rankedHours,
    riskUpdateCount: riskEntries.length,
    totalUpdateCount: history.length,
    generatedAt: now,
  };
}

async function getStore(): Promise<ConnectivityStatus> {
  return ensureStatusShape(await getConnectivityState());
}

export async function getConnectivityStatus(): Promise<ConnectivityStatus> {
  const current = await getStore();
  current.riskInsight = await analyzeRiskPattern();
  await upsertConnectivityState(current);

  const status = cloneStatus(current);
  logState("GET current state", status);
  return status;
}

type AgentStatusAliasPayload = ConnectivityStatusUpdate & {
  status?: ConnectionStatus;
  risk?: RiskState;
  speed?: number;
  latency?: number;
};

function normalizeConnectivityUpdate(
  update: AgentStatusAliasPayload,
): ConnectivityStatusUpdate {
  const normalized: ConnectivityStatusUpdate = {
    ...update,
    primaryConnection: update.primaryConnection
      ? { ...update.primaryConnection }
      : undefined,
    backupConnection: update.backupConnection
      ? { ...update.backupConnection }
      : undefined,
    businessImpact: update.businessImpact ? { ...update.businessImpact } : undefined,
    latestSwitchEvent: update.latestSwitchEvent
      ? { ...update.latestSwitchEvent }
      : undefined,
    chartValues: update.chartValues ? [...update.chartValues] : undefined,
  };

  if (update.status) {
    normalized.connectionStatus = update.status;
  }

  if (update.risk) {
    normalized.riskState = update.risk;
  }

  if (typeof update.speed === "number") {
    normalized.speedMbps = update.speed;
  }

  if (typeof update.latency === "number") {
    normalized.latencyMs = update.latency;
  }

  if (normalized.connectionStatus && !normalized.primaryConnection?.status) {
    normalized.primaryConnection = {
      ...normalized.primaryConnection,
      status:
        normalized.connectionStatus === "online"
          ? "online"
          : normalized.connectionStatus === "offline"
            ? "offline"
            : "degraded",
    };
  }

  if (normalized.activeRoute && !normalized.backupConnection?.status) {
    normalized.backupConnection = {
      ...normalized.backupConnection,
      status: normalized.activeRoute === "backup" ? "active" : "ready",
    };
  }

  return normalized;
}

function cleanConnectivityUpdate(
  update: ConnectivityStatusUpdate,
): ConnectivityStatusUpdate {
  const cleaned: ConnectivityStatusUpdate = {};

  if (update.connectionStatus !== undefined) cleaned.connectionStatus = update.connectionStatus;
  if (update.activeRoute !== undefined) cleaned.activeRoute = update.activeRoute;
  if (update.speedMbps !== undefined) cleaned.speedMbps = update.speedMbps;
  if (update.latencyMs !== undefined) cleaned.latencyMs = update.latencyMs;
  if (update.riskState !== undefined) cleaned.riskState = update.riskState;
  if (update.chartValues !== undefined) cleaned.chartValues = update.chartValues;
  if (update.primaryConnection !== undefined) cleaned.primaryConnection = update.primaryConnection;
  if (update.backupConnection !== undefined) cleaned.backupConnection = update.backupConnection;
  if (update.businessImpact !== undefined) cleaned.businessImpact = update.businessImpact;
  if (update.latestSwitchEvent !== undefined) cleaned.latestSwitchEvent = update.latestSwitchEvent;
  if (update.riskInsight !== undefined) cleaned.riskInsight = update.riskInsight;

  return cleaned;
}

export async function updateConnectivityStatus(
  update: AgentStatusAliasPayload,
): Promise<ConnectivityStatus> {
  const current = await getStore();
  const now = new Date().toISOString();
  const normalizedUpdate = cleanConnectivityUpdate(normalizeConnectivityUpdate(update));
  const latestSwitchEvent = normalizedUpdate.latestSwitchEvent
    ? {
        ...current.latestSwitchEvent,
        ...normalizedUpdate.latestSwitchEvent,
        timestamp: normalizedUpdate.latestSwitchEvent.timestamp ?? now,
      }
    : current.latestSwitchEvent;

  const nextState: ConnectivityStatus = {
    ...current,
    ...normalizedUpdate,
    primaryConnection: {
      ...current.primaryConnection,
      ...normalizedUpdate.primaryConnection,
    },
    backupConnection: {
      ...current.backupConnection,
      ...normalizedUpdate.backupConnection,
    },
    businessImpact: {
      ...current.businessImpact,
      ...normalizedUpdate.businessImpact,
    },
    latestSwitchEvent,
    riskInsight: current.riskInsight,
    chartValues: normalizedUpdate.chartValues
      ? [...normalizedUpdate.chartValues]
      : current.chartValues,
    updatedAt: now,
  };

  await insertNetworkLog(nextState);
  nextState.riskInsight = await analyzeRiskPattern();
  await upsertConnectivityState(nextState);

  logState("POST merged shared state", nextState);
  return cloneStatus(nextState);
}

function statusFromSwitchEvent(
  result: SwitchEvent["result"],
  routeAfter: ActiveRoute,
  fallbackStatus: ConnectionStatus,
): ConnectionStatus {
  if (result === "switch_started") return "switching";
  if (result === "switch_success") return routeAfter === "backup" ? "backup" : "online";
  if (result === "switch_failed") return "degraded";
  if (result === "prepared_backup") return "degraded";
  return fallbackStatus;
}

export async function recordSwitchEvent(
  update: SwitchEventUpdate,
): Promise<ConnectivityStatus> {
  const current = await getStore();
  const now = new Date().toISOString();
  const activeRouteAfter = update.activeRouteAfter ?? current.activeRoute;
  const result = update.result ?? current.latestSwitchEvent.result;

  return updateConnectivityStatus({
    activeRoute: activeRouteAfter,
    connectionStatus: statusFromSwitchEvent(
      result,
      activeRouteAfter,
      current.connectionStatus,
    ),
    primaryConnection: {
      status: activeRouteAfter === "primary" ? "degraded" : "degraded",
    },
    backupConnection: {
      status: activeRouteAfter === "backup" ? "active" : "ready",
    },
    latestSwitchEvent: {
      result,
      activeRouteAfter,
      durationMs: update.durationMs ?? current.latestSwitchEvent.durationMs,
      message: update.message ?? current.latestSwitchEvent.message,
      timestamp: update.timestamp ?? now,
    },
  });
}
