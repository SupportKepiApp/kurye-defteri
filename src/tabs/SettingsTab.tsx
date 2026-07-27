import { useState } from "react";
import { Bike, Route, Bell, BellOff, Clock, Save, Check, AlertCircle } from "lucide-react";
import type { AppData, Settings, ReminderSettings } from "../types";
import { formatDateTR } from "../storage";
import { Switch } from "../components/Switch";
import { scheduleReminders, cancelAllReminders, requestNotificationPermissions } from "../reminder";

interface Props {
  data: AppData;
  updateData: (updater: (d: AppData) => AppData) => void;
}

const DAYS = [
  { id: 1, short: "Pzt" },
  { id: 2, short: "Sal" },
  { id: 3, short: "Çar" },
  { id: 4, short: "Per" },
  { id: 5, short: "Cum" },
  { id: 6, short: "Cmt" },
  { id: 0, short: "Pzr" },
];

export function SettingsTab({ data, updateData }: Props) {
  const updateSettings = (patch: Partial<Settings>) => {
    updateData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  };

  const reminder: ReminderSettings = data.settings.reminder ?? {
    enabled: false, hour: 21, minute: 30, days: [1, 2, 3, 4, 5, 6, 0],
  };

  const [hourInput, setHourInput] = useState(String(reminder.hour).padStart(2, "0"));
  const [minuteInput, setMinuteInput] = useState(String(reminder.minute).padStart(2, "0"));
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const updateReminder = (patch: Partial<ReminderSettings>) => {
    updateSettings({ reminder: { ...reminder, ...patch } });
  };

  const toggleDay = (dayId: number) => {
    const has = reminder.days.includes(dayId);
    const next = has
      ? reminder.days.filter((d) => d !== dayId)
      : [...reminder.days, dayId].sort((a, b) => {
          const order = [1, 2, 3, 4, 5, 6, 0];
          return order.indexOf(a) - order.indexOf(b);
        });
    updateReminder({ days: next });
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    const h = Math.min(23, Math.max(0, parseInt(hourInput) || 0));
    const m = Math.min(59, Math.max(0, parseInt(minuteInput) || 0));
    setHourInput(String(h).padStart(2, "0"));
    setMinuteInput(String(m).padStart(2, "0"));

    const updated = { ...reminder, hour: h, minute: m };
    updateSettings({ reminder: updated });

    if (updated.enabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        setSaveStatus("error");
        return;
      }
    }

    const ok = await scheduleReminders(updated);
    setSaveStatus(ok ? "saved" : "error");
    setTimeout(() => setSaveStatus("idle"), 3000);
  };

  const kmHistory = Object.values(data.ozetler)
    .filter((o) => o.toplam_km > 0)
    .sort((a, b) => b.tarih.localeCompare(a.tarih));
  const totalKM = kmHistory.reduce((sum, o) => sum + o.toplam_km, 0);

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <Route size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">KM Geçmişi</h3>
        </div>

        {kmHistory.length > 0 ? (
          <>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-xs text-slate-500">Toplam KM</p>
              <p className="text-xl font-bold text-brand-500">{totalKM.toLocaleString("tr-TR")} km</p>
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto no-scrollbar">
              {kmHistory.map((o) => (
                <div key={o.tarih} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{o.toplam_km.toLocaleString("tr-TR")} km</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTR(o.tarih)}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">Henüz KM kaydı yok. Gün Sonu sekmesinden günlük KM değerini girerek takip edebilirsiniz.</p>
        )}
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {reminder.enabled ? <Bell size={18} className="text-brand-500" /> : <BellOff size={18} className="text-slate-400" />}
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Hatırlatıcı</h3>
          </div>
          <Switch
            checked={reminder.enabled}
            onChange={async (v) => {
              if (v) {
                const granted = await requestNotificationPermissions();
                if (!granted) return;
                updateReminder({ enabled: v });
              } else {
                updateReminder({ enabled: v });
                await cancelAllReminders();
              }
            }}
            label="Hatırlatıcı"
          />
        </div>

        {reminder.enabled && (
          <div className="fade-in space-y-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div>
              <label className="label">Saat</label>
              <div className="flex items-center justify-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={23}
                  className="input w-20 text-center text-2xl font-bold"
                  value={hourInput}
                  onChange={(e) => setHourInput(e.target.value.slice(0, 2))}
                  placeholder="21"
                />
                <span className="text-2xl font-bold text-slate-400">:</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={59}
                  className="input w-20 text-center text-2xl font-bold"
                  value={minuteInput}
                  onChange={(e) => setMinuteInput(e.target.value.slice(0, 2))}
                  placeholder="30"
                />
                <Clock size={20} className="ml-1 text-slate-400" />
              </div>
              <p className="helper text-center">Saat ve dakikayı girin (örn. 21:30)</p>
            </div>

            <div>
              <label className="label">Günler</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => {
                  const active = reminder.days.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      onClick={() => toggleDay(day.id)}
                      className={`min-w-[44px] rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        active
                          ? "border-brand-500 bg-brand-500 text-white"
                          : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {day.short}
                    </button>
                  );
                })}
              </div>
              <p className="helper">Bildirimin geleceği günleri seçin.</p>
            </div>

            {reminder.days.length === 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400">En az bir gün seçmelisiniz.</p>
            )}

            <button
              onClick={handleSave}
              disabled={saveStatus === "saving" || reminder.days.length === 0}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold transition ${
                saveStatus === "saved"
                  ? "bg-green-500 text-white"
                  : saveStatus === "error"
                  ? "bg-red-500 text-white"
                  : "bg-brand-500 text-white hover:bg-brand-600"
              } disabled:opacity-50`}
            >
              {saveStatus === "saving" && <Save size={18} className="animate-pulse" />}
              {saveStatus === "saved" && <Check size={18} />}
              {saveStatus === "error" && <AlertCircle size={18} />}
              {saveStatus === "idle" && <Save size={18} />}
              {saveStatus === "saving" ? "Kaydediliyor..." : saveStatus === "saved" ? "Kaydedildi!" : saveStatus === "error" ? "İzin gerekli!" : "Hatırlatıcıyı Kaydet"}
            </button>

            {saveStatus === "saved" && (
              <p className="flex items-center justify-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                <Check size={16} />
                Hatırlatıcı ayarlandı. Seçili gün ve saatte bildirim gelecek.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <Bike size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Araç Profili</h3>
        </div>
        <div>
          <label className="label">Motosiklet Modeli <span className="badge-optional">Opsiyonel</span></label>
          <input type="text" className="input" placeholder="Örn: Honda PCX 125" value={data.settings.vehicleModel} onChange={(e) => updateSettings({ vehicleModel: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Motor Hacmi (cc) <span className="badge-optional">Opsiyonel</span></label>
            <input type="text" className="input" placeholder="125" value={data.settings.engineSize} onChange={(e) => updateSettings({ engineSize: e.target.value })} />
          </div>
          <div>
            <label className="label">Ort. Tüketim (L/100km) <span className="badge-optional">Opsiyonel</span></label>
            <input type="number" inputMode="decimal" className="input" placeholder="2.5" value={data.settings.fuelConsumption || ""} onChange={(e) => updateSettings({ fuelConsumption: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
      </div>
    </div>
  );
}
