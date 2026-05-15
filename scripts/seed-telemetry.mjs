import { Pool } from "pg";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DEMO_USER_ID = "demo-user";
const SEED_PREFIX = "seed-telemetry";

function loadLocalEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [key, ...valueParts] = trimmed.split("=");
    if (!key || process.env[key]) continue;

    process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
  }
}

function getDatabaseUrl() {
  loadLocalEnv();
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Set it to your Supabase/PostgreSQL connection string before running db:seed.",
    );
  }

  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    throw new Error(
      "DATABASE_URL must be a PostgreSQL connection string, for example postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require.",
    );
  }

  const url = new URL(databaseUrl);
  const sslMode = url.searchParams.get("sslmode");
  if (sslMode === "require" || sslMode === "prefer" || sslMode === "verify-ca") {
    url.searchParams.set("sslmode", "no-verify");
  }

  return url.toString();
}

function jakartaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function addDays(parts, delta) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + delta));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function jakartaTimeToIso(parts, hour, minute) {
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, hour - 7, minute, 0),
  ).toISOString();
}

function seededNumber(seed, min, max) {
  const raw = Math.sin(seed * 999) * 10000;
  const fraction = raw - Math.floor(raw);
  return Math.round(min + fraction * (max - min));
}

function metricsFor(status, seed) {
  if (status === "online") {
    return {
      speedMbps: seededNumber(seed, 40, 70),
      latencyMs: seededNumber(seed + 1, 50, 120),
      riskState: "safe",
      activeRoute: "primary",
    };
  }

  if (status === "degraded") {
    return {
      speedMbps: seededNumber(seed, 8, 20),
      latencyMs: seededNumber(seed + 1, 150, 250),
      riskState: "warning",
      activeRoute: "primary",
    };
  }

  if (status === "switching") {
    return {
      speedMbps: seededNumber(seed, 0, 5),
      latencyMs: seededNumber(seed + 1, 250, 500),
      riskState: "critical",
      activeRoute: "primary",
    };
  }

  return {
    speedMbps: seededNumber(seed, 20, 40),
    latencyMs: seededNumber(seed + 1, 80, 180),
    riskState: "safe",
    activeRoute: "backup",
  };
}

function buildLogs() {
  const baseSchedule = [
    { hour: 8, minute: 15, status: "online" },
    { hour: 9, minute: 45, status: "online" },
    { hour: 10, minute: 50, status: "online" },
    { hour: 11, minute: 35, status: "degraded" },
    { hour: 12, minute: 5, status: "degraded" },
    { hour: 12, minute: 32, status: "switching" },
    { hour: 12, minute: 48, status: "backup" },
    { hour: 13, minute: 18, status: "degraded" },
    { hour: 14, minute: 10, status: "online" },
    { hour: 16, minute: 30, status: "online" },
    { hour: 19, minute: 20, status: "online" },
  ];

  const extraEventsByDay = [
    [
      { hour: 11, minute: 52, status: "degraded" },
      { hour: 13, minute: 5, status: "switching" },
    ],
    [
      { hour: 12, minute: 18, status: "degraded" },
      { hour: 13, minute: 28, status: "backup" },
    ],
    [
      { hour: 11, minute: 58, status: "switching" },
      { hour: 12, minute: 15, status: "backup" },
    ],
  ];

  const todayJakarta = jakartaDateParts();
  const logs = [];

  for (let dayOffset = -2; dayOffset <= 0; dayOffset += 1) {
    const dayIndex = dayOffset + 2;
    const day = addDays(todayJakarta, dayOffset);
    const daySchedule = [...baseSchedule, ...extraEventsByDay[dayIndex]].sort(
      (left, right) => left.hour - right.hour || left.minute - right.minute,
    );

    daySchedule.forEach((event, index) => {
      const seed = (dayIndex + 1) * 100 + index * 7 + event.hour;
      const metrics = metricsFor(event.status, seed);
      logs.push({
        id: `${SEED_PREFIX}-${day.year}${String(day.month).padStart(2, "0")}${String(
          day.day,
        ).padStart(2, "0")}-${String(event.hour).padStart(2, "0")}${String(
          event.minute,
        ).padStart(2, "0")}-${index}`,
        userId: DEMO_USER_ID,
        connectionStatus: event.status,
        activeRoute: metrics.activeRoute,
        speedMbps: metrics.speedMbps,
        latencyMs: metrics.latencyMs,
        riskState: metrics.riskState,
        timestamp: jakartaTimeToIso(day, event.hour, event.minute),
      });
    });
  }

  return logs;
}

function buildSeedConnectivityState(timestamp) {
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
      timestamp,
    },
    riskInsight: {
      title: "Jam rawan koneksi melambat",
      message: "Belum ada pola berulang. AI mulai belajar dari update koneksi terbaru.",
      peakHours: [],
      riskUpdateCount: 0,
      totalUpdateCount: 0,
      generatedAt: timestamp,
    },
    updatedAt: timestamp,
  };
}

const databaseUrl = getDatabaseUrl();
const pool = new Pool({
  connectionString: databaseUrl,
});

const logs = buildLogs();
const nowIso = new Date().toISOString();
const seedState = buildSeedConnectivityState(nowIso);

try {
  await pool.query("BEGIN");

  await pool.query(
    `
      INSERT INTO users (
        id, store_name, owner_name, telegram_chat_id, estimated_daily_revenue,
        primary_wifi_name, backup_wifi_name, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        store_name = EXCLUDED.store_name,
        owner_name = EXCLUDED.owner_name,
        telegram_chat_id = EXCLUDED.telegram_chat_id,
        estimated_daily_revenue = EXCLUDED.estimated_daily_revenue,
        primary_wifi_name = EXCLUDED.primary_wifi_name,
        backup_wifi_name = EXCLUDED.backup_wifi_name,
        updated_at = EXCLUDED.updated_at
    `,
    [
      DEMO_USER_ID,
      "Toko Sinar Rasa",
      "Pemilik Toko",
      process.env.TELEGRAM_CHAT_ID ?? "demo-telegram-chat",
      8500000,
      "WiFi Utama Toko",
      "Hotspot HP Cadangan",
      nowIso,
      nowIso,
    ],
  );

  await pool.query("DELETE FROM network_logs WHERE id LIKE $1", [`${SEED_PREFIX}-%`]);

  for (const log of logs) {
    await pool.query(
      `
        INSERT INTO network_logs (
          id, user_id, connection_status, active_route,
          speed_mbps, latency_ms, risk_state, timestamp
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          connection_status = EXCLUDED.connection_status,
          active_route = EXCLUDED.active_route,
          speed_mbps = EXCLUDED.speed_mbps,
          latency_ms = EXCLUDED.latency_ms,
          risk_state = EXCLUDED.risk_state,
          timestamp = EXCLUDED.timestamp
      `,
      [
        log.id,
        log.userId,
        log.connectionStatus,
        log.activeRoute,
        log.speedMbps,
        log.latencyMs,
        log.riskState,
        log.timestamp,
      ],
    );
  }

  await pool.query(
    `
      INSERT INTO connectivity_states (
        user_id, connection_status, active_route, primary_connection,
        backup_connection, speed_mbps, latency_ms, risk_state,
        business_impact, chart_values, latest_switch_event, risk_insight, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (user_id) DO UPDATE SET
        connection_status = EXCLUDED.connection_status,
        active_route = EXCLUDED.active_route,
        primary_connection = EXCLUDED.primary_connection,
        backup_connection = EXCLUDED.backup_connection,
        speed_mbps = EXCLUDED.speed_mbps,
        latency_ms = EXCLUDED.latency_ms,
        risk_state = EXCLUDED.risk_state,
        business_impact = EXCLUDED.business_impact,
        chart_values = EXCLUDED.chart_values,
        latest_switch_event = EXCLUDED.latest_switch_event,
        risk_insight = EXCLUDED.risk_insight,
        updated_at = EXCLUDED.updated_at
    `,
    [
      DEMO_USER_ID,
      seedState.connectionStatus,
      seedState.activeRoute,
      JSON.stringify(seedState.primaryConnection),
      JSON.stringify(seedState.backupConnection),
      seedState.speedMbps,
      seedState.latencyMs,
      seedState.riskState,
      JSON.stringify(seedState.businessImpact),
      JSON.stringify(seedState.chartValues),
      JSON.stringify(seedState.latestSwitchEvent),
      JSON.stringify(seedState.riskInsight),
      seedState.updatedAt,
    ],
  );

  await pool.query("COMMIT");
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
}

const summary = await pool.query(
  `
    SELECT connection_status as status, count(*)::int as count
    FROM network_logs
    WHERE id LIKE $1
    GROUP BY connection_status
    ORDER BY connection_status
  `,
  [`${SEED_PREFIX}-%`],
);

await pool.end();

console.log(
  JSON.stringify(
    {
      database: "PostgreSQL via DATABASE_URL",
      userId: DEMO_USER_ID,
      insertedRows: logs.length,
      range: {
        from: logs[0]?.timestamp,
        to: logs.at(-1)?.timestamp,
      },
      summary: summary.rows,
      seededConnectivityState: seedState.connectionStatus,
      lunchPattern: "Repeated degraded/switching events generated around 11:30-13:30 Jakarta time.",
    },
    null,
    2,
  ),
);
