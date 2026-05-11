"use client";

import { useMemo, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  Clock3,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageShell } from "@/components/page-shell";
import { formatRupiah } from "@/lib/utils";

type IncidentStatus = "dicegah" | "cadangan" | "dipantau";

type Incident = {
  id: string;
  timestamp: string;
  duration: string;
  diagnosis: string;
  action: string;
  impactPrevented: number;
  status: IncidentStatus;
};

const incidents: Incident[] = [
  {
    id: "INC-1042",
    timestamp: "Hari ini, 14:02",
    duration: "8 menit",
    diagnosis: "Koneksi mulai melemah saat live berlangsung.",
    action: "AI menyiapkan jalur cadangan dan mengirim Telegram.",
    impactPrevented: 500000,
    status: "dicegah",
  },
  {
    id: "INC-1041",
    timestamp: "Kemarin, 19:21",
    duration: "24 detik",
    diagnosis: "Jalur utama tidak stabil saat pesanan ramai.",
    action: "AI memindahkan toko ke internet cadangan.",
    impactPrevented: 950000,
    status: "cadangan",
  },
  {
    id: "INC-1039",
    timestamp: "7 Mei, 11:40",
    duration: "3 menit",
    diagnosis: "Pembayaran QRIS sempat melambat.",
    action: "AI menaikkan pemantauan dan memberi kabar singkat.",
    impactPrevented: 275000,
    status: "dipantau",
  },
  {
    id: "INC-1036",
    timestamp: "5 Mei, 20:12",
    duration: "11 menit",
    diagnosis: "Live seller berisiko tersendat saat traffic pembeli naik.",
    action: "AI mengaktifkan cadangan lebih awal.",
    impactPrevented: 1250000,
    status: "cadangan",
  },
];

const filters: Array<{ label: string; value: "semua" | IncidentStatus }> = [
  { label: "Semua", value: "semua" },
  { label: "Dicegah", value: "dicegah" },
  { label: "Cadangan", value: "cadangan" },
  { label: "Dipantau", value: "dipantau" },
];

const statusMeta: Record<
  IncidentStatus,
  { label: string; variant: "success" | "info" | "warning"; icon: typeof CheckCircle2 }
> = {
  dicegah: {
    label: "Gangguan dicegah",
    variant: "success",
    icon: ShieldCheck,
  },
  cadangan: {
    label: "Cadangan aktif",
    variant: "info",
    icon: RefreshCw,
  },
  dipantau: {
    label: "Dipantau AI",
    variant: "warning",
    icon: BellRing,
  },
};

export function IncidentHistoryPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("semua");

  const visibleIncidents = useMemo(() => {
    if (filter === "semua") return incidents;
    return incidents.filter((incident) => incident.status === filter);
  }, [filter]);

  const totalPrevented = visibleIncidents.reduce(
    (total, incident) => total + incident.impactPrevented,
    0,
  );

  return (
    <PageShell
      title="Riwayat Gangguan"
      description="Catatan kejadian yang mudah dibaca: kapan terjadi, apa dampaknya, dan bagaimana AI menjaga omzet."
      aside={
        <Badge variant="success" className="premium-status-badge w-fit">
          {formatRupiah(totalPrevented)} terlindungi
        </Badge>
      }
    >
      <section className="grid gap-3 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="grid gap-3">
          <Card className="premium-enter premium-enter-delay-1 premium-card premium-card-hover overflow-hidden rounded-xl border-cyan-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.84),rgba(224,242,254,0.64)_48%,rgba(243,232,255,0.58))]">
            <CardHeader className="p-4 pb-2">
              <CardTitle>Ringkasan bulan ini</CardTitle>
              <CardDescription>Untuk cepat melihat dampak ke bisnis.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 pt-0">
              <div className="rounded-xl border border-white/70 bg-white/70 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-800">
                  <WalletCards className="h-4 w-4" />
                  Omzet yang dijaga
                </div>
                <p className="mt-2 bg-gradient-to-r from-slate-950 via-indigo-900 to-cyan-700 bg-clip-text text-3xl font-semibold text-transparent">
                  {formatRupiah(totalPrevented)}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Dari {visibleIncidents.length} kejadian terpilih.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/70 bg-white/60 p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur">
                  <p className="text-xs text-muted-foreground">Auto-action</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">100%</p>
                  <p className="text-xs text-muted-foreground">tanpa menunggu pemilik</p>
                </div>
                <div className="rounded-xl border border-white/70 bg-white/60 p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur">
                  <p className="text-xs text-muted-foreground">Kabar Telegram</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">4x</p>
                  <p className="text-xs text-muted-foreground">dikirim otomatis</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-enter premium-enter-delay-2 premium-card premium-card-hover rounded-xl">
            <CardHeader className="p-4 pb-2">
              <CardTitle>Filter cepat</CardTitle>
              <CardDescription>Pilih jenis kejadian yang ingin dilihat.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 p-4 pt-0">
              {filters.map((item) => (
                <Button
                  key={item.value}
                  size="sm"
                  variant={filter === item.value ? "default" : "outline"}
                  className={
                    filter === item.value
                      ? "bg-gradient-to-r from-cyan-700 to-blue-700 text-white shadow-[0_12px_30px_rgba(14,165,233,0.24)] hover:from-cyan-800 hover:to-blue-800"
                      : "border-white/70 bg-white/70 text-slate-700 backdrop-blur hover:border-cyan-200 hover:bg-white"
                  }
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="premium-enter premium-enter-delay-1 premium-card premium-card-hover rounded-xl">
          <CardHeader className="p-4 pb-2">
            <CardTitle>Timeline kejadian</CardTitle>
            <CardDescription>
              Setiap baris menjelaskan masalah dalam bahasa bisnis, bukan teknis.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="overflow-hidden rounded-xl border border-white/70 bg-white/55 shadow-[0_16px_48px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="hidden grid-cols-[1fr_0.75fr_1.25fr_1.25fr_0.75fr] gap-3 border-b border-white/70 bg-white/70 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground lg:grid">
                <span>Waktu</span>
                <span>Durasi</span>
                <span>Diagnosis AI</span>
                <span>Tindakan</span>
                <span>Dampak dicegah</span>
              </div>
              <div className="divide-y">
                {visibleIncidents.map((incident) => {
                  const meta = statusMeta[incident.status];
                  const Icon = meta.icon;

                  return (
                    <div
                      key={incident.id}
                      className="grid gap-3 px-4 py-4 transition-all duration-300 hover:bg-white/70 lg:grid-cols-[1fr_0.75fr_1.25fr_1.25fr_0.75fr]"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Icon className="premium-wifi-pulse h-4 w-4 text-cyan-700" />
                          <p className="font-semibold text-slate-950">{incident.timestamp}</p>
                        </div>
                        <Badge variant={meta.variant} className="premium-status-badge mt-2">
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-700 lg:block">
                        <Clock3 className="h-4 w-4 lg:hidden" />
                        {incident.duration}
                      </div>
                      <p className="text-sm leading-5 text-muted-foreground">
                        {incident.diagnosis}
                      </p>
                      <p className="text-sm leading-5 text-muted-foreground">{incident.action}</p>
                      <p className="font-semibold text-orange-700">
                        {formatRupiah(incident.impactPrevented)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-cyan-100/80 bg-white/70 px-4 py-3 text-sm text-slate-800 shadow-[0_16px_48px_rgba(14,165,233,0.12)] backdrop-blur-xl">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
              <p>
                Ringkasan otomatis dikirim ke Telegram agar pemilik toko tidak perlu memantau
                dashboard terus-menerus.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
