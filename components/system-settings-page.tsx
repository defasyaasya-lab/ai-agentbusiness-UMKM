"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Building2,
  CheckCircle2,
  MessageCircle,
  RadioTower,
  Save,
  Smartphone,
  WalletCards,
  Wifi,
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
import type { StoreProfile } from "@/lib/profile/types";
import { formatRupiah } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-md border border-white/70 bg-white/75 px-3 text-sm text-slate-900 shadow-sm outline-none backdrop-blur transition-all duration-300 placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-2 focus:ring-cyan-100";

export function SystemSettingsPage() {
  const [storeName, setStoreName] = useState("Toko Sinar Rasa");
  const [category, setCategory] = useState("Makanan & Minuman");
  const [dailyRevenue, setDailyRevenue] = useState(8500000);
  const [telegramChatId, setTelegramChatId] = useState("123456789");
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [sendSummary, setSendSummary] = useState(true);
  const [mainInternet, setMainInternet] = useState("Modem Utama Toko");
  const [backupInternet, setBackupInternet] = useState("Tethering HP Cadangan");
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  const estimatePerHour = useMemo(() => Math.round(dailyRevenue / 10), [dailyRevenue]);

  function applyProfile(profile: StoreProfile) {
    setStoreName(profile.storeName);
    setDailyRevenue(profile.estimatedDailyRevenue);
    setTelegramChatId(profile.telegramChatId);
    setMainInternet(profile.primaryWifiName);
    setBackupInternet(profile.backupWifiName);
  }

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

        const profile = (await response.json()) as StoreProfile;
        if (active) {
          applyProfile(profile);
          setSaveStatus("saved");
        }
      } catch {
        setSaveStatus("error");
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    setSaveStatus("saving");

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({
          storeName,
          telegramChatId: telegramEnabled ? telegramChatId : "",
          estimatedDailyRevenue: dailyRevenue,
          primaryWifiName: mainInternet,
          backupWifiName: backupInternet,
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal menyimpan profil.");
      }

      const profile = (await response.json()) as StoreProfile;
      applyProfile(profile);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }

  return (
    <PageShell
      title="Pengaturan Sistem"
      description="Atur profil toko, Telegram, dan jalur internet tanpa istilah teknis yang membingungkan."
      aside={
        <Badge
          variant={saveStatus === "error" ? "danger" : "success"}
          className="premium-status-badge w-fit"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {saveStatus === "saving"
            ? "Menyimpan..."
            : saveStatus === "error"
              ? "Gagal tersimpan"
              : "Tersimpan ke database"}
        </Badge>
      }
    >
      <section className="grid gap-3 xl:grid-cols-[1fr_0.85fr]">
        <div className="grid gap-3">
          <Card className="premium-enter premium-enter-delay-1 premium-card premium-card-hover rounded-xl">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-3">
                <div className="premium-icon-glow flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-950 via-indigo-900 to-cyan-600 text-white shadow-[0_14px_34px_rgba(14,165,233,0.22)]">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Profil toko</CardTitle>
                  <CardDescription>Dipakai untuk menghitung potensi omzet yang perlu dijaga.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 pt-2 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Nama toko
                <input
                  className={fieldClass}
                  value={storeName}
                  onChange={(event) => setStoreName(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Kategori usaha
                <select
                  className={fieldClass}
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option>Makanan & Minuman</option>
                  <option>Fashion</option>
                  <option>Live Seller</option>
                  <option>Ritel Harian</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Omzet harian
                <input
                  className={fieldClass}
                  type="number"
                  value={dailyRevenue}
                  onChange={(event) => setDailyRevenue(Number(event.target.value))}
                />
              </label>
            </CardContent>
          </Card>

          <Card className="premium-enter premium-enter-delay-2 premium-card premium-card-hover rounded-xl">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-100 bg-cyan-50 text-cyan-700 shadow-[0_12px_30px_rgba(14,165,233,0.12)]">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Notifikasi Telegram</CardTitle>
                  <CardDescription>Kabar singkat saat toko berisiko offline atau sudah diamankan.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 pt-2 md:grid-cols-[1fr_auto_auto] md:items-end">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Chat ID pemilik
                <input
                  className={fieldClass}
                  value={telegramChatId}
                  onChange={(event) => setTelegramChatId(event.target.value)}
                />
              </label>
              <label className="flex h-10 items-center gap-3 rounded-md border border-white/70 bg-white/70 px-3 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition-all duration-300 hover:bg-white">
                <input
                  type="checkbox"
                  checked={telegramEnabled}
                  onChange={(event) => setTelegramEnabled(event.target.checked)}
                  className="h-4 w-4 accent-cyan-700"
                />
                Alert aktif
              </label>
              <label className="flex h-10 items-center gap-3 rounded-md border border-white/70 bg-white/70 px-3 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition-all duration-300 hover:bg-white">
                <input
                  type="checkbox"
                  checked={sendSummary}
                  onChange={(event) => setSendSummary(event.target.checked)}
                  className="h-4 w-4 accent-cyan-700"
                />
                Ringkasan harian
              </label>
            </CardContent>
          </Card>

          <Card className="premium-enter premium-enter-delay-2 premium-card premium-card-hover rounded-xl">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700 shadow-[0_12px_30px_rgba(37,99,235,0.12)]">
                  <RadioTower className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Jalur internet utama dan cadangan</CardTitle>
                  <CardDescription>AI memilih jalur terbaik agar transaksi tidak berhenti.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 pt-2 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Jalur utama
                <input
                  className={fieldClass}
                  value={mainInternet}
                  onChange={(event) => setMainInternet(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Jalur cadangan
                <input
                  className={fieldClass}
                  value={backupInternet}
                  onChange={(event) => setBackupInternet(event.target.value)}
                />
              </label>
              <label className="flex h-10 items-center gap-3 rounded-md border border-white/70 bg-white/70 px-3 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition-all duration-300 hover:bg-white">
                <input
                  type="checkbox"
                  checked={autoSwitch}
                  onChange={(event) => setAutoSwitch(event.target.checked)}
                  className="h-4 w-4 accent-cyan-700"
                />
                Pindah otomatis
              </label>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3">
          <Card className="premium-enter premium-enter-delay-1 premium-card premium-card-hover overflow-hidden rounded-xl border-cyan-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.84),rgba(224,242,254,0.64)_48%,rgba(243,232,255,0.58))]">
            <CardHeader className="p-4 pb-2">
              <CardTitle>Ringkasan pengaturan</CardTitle>
              <CardDescription className="text-slate-600">
                Tampilan cepat sebelum data ini nanti dihubungkan ke backend.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 pt-2">
              <div className="rounded-xl border border-white/70 bg-white/70 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-800">
                  <WalletCards className="h-4 w-4" />
                  Estimasi omzet dijaga
                </div>
                <p className="mt-2 bg-gradient-to-r from-slate-950 via-indigo-900 to-cyan-700 bg-clip-text text-3xl font-semibold text-transparent">
                  {formatRupiah(estimatePerHour)}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Per jam ramai. Dipakai untuk estimasi kerugian.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <SummaryRow icon={Building2} label="Toko" value={`${storeName} - ${category}`} />
                <SummaryRow
                  icon={Smartphone}
                  label="Telegram"
                  value={telegramEnabled ? telegramChatId : "Notifikasi dimatikan"}
                />
                <SummaryRow icon={Wifi} label="Utama" value={mainInternet} />
                <SummaryRow
                  icon={RadioTower}
                  label="Cadangan"
                  value={`${backupInternet}${autoSwitch ? " - otomatis" : ""}`}
                />
              </div>
              <Button
                className="mt-1 bg-gradient-to-r from-cyan-700 to-blue-700 text-white shadow-[0_14px_34px_rgba(14,165,233,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:from-cyan-800 hover:to-blue-800"
                onClick={handleSave}
                disabled={saveStatus === "saving"}
              >
                <Save />
                {saveStatus === "saving" ? "Menyimpan" : "Simpan ke database"}
              </Button>
            </CardContent>
          </Card>

          <div className="premium-enter premium-enter-delay-3 flex items-start gap-3 rounded-xl border border-orange-100/80 bg-white/70 px-4 py-3 text-sm text-slate-800 shadow-[0_16px_48px_rgba(251,146,60,0.12)] backdrop-blur-xl">
            <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" />
            <p>
              Pengaturan ini tersimpan di SQLite lokal. Dashboard akan memakai nama toko
              dan omzet terbaru setelah data disimpan.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/70 bg-white/70 p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/90">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</p>
      </div>
    </div>
  );
}
