export type PlatformKey = "trendyol" | "getir" | "yemeksepeti" | "diger" | "toplu";

export interface PlatformEntry {
  earnings: number;
  packages: number;
}

export interface GiderDetay {
  yakit?: number;
  yemek?: number;
  ceza?: number;
  bakim?: number;
  ekipman?: number;
  muhasibe?: number;
  diger?: number;
  [key: string]: number | undefined;
}

export interface GunlukOzet {
  tarih: string;
  calisma_saati: number;
  teslimat_sayisi: number;
  brut_kazanc: number;
  bahsis: number;
  toplam_gider: number;
  net_kazanc: number;
  baslangic_km: number | null;
  bitis_km: number | null;
  toplam_km: number;
  gider_detaylari: GiderDetay;
  notlar_detay: Record<string, string>;
  notlar: string | null;
  platformlar: Partial<Record<PlatformKey, PlatformEntry>>;
  vergi_aktif: boolean;
  vergi_orani: number;
}

export type SubscriptionState = "trial" | "active" | "expired";

export type SubscriptionPlan = "monthly" | "yearly";

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  days: number[];
}

export interface Settings {
  darkMode: boolean;
  vehicleModel: string;
  engineSize: string;
  fuelConsumption: number;
  trialStartDate: string | null;
  subscriptionState: SubscriptionState;
  subscriptionStartDate?: string | null;
  subscriptionPlan?: SubscriptionPlan | null;
  lastLiterPrice?: number;
  reminder?: ReminderSettings;
}

export interface AppData {
  ozetler: Record<string, GunlukOzet>;
  settings: Settings;
}

export const TRIAL_DAYS = 20;

export const SUBSCRIPTION_DURATIONS: Record<SubscriptionPlan, number> = {
  monthly: 30,
  yearly: 365,
};

export const PLATFORM_LABELS: Record<PlatformKey, string> = {
  trendyol: "Trendyol Go", getir: "Getir", yemeksepeti: "Yemeksepeti",
  diger: "Diğer / Özel", toplu: "Toplu Gelir",
};

export const PLATFORM_COLORS: Record<PlatformKey, string> = {
  trendyol: "#f97316", getir: "#6366f1", yemeksepeti: "#eab308",
  diger: "#10b981", toplu: "#64748b",
};

export type ExpenseCategory =
  | "yakit" | "bakim" | "ekipman" | "ceza" | "yemek" | "muhasibe" | "diger";

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, { label: string; icon: string; color: string }> = {
  yakit: { label: "Yakıt", icon: "fuel", color: "#f97316" },
  bakim: { label: "Motor Masrafları", icon: "wrench", color: "#6366f1" },
  ekipman: { label: "Ekipman / Kıyafet", icon: "shirt", color: "#a855f7" },
  ceza: { label: "Trafik Cezası", icon: "alert-octagon", color: "#ef4444" },
  yemek: { label: "Yemek / Su", icon: "utensils", color: "#f97316" },
  muhasibe: { label: "Muhasebe / Bağ-Kur", icon: "calculator", color: "#14b8a6" },
  diger: { label: "Diğer", icon: "more-horizontal", color: "#64748b" },
};
