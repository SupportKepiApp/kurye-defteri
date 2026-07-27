import { useEffect, useState, useRef, useCallback } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Wallet, Wrench, BarChart3, Settings as SettingsIcon, LifeBuoy, Sun, Moon, Clock, Lock, Loader2 } from "lucide-react";
import type { AppData, GunlukOzet, SubscriptionPlan } from "./types";
import { loadData, saveData, todayStr, getTrialDaysRemaining, isSubscriptionExpired, isAccessLocked, getDaysRemaining, getSubscriptionDaysRemaining, fetchAllOzetlerFromSupabase, upsertOzetToSupabase, deleteOzetFromSupabase, createEmptyOzet, DEFAULT_DATA } from "./storage";
import { recalcOzet } from "./calc";
import { supabase } from "./supabase";
import { EarningsTab } from "./tabs/EarningsTab";
import { ExpensesTab } from "./tabs/ExpensesTab";
import { AnalyticsTab } from "./tabs/AnalyticsTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { SupportTab } from "./tabs/SupportTab";
import { Paywall } from "./components/Paywall";
import { LoginScreen } from "./components/LoginScreen";
import { registerNotificationClickListener, cancelAllReminders } from "./reminder";
import { purchaseSubscription, checkSubscriptionStatus, isBillingAvailable } from "./billing";
import logo from "./assets/Logo-1.jpg";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const TABS = [
  { id: "earnings", label: "Gün Sonu", icon: Wallet },
  { id: "expenses", label: "Giderler", icon: Wrench },
  { id: "analytics", label: "Özet", icon: BarChart3 },
  { id: "settings", label: "Ayarlar", icon: SettingsIcon },
  { id: "support", label: "Hesabım", icon: LifeBuoy },
] as const;

type TabId = (typeof TABS)[number]["id"];
const TAB_IDS: TabId[] = ["earnings", "expenses", "analytics", "settings", "support"];
const LOCKED_TABS: TabId[] = ["earnings", "expenses", "analytics"];

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [activeTab, setActiveTab] = useState<TabId>("earnings");
  const [selectedDate, setSelectedDate] = useState<string>(() => todayStr());
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [toast, setToast] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!data.settings.trialStartDate) {
      setData((prev) => ({ ...prev, settings: { ...prev.settings, trialStartDate: todayStr() } }));
    }
    registerNotificationClickListener();

    // Hatırlatıcı kapalıysa uygulama açılışında bekleyen bildirimleri temizle
    if (!data.settings.reminder?.enabled) {
      cancelAllReminders().catch(() => {});
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    let authResolved = false;

    const resolveAuth = () => {
      if (!authResolved && mounted) {
        authResolved = true;
        setAuthLoading(false);
      }
    };

    // onAuthStateChange, Capacitor WebView'de güvenilir tek oturum kaynağıdır.
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      // authLoading'i HEMEN kapat — sync arka planda çalışsın, ekranı bekletme
      resolveAuth();

      if (u) {
        // Sync arka planda çalışır, kullanıcıyı bekletmez
        fetchAllOzetlerFromSupabase(u.id)
          .then((cloudOzetler) => {
            if (!mounted) return;
            if (Object.keys(cloudOzetler).length > 0) {
              setData((prev) => ({ ...prev, ozetler: cloudOzetler }));
            }
            setToast("Giriş başarılı! Verileriniz yüklendi.");
            setTimeout(() => { if (mounted) setToast(null); }, 3000);
          })
          .catch(() => {});
      }
    });

    // WebView'de onAuthStateChange bazen INITIAL_SESSION göndermeyebilir.
    // 3 saniye sonra authLoading'i güvenli şekilde kaldır.
    timeoutId = setTimeout(() => {
      resolveAuth();
    }, 3000);

    // Capacitor: OAuth sonrası dış tarayıcıdan com.kuryedefteri.app.tr://login-callback#access_token=...
    // şeklinde deep link döner. appUrlOpen eventi ile URL'yi yakala ve Supabase'e ver.
    let appUrlOpenListener: { remove: () => void } | undefined;
    const isCapacitor =
      typeof (window as any).Capacitor !== "undefined" &&
      (window as any).Capacitor.isNativePlatform?.() === true;

    if (isCapacitor) {
      CapacitorApp.addListener("appUrlOpen", ({ url }: { url: string }) => {
        if (!mounted || !url) return;
        // URL format: com.kuryedefteri.app.tr://login-callback#access_token=...&refresh_token=...
        // Supabase detectSessionInUrl bunu otomatik işleyemez (custom scheme),
        // bu yüzden parse edip setSession ile manuel kuruyoruz.
        try {
          const hashPart = url.includes("#") ? url.split("#")[1] : "";
          if (!hashPart) return;
          const params = new URLSearchParams(hashPart);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          if (access_token && refresh_token) {
            supabase.auth.setSession({ access_token, refresh_token })
              .then(({ error }) => {
                if (error) {
                  setToast("Giriş tamamlanamadı. Tekrar deneyin.");
                  setTimeout(() => { if (mounted) setToast(null); }, 3000);
                }
              })
              .catch(() => {});
          }
        } catch {
          // URL parse hatası — sessizce yoksay
        }
      }).then((l) => { appUrlOpenListener = l; });
    }

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      authListener.subscription.unsubscribe();
      appUrlOpenListener?.remove();
    };
  }, []);

  useEffect(() => { saveData(data); }, [data]);

  useEffect(() => {
    if (isSubscriptionExpired(data.settings) && data.settings.subscriptionState === "active") {
      updateData((d) => ({ ...d, settings: { ...d.settings, subscriptionState: "expired" } }));
      setPaywallOpen(true);
    }
  }, [data.settings]);

  useEffect(() => {
    const root = document.documentElement;
    if (data.settings.darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [data.settings.darkMode]);

  const updateOzet = useCallback((tarih: string, updater: (o: GunlukOzet) => GunlukOzet) => {
    setData((prev) => {
      const existing = prev.ozetler[tarih] ?? createEmptyOzet(tarih);
      const updated = recalcOzet(updater(existing));
      if (user) {
        upsertOzetToSupabase(user.id, updated).catch(() => {});
      }
      return { ...prev, ozetler: { ...prev.ozetler, [tarih]: updated } };
    });
  }, [user]);

  const deleteOzet = useCallback((tarih: string) => {
    setData((prev) => {
      const next = { ...prev.ozetler };
      delete next[tarih];
      if (user) {
        deleteOzetFromSupabase(user.id, tarih).catch(() => {});
      }
      return { ...prev, ozetler: next };
    });
  }, [user]);

  const updateData = useCallback((updater: (d: AppData) => AppData) => {
    setData((prev) => {
      const next = updater(prev);
      if (user) {
        const changedDates = Object.keys(next.ozetler).filter(
          (t) => !prev.ozetler[t] || JSON.stringify(prev.ozetler[t]) !== JSON.stringify(next.ozetler[t])
        );
        changedDates.forEach((t) => upsertOzetToSupabase(user.id, next.ozetler[t]).catch(() => {}));
        const deletedDates = Object.keys(prev.ozetler).filter((t) => !next.ozetler[t]);
        deletedDates.forEach((t) => deleteOzetFromSupabase(user.id, t).catch(() => {}));
      }
      return next;
    });
  }, [user]);

  const toggleTheme = () => {
    updateData((d) => ({ ...d, settings: { ...d.settings, darkMode: !d.settings.darkMode } }));
  };

  const trialDaysLeft = getTrialDaysRemaining(data.settings);
  const subDaysLeft = getSubscriptionDaysRemaining(data.settings);
  const expired = isAccessLocked(data.settings);
  const daysLeft = getDaysRemaining(data.settings);

  const handleTabChange = (tab: TabId) => {
    if (expired && LOCKED_TABS.includes(tab)) { setPaywallOpen(true); return; }
    setActiveTab(tab);
  };

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (isBillingAvailable()) {
      setBillingLoading(true);
      const result = await purchaseSubscription(plan);
      setBillingLoading(false);
      if (result.success) {
        updateData((d) => ({ ...d, settings: { ...d.settings, subscriptionState: "active", subscriptionStartDate: todayStr(), subscriptionPlan: plan } }));
        setPaywallOpen(false);
      } else {
        alert(result.error || "Satın alma başarısız oldu.");
      }
    } else {
      updateData((d) => ({ ...d, settings: { ...d.settings, subscriptionState: "active", subscriptionStartDate: todayStr(), subscriptionPlan: plan } }));
      setPaywallOpen(false);
    }
  };

  const handleRestorePurchase = async () => {
    if (!isBillingAvailable()) {
      alert("Geri yükleme yalnızca Android cihazda kullanılabilir.");
      return;
    }
    setBillingLoading(true);
    const status = await checkSubscriptionStatus();
    setBillingLoading(false);
    if (status.active) {
      const plan: SubscriptionPlan = status.plan ?? "monthly";
      updateData((d) => ({ ...d, settings: { ...d.settings, subscriptionState: "active", subscriptionStartDate: todayStr(), subscriptionPlan: plan } }));
      setPaywallOpen(false);
      alert("Aboneliğiniz başarıyla geri yüklendi.");
    } else {
      alert("Aktif bir abonelik bulunamadı.");
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setData(DEFAULT_DATA);
    setAuthLoading(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = 60;
    const currentIdx = TAB_IDS.indexOf(activeTab);
    if (delta < -threshold && currentIdx < TAB_IDS.length - 1) handleTabChange(TAB_IDS[currentIdx + 1]);
    else if (delta > threshold && currentIdx > 0) handleTabChange(TAB_IDS[currentIdx - 1]);
    touchStartX.current = null;
  };

  const isCurrentTabLocked = expired && LOCKED_TABS.includes(activeTab);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <img src={logo} alt="Kurye Defteri" className="h-16 w-16 rounded-2xl object-cover shadow-lg" />
          <Loader2 size={32} className="spin text-brand-500" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-100 dark:bg-slate-950">
      {toast && (
        <div className="toast-in fixed left-1/2 top-4 z-[70] -translate-x-1/2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <header className="border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Kurye Defteri" className="h-10 w-10 rounded-xl object-cover" />
            <div>
              <h1 className="text-base font-bold leading-tight text-slate-900 dark:text-slate-100">Kurye Defteri</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Esnaf Kurye Finans Takibi</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {data.settings.subscriptionState !== "active" && (
              <button onClick={() => setPaywallOpen(true)} className={`tap-target inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${expired ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : daysLeft <= 5 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"}`}>
                {expired ? (<><Lock size={12} /> Süre Doldu</>) : (<><Clock size={12} /> {daysLeft} gün</>)}
              </button>
            )}
            {data.settings.subscriptionState === "active" && (
              <button onClick={() => setPaywallOpen(true)} className={`tap-target inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${subDaysLeft <= 5 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                <Clock size={12} /> {subDaysLeft} gün
              </button>
            )}
            <button onClick={toggleTheme} className="tap-target rounded-xl p-2 text-slate-500 transition hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Tema değiştir">
              {data.settings.darkMode ? <Sun size={22} /> : <Moon size={22} />}
            </button>
          </div>
        </div>
      </header>

      <main className="fade-in flex-1 overflow-y-auto px-4 pb-24 pt-4" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {isCurrentTabLocked ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-100 dark:bg-red-900/30">
              <Lock size={40} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{data.settings.subscriptionState === "expired" ? "Aboneliğiniz Sona Erdi" : "Deneme Süreniz Doldu"}</h2>
            <p className="mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">{data.settings.subscriptionState === "expired" ? "Aboneliğinizin süresi doldu. Devam etmek için aboneliğinizi yenileyin." : "20 günlük ücretsiz deneme süreniz sona erdi. Devam etmek için aboneliğinizi seçin."}</p>
            <button onClick={() => setPaywallOpen(true)} className="btn-primary mt-6 max-w-xs">Abonelik Seçenekleri</button>
          </div>
        ) : (
          <>
            {activeTab === "earnings" && <EarningsTab data={data} updateOzet={updateOzet} user={user} selectedDate={selectedDate} onDateChange={setSelectedDate} />}
            {activeTab === "expenses" && <ExpensesTab data={data} updateOzet={updateOzet} user={user} selectedDate={selectedDate} onDateChange={setSelectedDate} />}
            {activeTab === "analytics" && <AnalyticsTab data={data} />}
            {activeTab === "settings" && <SettingsTab data={data} updateData={updateData} />}
            {activeTab === "support" && <SupportTab data={data} updateData={updateData} user={user} onSignOut={handleSignOut} />}
          </>
        )}
      </main>

      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white px-1 pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-around">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const locked = expired && LOCKED_TABS.includes(tab.id);
            return (
              <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 pt-2 transition-colors ${active ? "text-brand-500" : "text-slate-400 dark:text-slate-500"}`}>
                <div className="relative">
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} className={locked ? "opacity-50" : ""} />
                  {locked && <Lock size={10} className="absolute -bottom-0.5 -right-0.5 text-red-400" />}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <Paywall open={paywallOpen} onClose={() => { if (!expired) setPaywallOpen(false); }} trialDaysLeft={trialDaysLeft} subDaysLeft={subDaysLeft} subscriptionState={data.settings.subscriptionState} onSelectPlan={handleSelectPlan} onRestore={handleRestorePurchase} loading={billingLoading} forceOpen={expired} />
    </div>
  );
}
