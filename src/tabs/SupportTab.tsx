import { useState } from "react";
import { MessageSquare, Download, LogOut, Trash2, Send, LifeBuoy, User, Mail, Loader2, Check, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { registerPlugin } from "@capacitor/core";
import type { AppData } from "../types";
import { supabase } from "../supabase";
import { Modal } from "../components/Modal";
import { formatDateTR, formatCurrency } from "../storage";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const isCapacitor =
  typeof (window as any).Capacitor !== "undefined" &&
  (window as any).Capacitor.isNativePlatform?.() === true;

const ExcelOpener = registerPlugin<{
  openWithChooser: (opts: { path: string }) => Promise<void>;
}>("ExcelOpener");

interface Props {
  data: AppData;
  updateData: (updater: (d: AppData) => AppData) => void;
  user: SupabaseUser | null;
  onSignOut: () => void;
}

export function SupportTab({ data, updateData, user, onSignOut }: Props) {
  const [feedback, setFeedback] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [deleteModal, setDeleteModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const sendFeedback = async () => {
    if (!feedback.trim() || !user) return;
    setFeedbackStatus("loading");
    try {
      const { error } = await supabase.from("feedback").insert({
        user_id: user.id,
        user_email: user.email ?? "",
        message: feedback.trim(),
      });
      if (error) throw error;
      setFeedbackStatus("success");
      setFeedback("");
      setTimeout(() => setFeedbackStatus("idle"), 3000);
    } catch {
      setFeedbackStatus("error");
      setTimeout(() => setFeedbackStatus("idle"), 3000);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onSignOut();
  };

  const buildWorkbook = (rows: Record<string, any>[]) => {
    const wb = XLSX.utils.book_new();
    const sheetData = rows.length > 0 ? rows : [{
      "Tarih": "", "Çalışma Saati": 0, "Teslimat Sayısı": 0, "Brüt Kazanç": 0,
      "Bahşiş": 0, "Toplam Gider": 0, "Net Kazanç": 0, "Günlük KM": 0,
      "Notlar": "",
    }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetData), "Günlük Özetler");
    return wb;
  };

  const exportXLSX = async () => {
    if (!user) return;
    setExportLoading(true);
    try {
      const { data: dbRows, error } = await supabase
        .from("gunluk_ozetler")
        .select("*")
        .eq("user_id", user.id)
        .order("tarih", { ascending: true });

      if (error) throw error;

      const excelRows = (dbRows ?? []).map((r: any) => ({
        "Tarih": r.tarih,
        "Çalışma Saati": Number(r.calisma_saati) || 0,
        "Teslimat Sayısı": r.teslimat_sayisi || 0,
        "Brüt Kazanç": Number(r.brut_kazanc) || 0,
        "Bahşiş": Number(r.bahsis) || 0,
        "Toplam Gider": Number(r.toplam_gider) || 0,
        "Net Kazanç": Number(r.net_kazanc) || 0,
        "Günlük KM": Number(r.toplam_km) || 0,
        "Notlar": r.notlar ?? "",
      }));

      const wb = buildWorkbook(excelRows);
      await deliverExcel(wb);
    } catch {
      const localRows = Object.values(data.ozetler).map((o) => ({
        "Tarih": o.tarih, "Çalışma Saati": o.calisma_saati, "Teslimat Sayısı": o.teslimat_sayisi,
        "Brüt Kazanç": o.brut_kazanc, "Bahşiş": o.bahsis, "Toplam Gider": o.toplam_gider,
        "Net Kazanç": o.net_kazanc, "Günlük KM": o.toplam_km, "Notlar": o.notlar ?? "",
      }));
      const wb = buildWorkbook(localRows);
      await deliverExcel(wb);
    }
    setExportLoading(false);
  };

  // Android WebView'de XLSX.writeFile browser download tetikler ama çalışmaz.
  // Capacitor'da dosyayı cache'e yazıp "Birlikte aç" seçici ile açarız.
  const deliverExcel = async (wb: XLSX.WorkBook) => {
    const fileName = "Kurye_Defteri_Ozet_Raporu.xlsx";
    if (isCapacitor) {
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      const writeFile = await Filesystem.writeFile({
        path: fileName,
        data: wbout,
        directory: Directory.Cache,
      });
      await ExcelOpener.openWithChooser({ path: writeFile.uri });
    } else {
      XLSX.writeFile(wb, fileName);
    }
  };

  const clearAllData = async () => {
    if (user) {
      const { error: delError } = await supabase.from("gunluk_ozetler").delete().eq("user_id", user.id);
      if (delError) { /* ignore */ }
    }
    updateData((d) => ({ ozetler: {}, settings: d.settings }));
    setDeleteModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <User size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Kullanıcı Bilgisi</h3>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="Profil" className="h-12 w-12 rounded-full" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white"><User size={24} /></div>
          )}
          <div className="flex-1">
            <p className="font-semibold text-slate-900 dark:text-slate-100">{user?.user_metadata?.full_name || "Kullanıcı"}</p>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400"><Mail size={14} /><span>{user?.email}</span></div>
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Geri Bildirim</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Hata bildirimi, öneri veya isteklerinizi paylaşın</p>
        <textarea className="input min-h-[100px] resize-none" placeholder="Mesajınızı yazın..." value={feedback} onChange={(e) => setFeedback(e.target.value)} disabled={feedbackStatus === "loading"} />
        {feedbackStatus === "error" && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
            <AlertCircle size={16} className="flex-shrink-0 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">Gönderilemedi. Lütfen tekrar deneyin.</p>
          </div>
        )}
        <button onClick={sendFeedback} disabled={feedbackStatus === "loading" || feedbackStatus === "success" || !feedback.trim()} className="btn-primary">
          {feedbackStatus === "loading" ? (<><Loader2 size={18} className="spin" /> Gönderiliyor...</>) : feedbackStatus === "success" ? (<><Check size={18} /> Gönderildi!</>) : (<><Send size={18} /> Gönder</>)}
        </button>
      </div>

      <div className="card space-y-2">
        <h3 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">Veri & Hesap</h3>
        <button onClick={exportXLSX} disabled={exportLoading} className="tap-target-lg flex w-full items-center gap-3 rounded-xl p-3 text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800">
          {exportLoading ? <Loader2 size={20} className="spin text-slate-500" /> : <Download size={20} className="text-slate-500" />}
          <span className="font-medium">{exportLoading ? "Dışa aktarılıyor..." : "Verileri Dışa Aktar (Excel)"}</span>
        </button>
        <button onClick={handleSignOut} className="tap-target-lg flex w-full items-center gap-3 rounded-xl p-3 text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          <LogOut size={20} className="text-slate-500" /><span className="font-medium">Çıkış Yap</span>
        </button>
        <button onClick={() => setDeleteModal(true)} className="tap-target-lg flex w-full items-center gap-3 rounded-xl p-3 text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
          <Trash2 size={20} /><span className="font-medium">Hesabı Sil (GDPR)</span>
        </button>
      </div>

      <div className="flex flex-col items-center py-4 text-center">
        <LifeBuoy size={32} className="text-slate-300 dark:text-slate-600" />
        <p className="mt-2 text-sm font-medium text-slate-500">Kurye Defteri v2.0</p>
        <p className="text-xs text-slate-400">Esnaf kuryeler için finans takip uygulaması</p>
      </div>

      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Hesabı Sil">
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
            <Trash2 size={24} className="flex-shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-200">Bu işlem tüm verilerinizi kalıcı olarak siler ve geri alınamaz.</p>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Tüm gün sonu özetleriniz silinecek (GDPR uyumlu).</p>
          <div className="flex gap-2">
            <button onClick={() => setDeleteModal(false)} className="btn-ghost flex-1">Vazgeç</button>
            <button onClick={clearAllData} className="btn-danger flex-1">Kalıcı Sil</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
