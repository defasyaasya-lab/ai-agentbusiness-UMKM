"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BellRing,
  CheckCircle2,
  CircleDollarSign,
  MessageCircle,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  Store,
  Wifi,
  Zap,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AppNav } from "@/components/app-nav";
import { toDashboardView, type DashboardView } from "@/lib/connectivity/dashboard-adapter";
import { createSeedConnectivityStatus } from "@/lib/connectivity/mock-status";
import type { ConnectivityStatus } from "@/lib/connectivity/types";
import {
  fallbackStoreProfile,
  type StoreProfile,
} from "@/lib/profile/types";
import { cn, formatRupiah } from "@/lib/utils";

function formatShortRupiah(value: number) {
  if (value >= 1000000) {
    const millionValue = value / 1000000;
    const formatted = Number.isInteger(millionValue)
      ? String(millionValue)
      : millionValue.toFixed(1).replace(".", ",");
    return `Rp${formatted} jt`;
  }

  if (value >= 1000) {
    return `Rp${Math.round(value / 1000)} rb`;
  }

  return formatRupiah(value);
}

function businessImpactFromProfile(profile: StoreProfile) {
  return {
    savedRevenue: Math.round(profile.estimatedDailyRevenue * 0.22),
    riskRevenue: Math.round(profile.estimatedDailyRevenue * 0.06),
  };
}

function statusBadgeClass(scenario: DashboardView["id"]) {
  if (scenario === "safe") {
    return "premium-status-badge border-cyan-200 bg-cyan-50 text-cyan-800 shadow-cyan-500/20";
  }
  if (scenario === "warning") {
    return "premium-status-badge border-orange-200 bg-orange-50 text-orange-800 shadow-orange-500/20";
  }
  if (scenario === "switching") {
    return "premium-status-badge border-rose-200 bg-rose-50 text-rose-800 shadow-rose-500/20";
  }

  return "premium-status-badge border-blue-200 bg-blue-50 text-blue-800 shadow-blue-500/20";
}

function toneIconClass(scenario: DashboardView["id"]) {
  if (scenario === "safe") return "text-cyan-700";
  if (scenario === "warning") return "text-orange-700";
  if (scenario === "switching") return "text-rose-700";
  return "text-blue-700";
}

function TrendChart({
  values,
  color,
  fill,
}: {
  values: number[];
  color: string;
  fill: string;
}) {
  const width = 520;
  const height = 132;
  const padding = 10;
  const min = 30;
  const max = 100;
  const points = values.map((value, index) => {
    const x = padding + (index / (values.length - 1)) * (width - padding * 2);
    const normalized = (value - min) / (max - min);
    const y = height - padding - normalized * (height - padding * 2);
    return [x, y] as const;
  });
  const linePath = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
  const areaPath = `${linePath} L ${width - padding} ${height - padding} L ${padding} ${
    height - padding
  } Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-24 w-full xl:h-16 2xl:h-24"
      role="img"
      aria-label="Tren kelancaran toko hari ini"
    >
      <defs>
        <linearGradient id="chartFade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      {[0, 1, 2].map((line) => (
        <line
          key={line}
          x1={padding}
          x2={width - padding}
          y1={padding + line * 40}
          y2={padding + line * 40}
          stroke="#e2e8f0"
          strokeDasharray="5 7"
          strokeWidth="1"
        />
      ))}
      <path d={areaPath} fill="url(#chartFade)" className="premium-chart-area" />
      <path
        d={linePath}
        fill="none"
        pathLength={1}
        stroke={color}
        strokeLinecap="round"
        strokeWidth="4"
        className="premium-chart-line"
      />
      {points.map(([x, y], index) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={index === points.length - 1 ? 5 : 3}
          fill="#ffffff"
          stroke={color}
          strokeWidth="3"
          className="premium-chart-point"
          style={{ animationDelay: `${index * 45}ms` }}
        />
      ))}
    </svg>
  );
}

function TimelineIcon({ type }: { type: DashboardView["timeline"][number]["icon"] }) {
  const className = "h-4 w-4";
  if (type === "check") return <CheckCircle2 className={className} />;
  if (type === "warn") return <BellRing className={className} />;
  if (type === "switch") return <RefreshCw className={className} />;
  return <MessageCircle className={className} />;
}

function StatusIcon({ scenario }: { scenario: DashboardView["id"] }) {
  if (scenario === "backup") return <RadioTower className="h-5 w-5" />;
  if (scenario === "switching") return <Zap className="h-5 w-5" />;
  if (scenario === "warning") return <BellRing className="h-5 w-5" />;
  return <ShieldCheck className="h-5 w-5" />;
}

function useConnectivityDashboardData() {
  const [data, setData] = useState<DashboardView>(() =>
    toDashboardView(createSeedConnectivityStatus()),
  );

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      try {
        const response = await fetch(`/api/connectivity/status?ts=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (!response.ok) return;

        const status = (await response.json()) as ConnectivityStatus;
        if (active) {
          setData(toDashboardView(status));
        }
      } catch {
        // Keep the seeded mock view if the backend mock service is unavailable.
      }
    }

    void loadStatus();
    const interval = window.setInterval(loadStatus, 1000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return data;
}

function useStoreProfile() {
  const [profile, setProfile] = useState<StoreProfile>(fallbackStoreProfile);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await fetch(`/api/profile?ts=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (!response.ok) return;

        const nextProfile = (await response.json()) as StoreProfile;
        if (active) {
          setProfile(nextProfile);
        }
      } catch {
        // Keep fallback profile when the local backend is unavailable.
      }
    }

    void loadProfile();
    const interval = window.setInterval(loadProfile, 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return profile;
}

export function BusinessGuardianDashboard() {
  const data = useConnectivityDashboardData();
  const profile = useStoreProfile();
  const businessImpact = businessImpactFromProfile(profile);
  const summaryCards = [
    { label: "Pesanan terlindungi", value: String(data.protectedOrders), helper: "order tetap aman" },
    {
      label: "Target omzet",
      value: formatShortRupiah(profile.estimatedDailyRevenue),
      helper: "hari ini",
    },
    { label: "Cadangan siap", value: "24 dtk", helper: "estimasi pindah jalur" },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_12%_8%,rgba(34,211,238,0.24),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(168,85,247,0.20),transparent_32%),radial-gradient(circle_at_76%_86%,rgba(251,146,60,0.16),transparent_34%),linear-gradient(135deg,#f8fbff_0%,#eef4ff_42%,#f7f3ff_100%)] xl:h-screen xl:overflow-hidden">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8 xl:h-screen xl:gap-2 xl:py-3 2xl:gap-3 2xl:py-4">
        <header className="premium-enter premium-card flex shrink-0 flex-col gap-3 rounded-xl p-4 lg:flex-row lg:items-center lg:justify-between xl:p-3 2xl:p-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="premium-icon-glow flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-950 via-indigo-900 to-cyan-600 text-white shadow-[0_14px_38px_rgba(14,165,233,0.28)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">AI Agent Business Guardian</p>
              <h1 className="max-w-full break-words text-xl font-semibold leading-tight tracking-normal text-slate-950 [overflow-wrap:anywhere] sm:text-2xl">
                Dashboard Konektivitas Toko
              </h1>
              <p className="mt-1 max-w-2xl break-words text-sm leading-5 text-muted-foreground">
                {profile.storeName} tetap menerima pesanan, pembayaran, dan chat pembeli.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <AppNav />
            <Badge
              variant={data.badgeVariant}
              className={cn("w-fit px-3 py-2 text-sm", statusBadgeClass(data.id))}
            >
              <span className="mr-2 flex items-center">
                <StatusIcon scenario={data.id} />
              </span>
              {data.statusLabel}
            </Badge>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="grid min-h-0 gap-3 xl:grid-rows-[auto_auto_1fr]">
            <Card className="premium-enter premium-enter-delay-1 premium-card premium-card-hover overflow-hidden rounded-xl border-cyan-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(224,242,254,0.68)_48%,rgba(243,232,255,0.62))]">
              <CardContent className="p-5 xl:p-4 2xl:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-cyan-800">
                      <CircleDollarSign className="h-5 w-5" />
                      Omzet Diselamatkan Hari Ini
                    </div>
                    <p className="mt-2 bg-gradient-to-r from-slate-950 via-indigo-900 to-cyan-700 bg-clip-text text-5xl font-semibold leading-none text-transparent sm:text-6xl xl:text-5xl 2xl:text-6xl">
                      {formatRupiah(businessImpact.savedRevenue)}
                    </p>
                    <p className="mt-3 text-sm leading-5 text-slate-700">
                      {data.reassurance} {data.protectedOrders} pesanan tetap terlindungi.
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/70 bg-white/70 p-3 text-sm text-slate-800 shadow-[0_14px_32px_rgba(15,23,42,0.08)] backdrop-blur">
                    <p className="font-semibold">Risiko dicegah</p>
                    <p className="mt-1 text-2xl font-semibold text-orange-700">
                      {formatRupiah(businessImpact.riskRevenue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert
              variant={data.alertVariant}
              className="premium-enter premium-enter-delay-2 shrink-0 rounded-xl border-white/70 bg-white/75 text-slate-900 shadow-[0_16px_46px_rgba(15,23,42,0.10)] backdrop-blur-xl"
            >
              <StatusIcon scenario={data.id} />
              <AlertTitle>{data.businessStatus}</AlertTitle>
              <AlertDescription>{data.plainSummary}</AlertDescription>
            </Alert>

            <div className="grid min-h-0 gap-3 sm:grid-cols-3 xl:gap-2 2xl:gap-3">
              <Card className="premium-enter premium-enter-delay-2 premium-card premium-card-hover rounded-xl">
                <CardContent className="p-4 xl:p-3 2xl:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-muted-foreground">Kecepatan internet</p>
                    <Wifi className="premium-wifi-pulse h-5 w-5 text-cyan-700" />
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{data.speedLabel}</p>
                  <p className="mt-1 text-4xl font-semibold text-cyan-800 xl:text-3xl 2xl:text-4xl">{data.speedMbps} Mbps</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{data.speedHelper}</p>
                </CardContent>
              </Card>

              <Card className="premium-enter premium-enter-delay-2 premium-card premium-card-hover rounded-xl">
                <CardContent className="p-4 xl:p-3 2xl:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-muted-foreground">Kesiapan toko</p>
                    <Store className="h-5 w-5 text-orange-700" />
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-4xl font-semibold text-orange-800 xl:text-3xl 2xl:text-4xl">
                      {data.healthScore}
                    </span>
                    <span className="pb-1 text-sm text-muted-foreground">/100</span>
                  </div>
                  <Progress value={data.healthScore} className="mt-4" />
                  <p className="mt-2 text-xs text-muted-foreground">Siap jualan, sedang dipantau AI.</p>
                </CardContent>
              </Card>

              <Card className="premium-enter premium-enter-delay-2 premium-card premium-card-hover rounded-xl">
                <CardContent className="p-4 xl:p-3 2xl:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-muted-foreground">Jalur aktif</p>
                    {data.activeConnection === "Cadangan" ? (
                      <RadioTower className="premium-wifi-pulse h-5 w-5 text-blue-700" />
                    ) : data.activeConnection === "Sedang pindah" ? (
                      <RefreshCw className="h-5 w-5 animate-spin text-rose-700 [animation-duration:2.4s]" />
                    ) : (
                      <Wifi className="premium-wifi-pulse h-5 w-5 text-cyan-700" />
                    )}
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {data.activeConnection}
                  </p>
                  <p className="mt-2 text-sm leading-5 text-muted-foreground">{data.action}</p>
                  <Badge
                    variant={data.badgeVariant}
                    className={cn("mt-3", statusBadgeClass(data.id))}
                  >
                    otomatis
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid min-h-0 gap-3 xl:grid-rows-[auto_1fr_auto]">
            <Card className="premium-enter premium-enter-delay-1 premium-card premium-card-hover rounded-xl">
              <CardHeader className="p-4 pb-2 xl:p-3 xl:pb-1 2xl:p-4 2xl:pb-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Aksi otomatis AI</CardTitle>
                    <CardDescription>Yang terjadi tanpa menunggu persetujuan.</CardDescription>
                  </div>
                  <Badge
                    variant={data.badgeVariant}
                    className={statusBadgeClass(data.id)}
                  >
                    {data.statusLabel}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-2 p-4 pt-0 xl:gap-1.5 xl:p-3 xl:pt-0 2xl:gap-2 2xl:p-4 2xl:pt-0">
                {data.timeline.map((event) => (
                  <div
                    key={`${event.time}-${event.title}`}
                    className="group flex gap-3 rounded-xl border border-white/70 bg-white/60 p-3 shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-[0_16px_42px_rgba(15,23,42,0.11)] xl:p-2.5 2xl:p-3"
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white shadow-[0_10px_22px_rgba(15,23,42,0.08)] transition-transform duration-300 group-hover:scale-105 xl:h-8 xl:w-8 2xl:h-9 2xl:w-9",
                        toneIconClass(data.id),
                      )}
                    >
                      <TimelineIcon type={event.icon} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="font-semibold leading-5 text-slate-950">{event.title}</p>
                        <span className="text-xs font-medium text-muted-foreground">{event.time}</span>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">{event.detail}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="premium-enter premium-enter-delay-2 premium-card premium-card-hover min-h-0 overflow-hidden rounded-xl">
              <CardHeader className="p-4 pb-1 xl:p-3 xl:pb-1 2xl:p-4 2xl:pb-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Tren kelancaran toko</CardTitle>
                    <CardDescription>Untuk melihat jualan tetap lancar.</CardDescription>
                  </div>
                  <Activity className="premium-wifi-pulse h-5 w-5 text-cyan-700" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 xl:p-3 xl:pt-0 2xl:p-4 2xl:pt-0">
                <TrendChart values={data.chartValues} color={data.chartColor} fill={data.chartFill} />
                <div className="grid gap-2 sm:grid-cols-3">
                  {summaryCards.map((item, index) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-white/70 bg-white/60 p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/90 xl:p-2.5 2xl:p-3"
                    >
                      <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">
                        {item.value}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.helper}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="premium-enter premium-enter-delay-3 flex items-start gap-3 rounded-xl border border-cyan-100/80 bg-white/70 px-4 py-3 text-sm text-slate-800 shadow-[0_16px_48px_rgba(14,165,233,0.12)] backdrop-blur-xl xl:px-3 xl:py-2 xl:text-xs 2xl:px-4 2xl:py-3 2xl:text-sm">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
              <div className="min-w-0 leading-5">
                <p>
                  Telegram: {data.businessStatus}. Omzet terlindungi {formatRupiah(businessImpact.savedRevenue)}.
                </p>
                <p className="text-xs font-medium text-indigo-800">
                  {data.riskInsightTitle}: {data.riskInsightMessage}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
