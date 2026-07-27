import { Calculator, Clock, Check, Plus, Trash2, ChevronDown, ChevronUp, Calendar, Loader2, AlertCircle, Bike } from "lucide-react";
import type { AppData, GunlukOzet, PlatformKey } from "../types";
import { PLATFORM_LABELS, PLATFORM_COLORS } from "../types";
import { useState } from "react";
import { todayStr, formatDateTR, createEmptyOzet, upsertOzetToSupabase } from "../storage";
import { brutKazanc, teslimatSayisi, vergiTutar, netKazanc, recalcOzet } from "../calc";
import { Switch } from "../components/Switch";
import { Modal } from "../components/Modal";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const PLATFORM_OPTIONS = (Object.keys(PLATFORM_LABELS) as PlatformKey[]).map((key) => ({
  key, label: PLATFORM_LABELS[key], color: PLATFORM_COLORS[key],
}));

interface Props {
  data: AppData;
  updateOzet: (tarih: string, updater: (o: GunlukOzet) => GunlukOzet) => void;
  user: SupabaseUser | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function EarningsTab({ data, updateOzet, user, selectedDate, onDateChange }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [addModal, setAddModal] = useState(false);

  const ozet: GunlukOzet = data.ozetler[selectedDate] ?? createEmptyOzet(selectedDate);

  const patchOzet = (patch: Partial<GunlukOzet>) => {
    updateOzet(selectedDate, (o) => recalcOzet({ ...o, ...patch }));
  };

  const updatePlatform = (key: PlatformKey, field: "earnings" | "packages", value: number) => {
    updateOzet(selectedDate, (o) => {
      const existing = o.platformlar[key] ?? { earnings: 0, packages: 0 };
      return recalcOzet({ ...o, platformlar: { ...o.platformlar, [key]: { ...existing, [field]: value } } });
    });
  };

  const addPlatform = (key: PlatformKey) => {
    if (ozet.platformlar[key]) return;
    updateOzet(selectedDate, (o) => recalcOzet({ ...o, platformlar: { ...o.platformlar, [key]: { earnings: 0, packages: 0 } } }));
    setAddModal(false);
  };

  const removePlatform = (key: PlatformKey) => {
    updateOzet(selectedDate, (o) => {
      const newPlatforms = { ...o.platformlar };
      delete newPlatforms[key];
      return recalcOzet({ ...o, platformlar: newPlatforms });
    });
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      const current = data.ozetler[selectedDate] ?? createEmptyOzet(selectedDate);
      const final = recalcOzet(current);
      updateOzet(selectedDate, () => final);
      if (user) await upsertOzetToSupabase(user.id, final);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const addedPlatformKeys = Object.keys(ozet.platformlar) as PlatformKey[];
  const availablePlatforms = PLATFORM_OPTIONS.filter((p) => !ozet.platformlar[p.key]);

  const brut = brutKazanc(ozet);
  const net = netKazanc(ozet);

  return (
    <div className="space-y-4">
      <div className="card">
        <label className="label flex items-center gap-1.5">
          <Calendar size={16} className="text-slate-400" />
          Tarih Seçimi <span className="badge-required">Zorunlu</span>
        </label>
        <input type="date" className="input" value={selectedDate} max={todayStr()} onChange={(e) => onDateChange(e.target.value)} />
        <p className="helper">
          {selectedDate === todayStr() ? "Bugünün kaydını giriyorsunuz" : `${formatDateTR(selectedDate)} tarihine ait kaydı düzenliyorsunuz`}
        </p>
      </div>

      <div className="card bg-gradient-to-br from-brand-500 to-brand-700 text-white">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-brand-50">Brüt</p>
            <p className="mt-0.5 text-sm font-bold">{brut.toFixed(0)} TL</p>
          </div>
          <div>
            <p className="text-xs text-brand-50">Gider</p>
            <p className="mt-0.5 text-sm font-bold">{ozet.toplam_gider.toFixed(0)} TL</p>
          </div>
          <div>
            <p className="text-xs text-brand-50">Net</p>
            <p className="mt-0.5 text-sm font-bold">{net.toFixed(0)} TL</p>
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-slate-500" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">Vergi Tahminini Düş</span>
          </div>
          <Switch checked={ozet.vergi_aktif} onChange={(v) => patchOzet({ vergi_aktif: v })} label="Vergi tahmini" />
        </div>
        <p className="helper">Açık olduğunda tahmini KDV ve gelir vergisi düşülerek net kazanç gösterilir.</p>
        {ozet.vergi_aktif && (
          <div className="fade-in space-y-3">
            <div>
              <label className="label">Vergi Oranı (%) <span className="badge-required">Zorunlu</span></label>
              <input type="number" inputMode="decimal" className="input" value={ozet.vergi_orani} onChange={(e) => patchOzet({ vergi_orani: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
        )}
      </div>

      {addedPlatformKeys.map((key) => {
        const meta = PLATFORM_OPTIONS.find((p) => p.key === key)!;
        const entry = ozet.platformlar[key];
        return (
          <div key={key} className="card fade-in">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ background: meta.color }} />
                <span className="font-semibold text-slate-900 dark:text-slate-100">{meta.label}</span>
              </div>
              <button onClick={() => removePlatform(key)} className="tap-target-lg rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30">
                <Trash2 size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Kazanç (TL) <span className="badge-required">Zorunlu</span></label>
                <input type="number" inputMode="decimal" className="input" placeholder="0" value={entry?.earnings ?? ""} onChange={(e) => updatePlatform(key, "earnings", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="label">Paket <span className="badge-optional">Opsiyonel</span></label>
                <input type="number" inputMode="numeric" className="input" placeholder="0" value={entry?.packages ?? ""} onChange={(e) => updatePlatform(key, "packages", parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <p className="helper">Platform panelinizde yazan toplam hakediş tutarını girin.</p>
          </div>
        );
      })}

      {availablePlatforms.length > 0 && (
        <button onClick={() => setAddModal(true)} className="tap-target-lg flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 font-medium text-slate-500 transition hover:border-brand-400 hover:text-brand-500 dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-500">
          <Plus size={22} /> Platform / Gelir Ekle
        </button>
      )}

      <div className="card space-y-3">
        <label className="label">Bahşiş (TL) <span className="badge-optional">Opsiyonel</span></label>
        <input type="number" inputMode="decimal" className="input" placeholder="0" value={ozet.bahsis || ""} onChange={(e) => patchOzet({ bahsis: parseFloat(e.target.value) || 0 })} />
        <p className="helper">Gün içinde aldığınız toplam bahşiş tutarını girin.</p>
      </div>

      <button onClick={() => setShowAdvanced(!showAdvanced)} className="btn-ghost w-full justify-between">
        <span className="flex items-center gap-2"><Clock size={18} /> Çalışma Saati & KM</span>
        {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {showAdvanced && (
        <div className="fade-in card space-y-3">
          <div>
            <label className="label">Bugün Çalışılan Saat <span className="badge-optional">Opsiyonel</span></label>
            <input type="number" inputMode="decimal" className="input" value={ozet.calisma_saati} onChange={(e) => patchOzet({ calisma_saati: parseFloat(e.target.value) || 0 })} />
            <p className="helper">Saatlik net kazanç hesaplamak için çalışma sürenizi girin.</p>
          </div>
          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            <label className="label">Günlük KM <span className="badge-optional">Opsiyonel</span></label>
            <input type="number" inputMode="numeric" className="input" placeholder="0" value={ozet.toplam_km || ""} onChange={(e) => patchOzet({ toplam_km: parseFloat(e.target.value) || 0 })} />
            <p className="helper">Bugün kat ettiğiniz ortalama yolu girin.</p>
          </div>
        </div>
      )}

      {saveStatus === "error" && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
          <AlertCircle size={16} className="flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-400">Kaydedilemedi. İnternet bağlantınızı kontrol edin.</p>
        </div>
      )}

      <button onClick={handleSave} disabled={saveStatus === "saving"} className="btn-primary disabled:opacity-70">
        {saveStatus === "saving" ? (<><Loader2 size={20} className="spin" /> Kaydediliyor...</>) : saveStatus === "saved" ? (<><Check size={20} /> Gelirleri Kaydedildi!</>) : "Gelirleri Kaydet"}
      </button>

      <p className="helper-red pb-2 text-center">Gün sonundaki gelir ve giderlerinizi düzenli olarak giriniz.</p>

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Platform Ekle">
        <div className="space-y-2">
          {availablePlatforms.map((p) => (
            <button key={p.key} onClick={() => addPlatform(p.key)} className="tap-target-lg flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-400 hover:bg-brand-50 dark:border-slate-700 dark:hover:bg-brand-900/20">
              <div className="h-4 w-4 rounded-full" style={{ background: p.color }} />
              <span className="font-medium text-slate-900 dark:text-slate-100">{p.label}</span>
              <Plus size={18} className="ml-auto text-slate-400" />
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
