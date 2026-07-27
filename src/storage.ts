import type { AppData, Settings, GunlukOzet, GiderDetay, SubscriptionPlan } from "./types";
import { TRIAL_DAYS, SUBSCRIPTION_DURATIONS } from "./types";
import { supabase } from "./supabase";

const STORAGE_KEY = "kurye-defteri-v2";

export const DEFAULT_SETTINGS: Settings = {
  darkMode: false, vehicleModel: "", engineSize: "",
  fuelConsumption: 0, trialStartDate: null, subscriptionState: "trial",
  subscriptionStartDate: null, subscriptionPlan: null,
  reminder: { enabled: false, hour: 21, minute: 30, days: [1, 2, 3, 4, 5, 6, 0] },
};

export const DEFAULT_DATA: AppData = {
  ozetler: {}, settings: DEFAULT_SETTINGS,
};

export function createEmptyOzet(tarih: string): GunlukOzet {
  return {
    tarih,
    calisma_saati: 0,
    teslimat_sayisi: 0,
    brut_kazanc: 0,
    bahsis: 0,
    toplam_gider: 0,
    net_kazanc: 0,
    baslangic_km: null,
    bitis_km: null,
    toplam_km: 0,
    gider_detaylari: {},
    notlar_detay: {},
    notlar: null,
    platformlar: {},
    vergi_aktif: false,
    vergi_orani: 20,
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      ozetler: parsed.ozetler ?? {},
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch { return DEFAULT_DATA; }
}

export function saveData(data: AppData): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDateTR(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export function formatDateShortTR(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(Math.round(n));
}

export function formatCurrencyDetailed(n: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 }).format(n);
}

export function getTrialDaysRemaining(settings: Settings): number {
  if (settings.subscriptionState === "active") return TRIAL_DAYS;
  if (!settings.trialStartDate) return TRIAL_DAYS;
  const start = new Date(settings.trialStartDate + "T00:00:00");
  const today = new Date(todayStr() + "T00:00:00");
  const elapsed = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, TRIAL_DAYS - elapsed);
}

export function isTrialExpired(settings: Settings): boolean {
  return settings.subscriptionState !== "active" && getTrialDaysRemaining(settings) <= 0;
}

export function getSubscriptionDaysRemaining(settings: Settings): number {
  if (settings.subscriptionState !== "active") return 0;
  if (!settings.subscriptionStartDate || !settings.subscriptionPlan) return 0;
  const start = new Date(settings.subscriptionStartDate + "T00:00:00");
  const today = new Date(todayStr() + "T00:00:00");
  const elapsed = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const total = SUBSCRIPTION_DURATIONS[settings.subscriptionPlan];
  return Math.max(0, total - elapsed);
}

export function isSubscriptionExpired(settings: Settings): boolean {
  return settings.subscriptionState === "active" && getSubscriptionDaysRemaining(settings) <= 0;
}

export function isAccessLocked(settings: Settings): boolean {
  return isTrialExpired(settings) || isSubscriptionExpired(settings);
}

export function getDaysRemaining(settings: Settings): number {
  if (settings.subscriptionState === "active") return getSubscriptionDaysRemaining(settings);
  return getTrialDaysRemaining(settings);
}

// --- Supabase sync (single table: gunluk_ozetler) ---

export async function upsertOzetToSupabase(userId: string, ozet: GunlukOzet): Promise<void> {
  await supabase.from("gunluk_ozetler").upsert({
    user_id: userId,
    tarih: ozet.tarih,
    calisma_saati: ozet.calisma_saati,
    teslimat_sayisi: ozet.teslimat_sayisi,
    brut_kazanc: ozet.brut_kazanc,
    bahsis: ozet.bahsis,
    toplam_gider: ozet.toplam_gider,
    net_kazanc: ozet.net_kazanc,
    baslangic_km: ozet.baslangic_km,
    bitis_km: ozet.bitis_km,
    toplam_km: ozet.toplam_km,
    gider_detaylari: ozet.gider_detaylari,
    notlar_detay: ozet.notlar_detay,
    notlar: ozet.notlar,
    platformlar: ozet.platformlar,
    vergi_aktif: ozet.vergi_aktif,
    vergi_orani: ozet.vergi_orani,
  }, { onConflict: "user_id,tarih" });
}

export async function deleteOzetFromSupabase(userId: string, tarih: string): Promise<void> {
  await supabase.from("gunluk_ozetler").delete().eq("user_id", userId).eq("tarih", tarih);
}

export async function fetchAllOzetlerFromSupabase(userId: string): Promise<Record<string, GunlukOzet>> {
  const { data, error } = await supabase
    .from("gunluk_ozetler")
    .select("*")
    .eq("user_id", userId)
    .order("tarih", { ascending: false });

  if (error || !data) return {};

  const ozetler: Record<string, GunlukOzet> = {};
  for (const row of data) {
    ozetler[row.tarih] = {
      tarih: row.tarih,
      calisma_saati: Number(row.calisma_saati) || 0,
      teslimat_sayisi: row.teslimat_sayisi || 0,
      brut_kazanc: Number(row.brut_kazanc) || 0,
      bahsis: Number(row.bahsis) || 0,
      toplam_gider: Number(row.toplam_gider) || 0,
      net_kazanc: Number(row.net_kazanc) || 0,
      baslangic_km: row.baslangic_km != null ? Number(row.baslangic_km) : null,
      bitis_km: row.bitis_km != null ? Number(row.bitis_km) : null,
      toplam_km: Number(row.toplam_km) || 0,
      gider_detaylari: (row.gider_detaylari as GiderDetay) ?? {},
      notlar_detay: (row.notlar_detay as Record<string, string>) ?? {},
      notlar: row.notlar ?? null,
      platformlar: row.platformlar ?? {},
      vergi_aktif: row.vergi_aktif ?? false,
      vergi_orani: row.vergi_orani ?? 20,
    };
  }
  return ozetler;
}
