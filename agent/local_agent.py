"""Simple local connectivity agent for the UMKM dashboard demo.

This script observes internet connectivity and reports status to the Next.js
backend mock API. It can perform a lightweight Windows WiFi profile handoff to
a configured phone hotspot for local prototype demos. It does not start
hotspots, edit routes, or make router/browser-side network changes.
"""

from __future__ import annotations

import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path
from typing import Literal, TypedDict
from zoneinfo import ZoneInfo


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_LOCAL_PATH = PROJECT_ROOT / ".env.local"


def load_env_local(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"'")
        if key and key not in os.environ:
            os.environ[key] = value


load_env_local(ENV_LOCAL_PATH)

PRIMARY_WIFI = os.getenv("PRIMARY_WIFI", "Royalbaginda kanan")
BACKUP_WIFI = os.getenv("BACKUP_WIFI", "1414144")
BACKEND_STATUS_URL = os.getenv(
    "AGENT_BACKEND_STATUS_URL",
    "http://127.0.0.1:3000/api/connectivity/status",
)
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
PROBE_URL = os.getenv("AGENT_PROBE_URL", "https://www.google.com/generate_204")
CHECK_INTERVAL_SECONDS = 2
PROBE_TIMEOUT_SECONDS = 3
BACKUP_CONNECT_WAIT_SECONDS = 8
SLOW_SPEED_SWITCH_THRESHOLD_MBPS = 8
SLOW_LATENCY_SWITCH_THRESHOLD_MS = 300
SLOW_CHECKS_BEFORE_SWITCH = 3
TELEGRAM_ALERT_STATUSES = {"degraded", "switching", "offline", "backup"}
MAX_LOCAL_HISTORY_ENTRIES = 100
try:
    JAKARTA_TZ = ZoneInfo("Asia/Jakarta")
except Exception:
    JAKARTA_TZ = timezone(timedelta(hours=7))


ConnectionStatus = Literal["online", "degraded", "switching", "backup", "offline"]
ActiveRoute = Literal["primary", "backup"]
RiskState = Literal["safe", "warning", "critical"]
ConnectionHealth = Literal["online", "degraded", "ready", "active", "offline"]
SwitchEventResult = Literal[
    "none",
    "prepared_backup",
    "switch_started",
    "switch_success",
    "switch_failed",
]


class ProbeResult(TypedDict):
    online: bool
    latency_ms: int
    error: str | None


class StatusPayload(TypedDict):
    connectionStatus: ConnectionStatus
    activeRoute: ActiveRoute
    primaryConnection: dict[str, str]
    backupConnection: dict[str, str]
    speedMbps: int
    latencyMs: int
    riskState: RiskState
    chartValues: list[int]
    latestSwitchEvent: dict[str, str | int]


class StatusHistoryEntry(TypedDict):
    timestamp: str
    connectionStatus: ConnectionStatus
    activeRoute: ActiveRoute
    speedMbps: int
    latencyMs: int
    riskState: RiskState


LOCAL_STATUS_HISTORY: list[StatusHistoryEntry] = []


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def append_status_history(payload: StatusPayload) -> None:
    LOCAL_STATUS_HISTORY.append(
        {
            "timestamp": now_iso(),
            "connectionStatus": payload["connectionStatus"],
            "activeRoute": payload["activeRoute"],
            "speedMbps": payload["speedMbps"],
            "latencyMs": payload["latencyMs"],
            "riskState": payload["riskState"],
        }
    )

    if len(LOCAL_STATUS_HISTORY) > MAX_LOCAL_HISTORY_ENTRIES:
        del LOCAL_STATUS_HISTORY[: len(LOCAL_STATUS_HISTORY) - MAX_LOCAL_HISTORY_ENTRIES]


def hour_range_label(hour: int) -> str:
    return f"{hour:02d}.00-{(hour + 1) % 24:02d}.00"


def local_risk_insight() -> str | None:
    risk_entries = [
        entry
        for entry in LOCAL_STATUS_HISTORY
        if entry["connectionStatus"] in {"degraded", "offline", "switching"}
    ]
    if not risk_entries:
        return None

    counts_by_hour: dict[int, int] = {}
    for entry in risk_entries:
        try:
            timestamp = datetime.fromisoformat(entry["timestamp"])
        except ValueError:
            continue
        hour = timestamp.astimezone(JAKARTA_TZ).hour
        counts_by_hour[hour] = counts_by_hour.get(hour, 0) + 1

    if not counts_by_hour:
        return None

    peak_hours = sorted(
        counts_by_hour.items(),
        key=lambda item: (-item[1], item[0]),
    )[:2]
    labels = [hour_range_label(hour) for hour, _ in peak_hours]

    return (
        "Jam rawan koneksi melambat terdeteksi sekitar "
        + " dan ".join(labels)
        + ". Siapkan hotspot sebelum jam ini."
    )


def probe_internet() -> ProbeResult:
    request = urllib.request.Request(
        PROBE_URL,
        method="GET",
        headers={"User-Agent": "UMKM-Connectivity-Agent/0.1"},
    )
    start = time.perf_counter()

    try:
        with urllib.request.urlopen(request, timeout=PROBE_TIMEOUT_SECONDS) as response:
            response.read(128)
            latency_ms = round((time.perf_counter() - start) * 1000)
            return {
                "online": 200 <= response.status < 400,
                "latency_ms": latency_ms,
                "error": None,
            }
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        latency_ms = round((time.perf_counter() - start) * 1000)
        return {"online": False, "latency_ms": latency_ms, "error": str(exc)}


def get_current_wifi() -> str:
    try:
        result = subprocess.run(
            ["netsh", "wlan", "show", "interfaces"],
            capture_output=True,
            text=True,
            timeout=4,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return "unknown"

    for raw_line in result.stdout.splitlines():
        line = raw_line.strip()
        if line.startswith("SSID") and not line.startswith("BSSID"):
            _, _, ssid = line.partition(":")
            return ssid.strip() or "unknown"

    return "not connected"


def connect_to_wifi_profile(wifi_name: str) -> tuple[bool, str]:
    try:
        result = subprocess.run(
            ["netsh", "wlan", "connect", f"name={wifi_name}"],
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        return False, str(exc)

    output = (result.stdout or result.stderr or "").strip()
    return result.returncode == 0, output or f"netsh exited with code {result.returncode}"


def connect_to_backup_wifi() -> tuple[bool, str]:
    return connect_to_wifi_profile(BACKUP_WIFI)


def connect_to_primary_wifi() -> tuple[bool, str]:
    return connect_to_wifi_profile(PRIMARY_WIFI)


def classify_primary_status(result: ProbeResult) -> tuple[ConnectionStatus, RiskState]:
    if not result["online"]:
        return "offline", "critical"
    if result["latency_ms"] >= 250:
        return "degraded", "warning"
    return "online", "safe"


def estimate_speed_mbps(status: ConnectionStatus, latency_ms: int) -> int:
    """Tiny demo estimate so the dashboard has a business-friendly speed card."""
    if status in ["offline", "switching"]:
        return 0
    if status == "backup":
        if latency_ms >= 250:
            return max(4, min(18, round(3000 / max(latency_ms, 1))))
        return max(20, min(40, round(5000 / max(latency_ms, 1))))
    if status == "degraded":
        return max(4, min(18, round(3000 / max(latency_ms, 1))))
    return max(24, min(60, round(6000 / max(latency_ms, 1))))


def health_chart_value(status: ConnectionStatus, latency_ms: int) -> int:
    if status == "offline":
        return 35
    if status == "switching":
        return 45
    if status == "degraded":
        return max(55, min(76, round(100 - latency_ms / 6)))
    return max(86, min(98, round(100 - latency_ms / 20)))


def should_switch_for_slow_connection(status: ConnectionStatus, latency_ms: int) -> bool:
    speed_mbps = estimate_speed_mbps(status, latency_ms)
    return (
        status == "degraded"
        and (
            speed_mbps <= SLOW_SPEED_SWITCH_THRESHOLD_MBPS
            or latency_ms >= SLOW_LATENCY_SWITCH_THRESHOLD_MS
        )
    )


def should_return_to_primary_from_backup(result: ProbeResult) -> bool:
    backup_speed_mbps = estimate_speed_mbps(
        "backup" if result["online"] else "offline",
        result["latency_ms"],
    )
    return (
        not result["online"]
        or backup_speed_mbps <= SLOW_SPEED_SWITCH_THRESHOLD_MBPS
        or result["latency_ms"] >= SLOW_LATENCY_SWITCH_THRESHOLD_MS
    )


def build_payload(
    status: ConnectionStatus,
    risk: RiskState,
    latency_ms: int,
    chart_values: list[int],
    *,
    active_route: ActiveRoute = "primary",
    message: str | None = None,
    switch_result: SwitchEventResult | None = None,
    duration_ms: int = 0,
) -> StatusPayload:
    primary_health: ConnectionHealth
    backup_health: ConnectionHealth

    if active_route == "backup":
        primary_health = "offline" if status == "backup" else "degraded"
        backup_health = "active"
    else:
        primary_health = {
            "online": "online",
            "degraded": "degraded",
            "switching": "offline",
            "backup": "degraded",
            "offline": "offline",
        }[status]
        backup_health = "ready"

    if message is None:
        message = {
            "online": f"{PRIMARY_WIFI} terpantau lancar.",
            "degraded": f"{PRIMARY_WIFI} mulai melambat; {BACKUP_WIFI} tetap siap.",
            "switching": f"{PRIMARY_WIFI} offline; mencoba pindah ke {BACKUP_WIFI}.",
            "backup": f"Internet pulih lewat {BACKUP_WIFI}.",
            "offline": f"{PRIMARY_WIFI} tidak terhubung; {BACKUP_WIFI} belum berhasil mengambil alih.",
        }[status]

    if switch_result is None:
        switch_result = {
            "online": "none",
            "degraded": "prepared_backup",
            "switching": "switch_started",
            "backup": "switch_success",
            "offline": "switch_failed",
        }[status]

    return {
        "connectionStatus": status,
        "activeRoute": active_route,
        "primaryConnection": {
            "name": PRIMARY_WIFI,
            "kind": "wifi",
            "status": primary_health,
        },
        "backupConnection": {
            "name": BACKUP_WIFI,
            "kind": "phone_hotspot",
            "status": backup_health,
        },
        "speedMbps": estimate_speed_mbps(status, latency_ms),
        "latencyMs": latency_ms,
        "riskState": risk,
        "chartValues": chart_values,
        "latestSwitchEvent": {
            "result": switch_result,
            "activeRouteAfter": active_route,
            "durationMs": duration_ms,
            "message": message,
            "timestamp": now_iso(),
        },
    }


def post_status(payload: StatusPayload) -> None:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        BACKEND_STATUS_URL,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )

    with urllib.request.urlopen(request, timeout=PROBE_TIMEOUT_SECONDS) as response:
        response.read(256)


def telegram_alert_text(payload: StatusPayload) -> str:
    status = payload["connectionStatus"]
    status_label = {
        "degraded": "Koneksi mulai melambat",
        "switching": "Sedang pindah ke cadangan",
        "offline": "Internet utama terputus",
        "backup": "Backup aktif",
    }.get(status, "Info koneksi")
    status_icon = {
        "degraded": "⚠️",
        "switching": "🔄",
        "offline": "🚨",
        "backup": "✅",
    }.get(status, "ℹ️")
    route_label = "Hotspot cadangan" if payload["activeRoute"] == "backup" else "WiFi utama"
    latest_event = payload["latestSwitchEvent"]
    message = escape(str(latest_event["message"]))
    insight = local_risk_insight()
    insight_lines = (
        [
            "",
            "🔎 <b>Pola sederhana:</b>",
            escape(insight),
        ]
        if insight
        else []
    )

    return "\n".join(
        [
            f"{status_icon} <b>AI Business Guardian</b>",
            f"<b>{escape(status_label)}</b>",
            "",
            message,
            "",
            f"🌐 <b>Jalur aktif:</b> {escape(route_label)}",
            f"⚡ <b>Kecepatan:</b> {payload['speedMbps']} Mbps",
            f"⏱️ <b>Respons koneksi:</b> {payload['latencyMs']} ms",
            "",
            "📌 <b>Dampak ke toko:</b>",
            "Pesanan, chat pembeli, dan checkout tetap dipantau agar jualan tidak berhenti.",
            *insight_lines,
            "",
            "Tenang, tidak perlu membuka dashboard terus-menerus. AI akan terus berjaga. ✨",
        ]
    )


def telegram_welcome_text() -> str:
    return "\n".join(
        [
            "✨ <b>AI Business Guardian aktif</b>",
            "",
            "Halo, Kak! 👋",
            "Sistem penjaga koneksi toko sudah terhubung ke Telegram.",
            "",
            f"🏪 <b>WiFi utama:</b> {escape(PRIMARY_WIFI)}",
            f"📱 <b>Hotspot cadangan:</b> {escape(BACKUP_WIFI)}",
            "📊 <b>Status:</b> siap memantau koneksi, pesanan, dan potensi omzet yang dijaga.",
            "",
            "Kalau koneksi melambat, switching, offline, atau backup aktif, saya akan kirim kabar otomatis di sini.",
            "",
            "Tenang, pemilik toko bisa fokus jualan. Saya yang berjaga. ✅",
        ]
    )


def send_telegram_message(text: str, purpose: str, *, parse_mode: str | None = None) -> bool:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        log(
            f"telegram_{purpose}_skipped missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID"
        )
        return False

    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "disable_web_page_preview": True,
    }
    if parse_mode:
        payload["parse_mode"] = parse_mode

    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )

    try:
        with urllib.request.urlopen(request, timeout=PROBE_TIMEOUT_SECONDS) as response:
            response.read(256)
        log(f"telegram_{purpose}_sent")
        return True
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        log(f"telegram_{purpose}_failed error={exc}")
        return False


def send_telegram_welcome() -> bool:
    sent = send_telegram_message(telegram_welcome_text(), "welcome", parse_mode="HTML")
    if sent:
        log("telegram_connected welcome_message_delivered")
    return sent


def send_telegram_alert(payload: StatusPayload) -> None:
    sent = send_telegram_message(telegram_alert_text(payload), "alert", parse_mode="HTML")
    if sent:
        log(f"telegram_alert_status={payload['connectionStatus']}")


def maybe_send_telegram_alert(
    payload: StatusPayload,
    last_alert_status: ConnectionStatus | None,
) -> ConnectionStatus | None:
    status = payload["connectionStatus"]
    if status not in TELEGRAM_ALERT_STATUSES:
        return None
    if status == last_alert_status:
        return last_alert_status

    send_telegram_alert(payload)
    return status


def log(message: str) -> None:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}", flush=True)


def main() -> None:
    chart_values = [90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90]
    last_alert_status: ConnectionStatus | None = None
    primary_slow_check_count = 0
    backup_slow_check_count = 0
    log("Local agent started for local prototype demo.")
    log(f"Primary WiFi: {PRIMARY_WIFI}")
    log(f"Backup WiFi: {BACKUP_WIFI}")
    log(
        "Switch trigger: offline, or speed<=%sMbps/latency>=%sms for %s checks"
        % (
            SLOW_SPEED_SWITCH_THRESHOLD_MBPS,
            SLOW_LATENCY_SWITCH_THRESHOLD_MS,
            SLOW_CHECKS_BEFORE_SWITCH,
        )
    )
    log(f"Posting updates to {BACKEND_STATUS_URL}")
    log(f".env.local path: {ENV_LOCAL_PATH}")
    log(
        "Telegram env detected: TELEGRAM_BOT_TOKEN=%s TELEGRAM_CHAT_ID=%s"
        % (
            "yes" if TELEGRAM_BOT_TOKEN else "no",
            "yes" if TELEGRAM_CHAT_ID else "no",
        )
    )
    log(
        "Telegram alerts enabled"
        if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
        else "Telegram alerts disabled: set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID"
    )
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        send_telegram_welcome()

    while True:
        current_wifi = get_current_wifi()
        log(f"current_wifi={current_wifi} backup_wifi={BACKUP_WIFI}")

        result = probe_internet()
        status, risk = classify_primary_status(result)
        chart_values = (chart_values + [health_chart_value(status, result["latency_ms"])])[-12:]
        active_wifi_is_backup = current_wifi == BACKUP_WIFI

        if active_wifi_is_backup:
            primary_slow_check_count = 0
            if should_return_to_primary_from_backup(result):
                backup_slow_check_count += 1
            else:
                backup_slow_check_count = 0
        else:
            backup_slow_check_count = 0
            if should_switch_for_slow_connection(status, result["latency_ms"]):
                primary_slow_check_count += 1
            else:
                primary_slow_check_count = 0

        should_switch_to_backup = (
            not active_wifi_is_backup
            and (
                not result["online"]
                or primary_slow_check_count >= SLOW_CHECKS_BEFORE_SWITCH
            )
        )
        should_return_to_primary = (
            active_wifi_is_backup
            and backup_slow_check_count >= SLOW_CHECKS_BEFORE_SWITCH
        )

        if should_return_to_primary:
            switch_start = time.perf_counter()
            backup_speed = estimate_speed_mbps(
                "backup" if result["online"] else "offline",
                result["latency_ms"],
            )
            switching_payload = build_payload(
                "switching",
                "critical",
                result["latency_ms"],
                chart_values,
                active_route="backup",
                message=(
                    f"{BACKUP_WIFI} melambat {backup_slow_check_count}x berturut-turut "
                    f"(speed {backup_speed} Mbps, latency {result['latency_ms']} ms). "
                    f"Mulai pindah kembali ke {PRIMARY_WIFI}."
                ),
                switch_result="switch_started",
            )

            try:
                append_status_history(switching_payload)
                post_status(switching_payload)
                last_alert_status = maybe_send_telegram_alert(
                    switching_payload,
                    last_alert_status,
                )
                log(
                    "status=switching route=backup speed=%sMbps posted; reconnecting primary..."
                    % backup_speed
                )
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                log(f"status=switching backend_post_failed={exc}; reconnecting primary...")

            connect_ok, connect_message = connect_to_primary_wifi()
            log(f"netsh_primary_connect ok={connect_ok} result={connect_message}")
            time.sleep(BACKUP_CONNECT_WAIT_SECONDS)

            primary_result = probe_internet()
            duration_ms = round((time.perf_counter() - switch_start) * 1000)
            if primary_result["online"]:
                primary_status, primary_risk = classify_primary_status(primary_result)
                chart_values = (
                    chart_values
                    + [health_chart_value(primary_status, primary_result["latency_ms"])]
                )[-12:]
                payload = build_payload(
                    primary_status,
                    primary_risk,
                    primary_result["latency_ms"],
                    chart_values,
                    active_route="primary",
                    message=f"Koneksi kembali memakai {PRIMARY_WIFI}.",
                    switch_result="switch_success",
                    duration_ms=duration_ms,
                )
                status = primary_status
                risk = primary_risk
                result = primary_result
                backup_slow_check_count = 0
            else:
                reconnect_ok, reconnect_message = connect_to_backup_wifi()
                log(
                    f"netsh_backup_reconnect ok={reconnect_ok} result={reconnect_message}"
                )
                payload = build_payload(
                    "offline",
                    "critical",
                    primary_result["latency_ms"],
                    chart_values,
                    message=(
                        f"{PRIMARY_WIFI} belum siap setelah backup melambat. "
                        "Cek WiFi utama dan hotspot secara manual."
                    ),
                    switch_result="switch_failed",
                    duration_ms=duration_ms,
                )
                status = "offline"
                risk = "critical"
                result = primary_result
        elif should_switch_to_backup:
            switch_reason = (
                f"{PRIMARY_WIFI} offline"
                if not result["online"]
                else (
                    f"{PRIMARY_WIFI} melambat {primary_slow_check_count}x berturut-turut "
                    f"(speed {estimate_speed_mbps(status, result['latency_ms'])} Mbps, "
                    f"latency {result['latency_ms']} ms)"
                )
            )
            switching_payload = build_payload(
                "switching",
                "critical",
                result["latency_ms"],
                chart_values,
                message=f"{switch_reason}. Mulai pindah ke {BACKUP_WIFI}.",
                switch_result="switch_started",
            )

            try:
                append_status_history(switching_payload)
                post_status(switching_payload)
                last_alert_status = maybe_send_telegram_alert(
                    switching_payload,
                    last_alert_status,
                )
                log(
                    "status=switching route=primary speed=0Mbps posted; connecting backup..."
                )
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                log(f"status=switching backend_post_failed={exc}; connecting backup...")

            switch_start = time.perf_counter()
            connect_ok, connect_message = connect_to_backup_wifi()
            log(f"netsh_backup_connect ok={connect_ok} result={connect_message}")
            time.sleep(BACKUP_CONNECT_WAIT_SECONDS)

            backup_result = probe_internet()
            duration_ms = round((time.perf_counter() - switch_start) * 1000)
            if backup_result["online"]:
                backup_risk: RiskState = (
                    "warning" if backup_result["latency_ms"] >= 250 else "safe"
                )
                chart_values = (
                    chart_values
                    + [health_chart_value("backup", backup_result["latency_ms"])]
                )[-12:]
                payload = build_payload(
                    "backup",
                    backup_risk,
                    backup_result["latency_ms"],
                    chart_values,
                    active_route="backup",
                    message=f"Internet pulih lewat {BACKUP_WIFI}.",
                    switch_result="switch_success",
                    duration_ms=duration_ms,
                )
                status = "backup"
                risk = backup_risk
                result = backup_result
                slow_check_count = 0
            else:
                chart_values = (
                    chart_values
                    + [health_chart_value("offline", backup_result["latency_ms"])]
                )[-12:]
                payload = build_payload(
                    "offline",
                    "critical",
                    backup_result["latency_ms"],
                    chart_values,
                    message=(
                        f"{BACKUP_WIFI} belum memulihkan internet. "
                        "Cek profil WiFi/hotspot secara manual."
                    ),
                    switch_result="switch_failed",
                    duration_ms=duration_ms,
                )
                status = "offline"
                risk = "critical"
                result = backup_result
        else:
            active_route: ActiveRoute = (
                "backup" if current_wifi == BACKUP_WIFI else "primary"
            )
            payload_status: ConnectionStatus = "backup" if active_route == "backup" else status
            if payload_status == "backup" and risk == "warning":
                message = f"{BACKUP_WIFI} aktif, tetapi koneksi terasa melambat."
            elif payload_status == "backup":
                message = f"{BACKUP_WIFI} aktif dan internet berjalan."
            else:
                message = None
            payload = build_payload(
                payload_status,
                risk,
                result["latency_ms"],
                chart_values,
                active_route=active_route,
                message=message,
                switch_result="switch_success" if active_route == "backup" else None,
            )

        try:
            append_status_history(payload)
            post_status(payload)
            last_alert_status = maybe_send_telegram_alert(payload, last_alert_status)
            log(
                "status=%s risk=%s latency=%sms speed=%sMbps route=%s posted"
                % (
                    status,
                    risk,
                    result["latency_ms"],
                    payload["speedMbps"],
                    payload["activeRoute"],
                )
            )
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            log(
                "status=%s risk=%s latency=%sms backend_post_failed=%s"
                % (status, risk, result["latency_ms"], exc)
            )

        time.sleep(CHECK_INTERVAL_SECONDS)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("Local agent stopped.")
