import { useState, useRef } from "react";
import { ChevronUp, Lock, Loader2 } from "lucide-react";
import type { SubscriptionState } from "../types";
import logo from "../assets/Logo-1.jpg";

interface PaywallProps {
  open: boolean;
  onClose: () => void;
  trialDaysLeft: number;
  subDaysLeft?: number;
  subscriptionState: SubscriptionState;
  onSelectPlan: (plan: "monthly" | "yearly") => void;
  onRestore?: () => void;
  loading?: boolean;
  forceOpen?: boolean;
}

export function Paywall({ open, onClose, trialDaysLeft, subDaysLeft = 0, subscriptionState, onSelectPlan, onRestore, loading = false, forceOpen = false }: PaywallProps) {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const touchStartY = useRef<number | null>(null);

  if (!open) return null;

  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta < -50) { if (!forceOpen) onClose(); touchStartY.current = null; }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center">
      <div className="absolute inset-0 bg-black/60 transition-opacity" onClick={() => { if (!forceOpen) onClose(); }} />
      <div className="slide-down relative mt-0 w-full max-w-md overflow-y-auto no-scrollbar" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-6 dark:from-slate-900 dark:to-slate-950">
          <div className="mb-4 flex flex-col items-center">
            <div className="mb-3 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
            {!forceOpen && (
              <button onClick={onClose} className="tap-target rounded-full bg-slate-200 p-2 text-slate-500 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700" aria-label="Kapat">
                <ChevronUp size={24} />
              </button>
            )}
          </div>

          <div className="flex flex-col items-center px-6 pb-6">
            <img src={logo} alt="Kurye Defteri" className="mb-4 h-24 w-24 rounded-2xl object-cover shadow-lg" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Kurye Defteri</h2>
            <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">Aboneliğinizi seçin</p>

            {subscriptionState === "trial" && (
              <div className={`mt-4 w-full rounded-xl p-3 text-center ${trialDaysLeft <= 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"}`}>
                <p className="text-sm font-semibold">
                  {trialDaysLeft > 0 ? `Ücretsiz deneme: ${trialDaysLeft} gün kaldı` : "Ücretsiz deneme süreniz doldu"}
                </p>
                {trialDaysLeft <= 0 && <p className="mt-1 text-xs">Devam etmek için aboneliğinizi seçin</p>}
              </div>
            )}

            {subscriptionState === "active" && (
              <div className={`mt-4 w-full rounded-xl p-3 text-center ${subDaysLeft <= 5 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                <p className="text-sm font-semibold">
                  {subDaysLeft > 0 ? `Aboneliğinizde ${subDaysLeft} gün kaldı` : "Aboneliğinizin süresi doldu"}
                </p>
                {subDaysLeft <= 0 && <p className="mt-1 text-xs">Devam etmek için aboneliğinizi yenileyin</p>}
              </div>
            )}

            {subscriptionState === "expired" && (
              <div className="mt-4 w-full rounded-xl p-3 text-center bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                <p className="text-sm font-semibold">Aboneliğinizin süresi doldu</p>
                <p className="mt-1 text-xs">Devam etmek için aboneliğinizi yenileyin</p>
              </div>
            )}
          </div>

          <div className="space-y-3 px-5">
            <button onClick={() => setSelectedPlan("yearly")} className={`relative flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${selectedPlan === "yearly" ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20" : "border-slate-200 dark:border-slate-700"}`}>
              <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${selectedPlan === "yearly" ? "border-brand-500 bg-brand-500" : "border-slate-300 dark:border-slate-600"}`}>
                {selectedPlan === "yearly" && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">Yıllık Abonelik</span>
                  <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">2 AY BEDAVA</span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">399 TL / yıl</p>
              </div>
              <p className="text-xs text-slate-400">~33 TL/ay</p>
            </button>

            <button onClick={() => setSelectedPlan("monthly")} className={`relative flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${selectedPlan === "monthly" ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20" : "border-slate-200 dark:border-slate-700"}`}>
              <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${selectedPlan === "monthly" ? "border-brand-500 bg-brand-500" : "border-slate-300 dark:border-slate-600"}`}>
                {selectedPlan === "monthly" && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <span className="font-bold text-slate-900 dark:text-slate-100">Aylık Abonelik</span>
                <p className="text-sm text-slate-500 dark:text-slate-400">39 TL / ay</p>
              </div>
            </button>
          </div>

          <div className="px-5 py-6">
            <button 
              onClick={() => onSelectPlan(selectedPlan)}
              disabled={loading}
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> İşleniyor...</>
              ) : (
                selectedPlan === "yearly" ? "Yıllık Plana Geç — 399 TL" : "Aylık Plana Geç — 39 TL"
              )}
            </button>
            {onRestore && (
              <button 
                onClick={onRestore}
                disabled={loading}
                className="mt-3 w-full text-center text-xs text-slate-400 underline disabled:opacity-50"
              >
                Önceki satın almayı geri yükle
              </button>
            )}
          </div>

          <div className="px-5 pb-8">
            <button onClick={onClose} disabled={forceOpen} className={`tap-target-lg w-full rounded-xl border font-medium transition ${forceOpen ? "cursor-not-allowed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700" : "border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"}`}>
              Kapat
            </button>
          </div>

          {forceOpen && (
            <div className="px-5 pb-8">
              <div className="flex items-center justify-center gap-2 rounded-xl bg-red-50 p-3 text-center dark:bg-red-900/20">
                <Lock size={16} className="text-red-400" />
                <p className="text-xs text-red-500 dark:text-red-400">{subscriptionState === "expired" ? "Aboneliğinizin süresi doldu. Devam etmek için aboneliğinizi yenileyin." : "Deneme süreniz doldu. Devam etmek için abonelik seçin."}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
