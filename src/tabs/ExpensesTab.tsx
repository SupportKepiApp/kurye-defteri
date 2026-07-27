import { useState } from "react";
import { Fuel as FuelIcon, Wrench, Shirt, AlertOctagon, Utensils, Calculator, MoreHorizontal, Trash2, Plus, TrendingDown, Check, Loader2, AlertCircle, Calendar } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppData, GunlukOzet, ExpenseCategory } from "../types";
import { EXPENSE_CATEGORIES } from "../types";
import { todayStr, formatCurrency, formatDateTR, createEmptyOzet, upsertOzetToSupabase } from "../storage";
import { recalcOzet } from "../calc";
import { Modal } from "../components/Modal";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const ICON_MAP: Record<string, LucideIcon> = {
  fuel: FuelIcon, wrench: Wrench, shirt: Shirt,
  "alert-octagon": AlertOctagon, utensils: Utensils, calculator: Calculator, "more-horizontal": MoreHorizontal,
};

const CATEGORIES = Object.entries(EXPENSE_CATEGORIES) as [ExpenseCategory, { label: string; icon: string; color: string }][];

interface Props {
  data: AppData;
  updateOzet: (tarih: string, updater: (o: GunlukOzet) => GunlukOzet) => void;
  user: SupabaseUser | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function ExpensesTab({ data, updateOzet, user, selectedDate, onDateChange }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [arizaAdi, setArizaAdi] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("yakit");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const today = todayStr();
  const selectedOzet = data.ozetler[selectedDate];
  const selectedTotal = selectedOzet?.toplam_gider ?? 0;

  // Only show expenses for the currently selected date
  const selectedExpenses: { category: ExpenseCategory; amount: number; title: string; arizaAdi?: string }[] = [];
  const ozet = data.ozetler[selectedDate];
  if (ozet) {
    for (const [cat, val] of Object.entries(ozet.gider_detaylari)) {
      if (val && val > 0) {
        selectedExpenses.push({
          category: cat as ExpenseCategory,
          amount: val,
          title: EXPENSE_CATEGORIES[cat as ExpenseCategory]?.label ?? cat,
          arizaAdi: ozet.notlar_detay?.[`${cat}_ariza`],
        });
      }
    }
  }

  const openModal = (cat: ExpenseCategory) => {
    setCategory(cat);
    setAmount("");
    setArizaAdi("");
    setModalOpen(true);
  };

  const addExpense = () => {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return;
    const cat = category;
    const ariza = arizaAdi.trim();
    updateOzet(selectedDate, (o) => {
      const current = o.gider_detaylari[cat] ?? 0;
      const newDetay = { ...o.gider_detaylari, [cat]: current + amt };
      const newNotlarDetay = { ...o.notlar_detay };
      if (cat === "bakim" && ariza) newNotlarDetay["bakim_ariza"] = ariza;
      return { ...o, gider_detaylari: newDetay, notlar_detay: newNotlarDetay };
    });
    setAmount(""); setArizaAdi(""); setModalOpen(false);
  };

  const removeExpense = (dateStr: string, cat: ExpenseCategory) => {
    updateOzet(dateStr, (o) => {
      const newDetay = { ...o.gider_detaylari };
      delete newDetay[cat];
      return { ...o, gider_detaylari: newDetay };
    });
  };

  const handleSaveExpenses = async () => {
    setSaveStatus("saving");
    try {
      if (user) {
        const ozet = data.ozetler[selectedDate] ?? createEmptyOzet(selectedDate);
        await upsertOzetToSupabase(user.id, recalcOzet(ozet));
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Synced date selector */}
      <div className="card">
        <label className="label flex items-center gap-1.5">
          <Calendar size={16} className="text-slate-400" />
          Tarih Seçimi
        </label>
        <input type="date" className="input" value={selectedDate} max={today} onChange={(e) => onDateChange(e.target.value)} />
        <p className="helper">
          {selectedDate === today ? "Bugünün giderleri" : `${formatDateTR(selectedDate)} tarihine ait giderler`}
        </p>
      </div>

      <div className="card bg-gradient-to-br from-indigo-500 to-indigo-700 text-white">
        <p className="text-sm font-medium text-indigo-50">
          {selectedDate === today ? "Bugünkü Toplam Gider" : `${formatDateTR(selectedDate)} Toplam Gider`}
        </p>
        <p className="mt-1 text-2xl font-bold">{formatCurrency(selectedTotal)}</p>
      </div>

      <button onClick={() => openModal("yakit")} className="btn-primary"><Plus size={22} /> Gider Ekle</button>

      <div className="grid grid-cols-3 gap-2">
        {CATEGORIES.map(([key, cat]) => {
          const Icon = ICON_MAP[cat.icon];
          const count = selectedExpenses.filter((e) => e.category === key).length;
          return (
            <button key={key} onClick={() => openModal(key)} className="flex flex-col items-center gap-1 rounded-xl bg-white p-3 shadow-sm transition active:scale-95 dark:bg-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: cat.color + "20" }}>{Icon && <Icon size={18} />}</div>
              <span className="text-[10px] font-medium leading-tight text-center text-slate-600 dark:text-slate-400">{cat.label.split(" / ")[0]}</span>
              {count > 0 && <span className="text-[9px] text-slate-400">{count} kayıt</span>}
            </button>
          );
        })}
      </div>

      {selectedExpenses.length > 0 && (
        <div className="space-y-2">
          <h3 className="px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {formatDateTR(selectedDate)} Giderleri
          </h3>
          {selectedExpenses.map((e, i) => {
            const cat = EXPENSE_CATEGORIES[e.category];
            const Icon = cat ? ICON_MAP[cat.icon] : MoreHorizontal;
            return (
              <div key={`${e.category}-${i}`} className="card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: (cat?.color ?? "#64748b") + "20" }}>{Icon && <Icon size={18} />}</div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {e.title}{e.arizaAdi ? ` — ${e.arizaAdi}` : ""}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{cat?.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-red-500">-{formatCurrency(e.amount)}</span>
                  <button onClick={() => removeExpense(selectedDate, e.category)} className="tap-target-lg rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedExpenses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <TrendingDown size={48} className="text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Henüz gider kaydı yok</p>
          <p className="text-xs text-slate-400">Yakıt, motor masrafları, ceza, ekipman gibi giderleri ekleyin</p>
        </div>
      )}

      {saveStatus === "error" && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
          <AlertCircle size={16} className="flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-400">Kaydedilemedi. İnternet bağlantınızı kontrol edin.</p>
        </div>
      )}

      <button onClick={handleSaveExpenses} disabled={saveStatus === "saving"} className="btn-primary disabled:opacity-70">
        {saveStatus === "saving" ? (<><Loader2 size={20} className="spin" /> Kaydediliyor...</>) : saveStatus === "saved" ? (<><Check size={20} /> Giderler Kaydedildi!</>) : "Giderleri Kaydet"}
      </button>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Gider Ekle">
        <div className="space-y-3">
          {/* Arıza adı only for Motor Masrafları */}
          {category === "bakim" && (
            <div className="fade-in">
              <label className="label">Arıza Adı <span className="badge-optional">Opsiyonel</span></label>
              <input
                type="text"
                className="input"
                placeholder="Örn: Fren balatası, yağ değişimi..."
                value={arizaAdi}
                onChange={(e) => setArizaAdi(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="label">Tutar (TL) <span className="badge-required">Zorunlu</span></label>
            <input type="number" inputMode="decimal" className="input" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus={category !== "bakim"} />
            {category === "yakit" && <p className="helper">Sadece aldığınız benzin tutarını girmeniz yeterlidir.</p>}
          </div>
          <div>
            <label className="label">Kategori</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(([key, cat]) => {
                const Icon = ICON_MAP[cat.icon];
                return (
                  <button key={key} onClick={() => setCategory(key)} className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-medium transition ${category === key ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400"}`}>
                    {Icon && <Icon size={16} />}
                    <span className="truncate">{cat.label.split(" / ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={addExpense} className="btn-primary mt-2">Kaydet</button>
        </div>
      </Modal>
    </div>
  );
}
