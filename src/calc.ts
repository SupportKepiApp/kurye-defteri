import type { AppData, GunlukOzet, PlatformKey } from "./types";
import { PLATFORM_LABELS, PLATFORM_COLORS } from "./types";

export function getOzet(data: AppData, tarih: string): GunlukOzet | undefined {
  return data.ozetler[tarih];
}

export function brutKazanc(ozet: GunlukOzet | undefined): number {
  if (!ozet) return 0;
  return Object.values(ozet.platformlar).reduce((sum, p) => sum + (p?.earnings ?? 0), 0);
}

export function teslimatSayisi(ozet: GunlukOzet | undefined): number {
  if (!ozet) return 0;
  return Object.values(ozet.platformlar).reduce((sum, p) => sum + (p?.packages ?? 0), 0);
}

export function vergiTutar(ozet: GunlukOzet | undefined): number {
  if (!ozet || !ozet.vergi_aktif) return 0;
  return brutKazanc(ozet) * (ozet.vergi_orani / 100);
}

export function netKazanc(ozet: GunlukOzet | undefined): number {
  if (!ozet) return 0;
  return ozet.brut_kazanc + ozet.bahsis - ozet.toplam_gider - vergiTutar(ozet);
}

export function giderDetayToplam(ozet: GunlukOzet | undefined): number {
  if (!ozet) return 0;
  return Object.values(ozet.gider_detaylari).reduce<number>((sum, v) => sum + (v ?? 0), 0);
}

export function yakitGider(ozet: GunlukOzet | undefined): number {
  return ozet?.gider_detaylari?.yakit ?? 0;
}

export function recalcOzet(ozet: GunlukOzet): GunlukOzet {
  const brut = Object.values(ozet.platformlar).reduce<number>((s, p) => s + (p?.earnings ?? 0), 0);
  const teslimat = Object.values(ozet.platformlar).reduce<number>((s, p) => s + (p?.packages ?? 0), 0);
  const gider = Object.values(ozet.gider_detaylari).reduce<number>((s, v) => s + (v ?? 0), 0);
  const vergi = ozet.vergi_aktif ? brut * (ozet.vergi_orani / 100) : 0;
  const net = brut + ozet.bahsis - gider - vergi;
  const toplamKm = ozet.toplam_km;
  return {
    ...ozet,
    brut_kazanc: brut,
    teslimat_sayisi: teslimat,
    toplam_gider: gider,
    net_kazanc: net,
    toplam_km: toplamKm,
  };
}

export interface PeriodSummary {
  brut: number; vergi: number; gider: number; net: number;
  teslimat: number; saat: number; saatlik: number; km: number; bahsis: number;
}

export function summarizePeriod(data: AppData, dates: string[]): PeriodSummary {
  const s: PeriodSummary = { brut: 0, vergi: 0, gider: 0, net: 0, teslimat: 0, saat: 0, saatlik: 0, km: 0, bahsis: 0 };
  for (const date of dates) {
    const ozet = data.ozetler[date];
    if (!ozet) continue;
    s.brut += ozet.brut_kazanc;
    s.vergi += vergiTutar(ozet);
    s.gider += ozet.toplam_gider;
    s.net += netKazanc(ozet);
    s.teslimat += ozet.teslimat_sayisi;
    s.saat += ozet.calisma_saati;
    s.km += ozet.toplam_km;
    s.bahsis += ozet.bahsis;
  }
  s.saatlik = s.saat > 0 ? s.net / s.saat : 0;
  return s;
}

export function platformRevenueShare(data: AppData, dates: string[]): { key: PlatformKey; label: string; value: number; color: string }[] {
  const totals: Record<string, number> = {};
  for (const date of dates) {
    const ozet = data.ozetler[date];
    if (!ozet) continue;
    for (const [key, entry] of Object.entries(ozet.platformlar)) {
      if (key === "toplu") continue;
      totals[key] = (totals[key] ?? 0) + (entry?.earnings ?? 0);
    }
  }
  return (Object.keys(PLATFORM_LABELS) as PlatformKey[])
    .filter((k) => k !== "toplu" && (totals[k] ?? 0) > 0)
    .map((k) => ({ key: k, label: PLATFORM_LABELS[k], value: totals[k], color: PLATFORM_COLORS[k] }));
}

export function getDatesForPeriod(period: "daily" | "weekly" | "monthly" | "yearly"): string[] {
  const today = new Date();
  const dates: string[] = [];
  if (period === "daily") { dates.push(today.toISOString().slice(0, 10)); }
  else if (period === "weekly") {
    for (let i = 6; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); dates.push(d.toISOString().slice(0, 10)); }
  } else if (period === "monthly") {
    for (let i = 29; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); dates.push(d.toISOString().slice(0, 10)); }
  } else {
    const start = new Date(today); start.setMonth(start.getMonth() - 11); start.setDate(1);
    while (start <= today) {
      const y = start.getFullYear(), m = start.getMonth();
      const lastDay = new Date(y, m + 1, 0).getDate();
      for (let d = 1; d <= lastDay; d++) { const date = new Date(y, m, d); if (date <= today) dates.push(date.toISOString().slice(0, 10)); }
      start.setMonth(start.getMonth() + 1);
    }
  }
  return dates;
}

export function weeklyProfitData(data: AppData): { day: string; net: number }[] {
  const today = new Date();
  const result: { day: string; net: number }[] = [];
  const dayLabels = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const ozet = data.ozetler[dateStr];
    result.push({ day: dayLabels[d.getDay()], net: Math.round(netKazanc(ozet)) });
  }
  return result;
}

export function expenseBreakdown(data: AppData, dates: string[]): { label: string; value: number; color: string }[] {
  const totals: Record<string, number> = {};
  for (const date of dates) {
    const ozet = data.ozetler[date];
    if (!ozet) continue;
    for (const [key, val] of Object.entries(ozet.gider_detaylari)) {
      if (val && val > 0) totals[key] = (totals[key] ?? 0) + val;
    }
  }
  const labels: Record<string, { label: string; color: string }> = {
    yakit: { label: "Yakıt", color: "#f97316" },
    bakim: { label: "Bakım", color: "#6366f1" },
    lastik: { label: "Lastik", color: "#0ea5e9" },
    ekipman: { label: "Ekipman", color: "#a855f7" },
    ceza: { label: "Ceza", color: "#ef4444" },
    yemek: { label: "Yemek", color: "#f59e0b" },
    muhasibe: { label: "Muhasebe", color: "#14b8a6" },
    diger: { label: "Diğer", color: "#64748b" },
  };
  return Object.entries(totals)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ label: labels[k]?.label ?? k, value: v, color: labels[k]?.color ?? "#64748b" }));
}
