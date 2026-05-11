import { eq } from "drizzle-orm";
import { DEMO_USER_ID, getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { StoreProfile, StoreProfileUpdate } from "@/lib/profile/types";

function toStoreProfile(row: typeof users.$inferSelect): StoreProfile {
  return {
    id: row.id,
    storeName: row.storeName,
    ownerName: row.ownerName,
    telegramChatId: row.telegramChatId,
    estimatedDailyRevenue: row.estimatedDailyRevenue,
    primaryWifiName: row.primaryWifiName,
    backupWifiName: row.backupWifiName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function ensureDemoUser() {
  const existingUser = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, DEMO_USER_ID))
    .limit(1);

  if (existingUser[0]) return;

  const now = new Date().toISOString();
  await getDb()
    .insert(users)
    .values({
      id: DEMO_USER_ID,
      storeName: "Toko Sinar Rasa",
      ownerName: "Pemilik Toko",
      telegramChatId: process.env.TELEGRAM_CHAT_ID ?? "demo-telegram-chat",
      estimatedDailyRevenue: 8500000,
      primaryWifiName: "WiFi Utama Toko",
      backupWifiName: "Hotspot HP Cadangan",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: users.id });

  console.log("[db] seeded default demo user");
}

export async function getDemoStoreProfile(): Promise<StoreProfile> {
  await ensureDemoUser();

  const rows = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, DEMO_USER_ID))
    .limit(1);
  const row = rows[0];

  if (!row) {
    throw new Error("Demo user profile was not seeded.");
  }

  return toStoreProfile(row);
}

export async function updateDemoStoreProfile(
  update: StoreProfileUpdate,
): Promise<StoreProfile> {
  const current = await getDemoStoreProfile();
  const cleanedUpdate: StoreProfileUpdate = {};

  if (typeof update.storeName === "string" && update.storeName.trim()) {
    cleanedUpdate.storeName = update.storeName.trim();
  }

  if (typeof update.ownerName === "string" && update.ownerName.trim()) {
    cleanedUpdate.ownerName = update.ownerName.trim();
  }

  if (typeof update.telegramChatId === "string") {
    cleanedUpdate.telegramChatId = update.telegramChatId.trim();
  }

  if (
    typeof update.estimatedDailyRevenue === "number" &&
    Number.isFinite(update.estimatedDailyRevenue)
  ) {
    cleanedUpdate.estimatedDailyRevenue = Math.max(
      0,
      Math.round(update.estimatedDailyRevenue),
    );
  }

  if (typeof update.primaryWifiName === "string" && update.primaryWifiName.trim()) {
    cleanedUpdate.primaryWifiName = update.primaryWifiName.trim();
  }

  if (typeof update.backupWifiName === "string" && update.backupWifiName.trim()) {
    cleanedUpdate.backupWifiName = update.backupWifiName.trim();
  }

  await getDb()
    .update(users)
    .set({
      storeName: cleanedUpdate.storeName ?? current.storeName,
      ownerName: cleanedUpdate.ownerName ?? current.ownerName,
      telegramChatId: cleanedUpdate.telegramChatId ?? current.telegramChatId,
      estimatedDailyRevenue:
        cleanedUpdate.estimatedDailyRevenue ?? current.estimatedDailyRevenue,
      primaryWifiName: cleanedUpdate.primaryWifiName ?? current.primaryWifiName,
      backupWifiName: cleanedUpdate.backupWifiName ?? current.backupWifiName,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, DEMO_USER_ID));

  const profile = await getDemoStoreProfile();
  console.log(
    `[profile] updated demo profile: storeName=${profile.storeName} estimatedDailyRevenue=${profile.estimatedDailyRevenue}`,
  );
  return profile;
}
