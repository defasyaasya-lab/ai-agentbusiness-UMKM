import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";

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

function getSqliteFilePath() {
  loadLocalEnv();
  const databaseUrl = process.env.DATABASE_URL?.trim() || "./data/business-guardian.sqlite";
  const filePath = databaseUrl.startsWith("file:")
    ? databaseUrl.replace(/^file:/, "")
    : databaseUrl;

  return isAbsolute(filePath) ? filePath : join(process.cwd(), filePath);
}

const DB_FILE = getSqliteFilePath();
const DEMO_USER_ID = "demo-user";
const SEED_PREFIX = "seed-telemetry";

mkdirSync(dirname(DB_FILE), { recursive: true });

const db = new Database(DB_FILE);
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    store_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    telegram_chat_id TEXT NOT NULL,
    estimated_daily_revenue INTEGER NOT NULL,
    primary_wifi_name TEXT NOT NULL,
    backup_wifi_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS network_logs (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    connection_status TEXT NOT NULL,
    active_route TEXT NOT NULL,
    speed_mbps INTEGER NOT NULL,
    latency_ms INTEGER NOT NULL,
    risk_state TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    protected_revenue INTEGER NOT NULL,
    started_at TEXT NOT NULL,
    resolved_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

const nowIso = new Date().toISOString();
db.prepare(
  `
  INSERT INTO users (
    id, store_name, owner_name, telegram_chat_id, estimated_daily_revenue,
    primary_wifi_name, backup_wifi_name, created_at, updated_at
  )
  VALUES (
    @id, @storeName, @ownerName, @telegramChatId, @estimatedDailyRevenue,
    @primaryWifiName, @backupWifiName, @createdAt, @updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    updated_at = excluded.updated_at
`,
).run({
  id: DEMO_USER_ID,
  storeName: "Toko Sinar Rasa",
  ownerName: "Pemilik Toko",
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? "demo-telegram-chat",
  estimatedDailyRevenue: 8500000,
  primaryWifiName: "WiFi Utama Toko",
  backupWifiName: "Hotspot HP Cadangan",
  createdAt: nowIso,
  updatedAt: nowIso,
});

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

const deleteSeedLogs = db.prepare("DELETE FROM network_logs WHERE id LIKE ?");
const insertLog = db.prepare(`
  INSERT INTO network_logs (
    id, user_id, connection_status, active_route,
    speed_mbps, latency_ms, risk_state, timestamp
  )
  VALUES (
    @id, @userId, @connectionStatus, @activeRoute,
    @speedMbps, @latencyMs, @riskState, @timestamp
  )
`);

const seedTelemetry = db.transaction(() => {
  deleteSeedLogs.run(`${SEED_PREFIX}-%`);
  for (const log of logs) {
    insertLog.run(log);
  }
});

seedTelemetry();

const summary = db
  .prepare(
    `
    SELECT connection_status as status, count(*) as count
    FROM network_logs
    WHERE id LIKE ?
    GROUP BY connection_status
    ORDER BY connection_status
  `,
  )
  .all(`${SEED_PREFIX}-%`);

console.log(
  JSON.stringify(
    {
      database: DB_FILE,
      userId: DEMO_USER_ID,
      insertedRows: logs.length,
      range: {
        from: logs[0]?.timestamp,
        to: logs.at(-1)?.timestamp,
      },
      summary,
      lunchPattern: "Repeated degraded/switching events generated around 11:30-13:30 Jakarta time.",
    },
    null,
    2,
  ),
);
