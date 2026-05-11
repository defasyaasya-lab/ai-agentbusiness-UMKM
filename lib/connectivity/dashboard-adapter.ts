import type { ConnectivityStatus } from "@/lib/connectivity/types";

export type DashboardScenario = "safe" | "warning" | "switching" | "backup";
export type DashboardTone = "success" | "warning" | "danger" | "info";

export type DashboardTimelineIcon = "check" | "warn" | "switch" | "telegram";

export type DashboardView = {
  id: DashboardScenario;
  statusLabel: string;
  businessStatus: string;
  plainSummary: string;
  action: string;
  reassurance: string;
  speedLabel: "Cepat" | "Melambat" | "Tidak Stabil";
  speedMbps: number;
  latencyMs: number;
  speedHelper: string;
  healthScore: number;
  savedRevenue: number;
  riskRevenue: number;
  protectedOrders: number;
  activeConnection: "Utama" | "Cadangan" | "Sedang pindah";
  alertVariant: DashboardTone;
  badgeVariant: DashboardTone;
  chartColor: string;
  chartFill: string;
  chartValues: number[];
  riskInsightTitle: string;
  riskInsightMessage: string;
  timeline: {
    time: string;
    title: string;
    detail: string;
    icon: DashboardTimelineIcon;
  }[];
};

function toScenario(status: ConnectivityStatus): DashboardScenario {
  if (status.connectionStatus === "online") return "safe";
  if (status.connectionStatus === "backup") return "backup";
  if (status.connectionStatus === "switching" || status.connectionStatus === "offline") {
    return "switching";
  }
  return "warning";
}

function speedLabel(speedMbps: number, scenario: DashboardScenario) {
  if (scenario === "switching" || speedMbps <= 5) return "Tidak Stabil";
  if (speedMbps < 20) return "Melambat";
  return "Cepat";
}

function healthScore(status: ConnectivityStatus, scenario: DashboardScenario) {
  if (scenario === "safe") return 96;
  if (scenario === "backup") return 84;
  if (scenario === "switching") return Math.max(45, Math.min(68, 100 - status.latencyMs / 5));
  return Math.max(60, Math.min(76, 100 - status.latencyMs / 6));
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "baru saja";

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const scenarioCopy: Record<
  DashboardScenario,
  Pick<
    DashboardView,
    | "statusLabel"
    | "businessStatus"
    | "plainSummary"
    | "action"
    | "reassurance"
    | "alertVariant"
    | "badgeVariant"
    | "chartColor"
    | "chartFill"
  >
> = {
  safe: {
    statusLabel: "Aman",
    businessStatus: "Toko berjalan normal",
    plainSummary: "Pesanan, QRIS, chat pembeli, dan live tetap lancar.",
    action: "AI menjaga toko tetap online",
    reassurance: "Tidak perlu tindakan dari pemilik toko.",
    alertVariant: "success",
    badgeVariant: "success",
    chartColor: "#0891b2",
    chartFill: "rgba(34, 211, 238, 0.18)",
  },
  warning: {
    statusLabel: "Waspada",
    businessStatus: "Penjualan masih jalan, tapi koneksi melemah",
    plainSummary:
      "AI sudah menyiapkan cadangan sebelum pembeli gagal bayar atau live tersendat.",
    action: "AI menyiapkan jalur cadangan",
    reassurance: "Pemilik toko bisa tetap fokus melayani pembeli.",
    alertVariant: "warning",
    badgeVariant: "warning",
    chartColor: "#f59e0b",
    chartFill: "rgba(251, 146, 60, 0.18)",
  },
  switching: {
    statusLabel: "Switching",
    businessStatus: "AI sedang memindahkan toko ke cadangan",
    plainSummary:
      "Pembeli diarahkan ke jalur yang lebih aman agar checkout dan chat tetap berjalan.",
    action: "AI memindahkan jalur otomatis",
    reassurance: "Perpindahan berjalan tanpa menunggu persetujuan.",
    alertVariant: "danger",
    badgeVariant: "danger",
    chartColor: "#ef4444",
    chartFill: "rgba(248, 113, 113, 0.16)",
  },
  backup: {
    statusLabel: "Backup Aktif",
    businessStatus: "Toko berhasil tetap online",
    plainSummary:
      "Pesanan, pembayaran, dan chat pembeli berjalan lewat jalur cadangan.",
    action: "AI menjaga toko lewat cadangan",
    reassurance: "Jalur utama dipantau sampai aman dipakai kembali.",
    alertVariant: "info",
    badgeVariant: "info",
    chartColor: "#2563eb",
    chartFill: "rgba(59, 130, 246, 0.18)",
  },
};

function speedHelper(status: ConnectivityStatus, scenario: DashboardScenario) {
  if (scenario === "safe") return "Cukup untuk live, checkout, dan chat pembeli.";
  if (scenario === "backup") return "Cadangan cukup kuat untuk transaksi dan live ringan.";
  if (scenario === "switching") return "AI sedang mengamankan jalur jualan.";
  return "Live masih jalan, tetapi mulai berisiko tersendat.";
}

function activeConnection(status: ConnectivityStatus, scenario: DashboardScenario) {
  if (scenario === "switching") return "Sedang pindah";
  return status.activeRoute === "backup" ? "Cadangan" : "Utama";
}

function timeline(status: ConnectivityStatus, scenario: DashboardScenario): DashboardView["timeline"] {
  const time = formatTime(status.latestSwitchEvent.timestamp);

  if (scenario === "safe") {
    return [
      {
        time,
        title: "Toko aman",
        detail: "AI menerima status koneksi normal dari layanan backend.",
        icon: "check",
      },
      {
        time,
        title: "WiFi utama dipakai",
        detail: `${status.primaryConnection.name} menjaga transaksi harian.`,
        icon: "check",
      },
      {
        time,
        title: "Hotspot siap",
        detail: `${status.backupConnection.name} tersedia jika dibutuhkan.`,
        icon: "telegram",
      },
    ];
  }

  if (scenario === "backup") {
    return [
      {
        time,
        title: "Gangguan dicegah",
        detail: "AI bertindak saat jam jualan ramai.",
        icon: "warn",
      },
      {
        time,
        title: "Hotspot cadangan aktif",
        detail: status.latestSwitchEvent.message,
        icon: "switch",
      },
      {
        time,
        title: "Omzet terlindungi",
        detail: "Potensi kerugian berhasil ditekan.",
        icon: "telegram",
      },
    ];
  }

  if (scenario === "switching") {
    return [
      {
        time,
        title: "Jalur aman dipilih",
        detail: "Transaksi baru tidak lagi bergantung penuh pada WiFi utama.",
        icon: "warn",
      },
      {
        time,
        title: "Perpindahan berjalan",
        detail: status.latestSwitchEvent.message,
        icon: "switch",
      },
      {
        time,
        title: "Telegram dikirim",
        detail: "Pemilik tahu AI sedang bekerja.",
        icon: "telegram",
      },
    ];
  }

  return [
    {
      time,
      title: "Tanda melambat terlihat",
      detail: `AI menerima status ${status.primaryConnection.name} mulai melemah.`,
      icon: "warn",
    },
    {
      time,
      title: "Cadangan disiapkan",
      detail: status.latestSwitchEvent.message,
      icon: "switch",
    },
    {
      time,
      title: "Pemilik diberi kabar",
      detail: "Telegram dikirim dengan bahasa singkat.",
      icon: "telegram",
    },
  ];
}

export function toDashboardView(status: ConnectivityStatus): DashboardView {
  const scenario = toScenario(status);
  const copy = scenarioCopy[scenario];
  const label = speedLabel(status.speedMbps, scenario);

  return {
    id: scenario,
    ...copy,
    speedLabel: label,
    speedMbps: status.speedMbps,
    latencyMs: status.latencyMs,
    speedHelper: speedHelper(status, scenario),
    healthScore: Math.round(healthScore(status, scenario)),
    savedRevenue: status.businessImpact.savedRevenue,
    riskRevenue: status.businessImpact.riskRevenue,
    protectedOrders: status.businessImpact.protectedOrders,
    activeConnection: activeConnection(status, scenario),
    chartValues: status.chartValues,
    riskInsightTitle: status.riskInsight.title,
    riskInsightMessage: status.riskInsight.message,
    timeline: timeline(status, scenario),
  };
}
