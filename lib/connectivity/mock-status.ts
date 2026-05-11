import type { ConnectivityStatus } from "@/lib/connectivity/types";

export function createSeedConnectivityStatus(): ConnectivityStatus {
  const now = new Date().toISOString();

  return {
    connectionStatus: "degraded",
    activeRoute: "primary",
    primaryConnection: {
      name: "WiFi Utama Toko",
      kind: "wifi",
      status: "degraded",
    },
    backupConnection: {
      name: "Hotspot HP Cadangan",
      kind: "phone_hotspot",
      status: "ready",
    },
    speedMbps: 12,
    latencyMs: 180,
    riskState: "warning",
    businessImpact: {
      savedRevenue: 1850000,
      riskRevenue: 500000,
      protectedOrders: 61,
    },
    chartValues: [91, 88, 86, 83, 78, 75, 72, 70, 69, 68, 71, 72],
    latestSwitchEvent: {
      result: "prepared_backup",
      activeRouteAfter: "primary",
      durationMs: 0,
      message: "Jalur cadangan siap mengambil alih otomatis.",
      timestamp: now,
    },
    riskInsight: {
      title: "Jam rawan koneksi melambat",
      message: "Belum ada pola berulang. AI mulai belajar dari update koneksi terbaru.",
      peakHours: [],
      riskUpdateCount: 0,
      totalUpdateCount: 0,
      generatedAt: now,
    },
    updatedAt: now,
  };
}
