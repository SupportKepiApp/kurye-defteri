import { useState } from "react";
import { X } from "lucide-react";

interface LegalModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: "privacy" | "terms";
}

export function LegalModal({ open, onClose, initialTab = "privacy" }: LegalModalProps) {
  const [tab, setTab] = useState<"privacy" | "terms">(initialTab);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
      />
      <div className="fade-in relative w-full max-w-md rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
        {/* Header with close button */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Yasal Metinler
          </h3>
          <button
            onClick={onClose}
            className="tap-target rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Kapat"
          >
            <X size={22} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-100 px-5 pt-3 dark:border-slate-800">
          <button
            onClick={() => setTab("privacy")}
            className={`flex-1 rounded-t-lg py-2.5 text-sm font-semibold transition ${
              tab === "privacy"
                ? "border-b-2 border-brand-500 text-brand-600 dark:text-brand-400"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            Gizlilik Politikası
          </button>
          <button
            onClick={() => setTab("terms")}
            className={`flex-1 rounded-t-lg py-2.5 text-sm font-semibold transition ${
              tab === "terms"
                ? "border-b-2 border-brand-500 text-brand-600 dark:text-brand-400"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            Kullanım Koşulları
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[55vh] overflow-y-auto px-5 py-4 no-scrollbar">
          {tab === "privacy" ? (
            <div className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              <section>
                <h4 className="mb-1.5 font-semibold text-slate-900 dark:text-slate-100">
                  Veri Toplama
                </h4>
                <p>
                  Kurye Defteri, kullanıcıların gelir, gider ve kilometre
                  takiplerini bulut ortamında saklamak amacıyla Google ile Giriş
                  yapıldığında e-posta adresi ve profil adınızı kullanır.
                </p>
              </section>
              <section>
                <h4 className="mb-1.5 font-semibold text-slate-900 dark:text-slate-100">
                  Verilerin Kullanımı
                </h4>
                <p>
                  Girdiğiniz çalışma saatleri, kazanç, gider ve kilometre
                  verileri yalnızca size özel finansal raporlar sunmak amacıyla
                  işlenir.
                </p>
              </section>
              <section>
                <h4 className="mb-1.5 font-semibold text-slate-900 dark:text-slate-100">
                  Veri Paylaşımı
                </h4>
                <p>
                  Verileriniz üçüncü taraflarla kesinlikle paylaşılmaz veya
                  satılmaz.
                </p>
              </section>
              <section>
                <h4 className="mb-1.5 font-semibold text-slate-900 dark:text-slate-100">
                  Veri Güvenliği ve Silme
                </h4>
                <p>
                  Verileriniz Supabase altyapısında saklanır. Hesabınızı ve
                  verilerinizi istediğiniz zaman Hesabım sekmesinden tamamen
                  silebilirsiniz.
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              <section>
                <h4 className="mb-1.5 font-semibold text-slate-900 dark:text-slate-100">
                  Hizmet Kapsamı
                </h4>
                <p>
                  Kurye Defteri, esnaf kuryelerin finansal takibini
                  kolaylaştırmak için sunulan bir analiz aracıdır. Resmi
                  muhasebe veya vergi beyanı niteliği taşımaz.
                </p>
              </section>
              <section>
                <h4 className="mb-1.5 font-semibold text-slate-900 dark:text-slate-100">
                  Kullanıcı Sorumluluğu
                </h4>
                <p>
                  Girilen verilerin doğruluğu tamamen kullanıcının
                  sorumluluğundadır.
                </p>
              </section>
              <section>
                <h4 className="mb-1.5 font-semibold text-slate-900 dark:text-slate-100">
                  Hizmet Güncellemeleri
                </h4>
                <p>
                  Uygulama geliştirme sürecinde özelliklerde ve kullanım
                  şartlarında güncellemeler yapılabilir.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer close button */}
        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <button
            onClick={onClose}
            className="btn-primary"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
