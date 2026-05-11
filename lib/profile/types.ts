export type StoreProfile = {
  id: string;
  storeName: string;
  ownerName: string;
  telegramChatId: string;
  estimatedDailyRevenue: number;
  primaryWifiName: string;
  backupWifiName: string;
  createdAt: string;
  updatedAt: string;
};

export type StoreProfileUpdate = Partial<
  Pick<
    StoreProfile,
    | "storeName"
    | "ownerName"
    | "telegramChatId"
    | "estimatedDailyRevenue"
    | "primaryWifiName"
    | "backupWifiName"
  >
>;

export const fallbackStoreProfile: StoreProfile = {
  id: "demo-user",
  storeName: "Toko Sinar Rasa",
  ownerName: "Pemilik Toko",
  telegramChatId: "demo-telegram-chat",
  estimatedDailyRevenue: 8500000,
  primaryWifiName: "WiFi Utama Toko",
  backupWifiName: "Hotspot HP Cadangan",
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};
