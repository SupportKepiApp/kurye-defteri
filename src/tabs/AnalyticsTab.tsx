import { useState } from "react";
import { TrendingUp, Wallet, TrendingDown, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, PieChart, Pie, Tooltip, Legend } from "recharts";
import type { AppData } from "../types";
import { formatCurrency } from "../storage";
import { summarizePeriod, getDatesForPeriod, weeklyProfitData, platformRevenueShare, expenseBreakdown } from "../calc";

type Period = "daily" | "weekly" | "monthly" | "yearly";
const PERIOD_LABELS: Record<Period, string> = { daily: "Günlük", weekly: "Haftalık", monthly: "Aylık", yearly: "Yıllık" };

interface Props { data: AppData; }

export function AnalyticsTab({ data }: Props) {
  const [period, setPeriod] = useState<Period>("weekly");
  const dates = getDatesForPeriod(period);
  const summary = summarizePeriod(data, dates);
  const weekly = weeklyProfitData(data);
  const platformShare = platformRevenueShare(data, dates);
  const expenseData = expenseBreakdown(data, dates);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${period === p ? "bg-white text-brand-600 shadow-sm dark:bg-slate-900 dark:text-brand-400" : "text-slate-500 dark:text-slate-400"}`}>{PERIOD_LABELS[p]}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card bg-gradient-to-br from-brand-500 to-brand-700 text-white">
          <div className="flex items-center gap-1 text-brand-50"><TrendingUp size={16} /><span className="text-xs">Net Kâr</span></div>
          <p className="mt-1 text-xl font-bold">{formatCurrency(summary.net)}</p>
        </div>
        <div className="card bg-gradient-to-br from-slate-700 to-slate-900 text-white">
          <div className="flex items-center gap-1 text-slate-300"><Wallet size={16} /><span className="text-xs">Brüt Ciro</span></div>
          <p className="mt-1 text-xl font-bold">{formatCurrency(summary.brut)}</p>
        </div>
        <div className="card bg-gradient-to-br from-red-500 to-rose-600 text-white">
          <div className="flex items-center gap-1 text-red-50"><TrendingDown size={16} /><span className="text-xs">Toplam Gider</span></div>
          <p className="mt-1 text-xl font-bold">{formatCurrency(summary.gider + summary.vergi)}</p>
        </div>
        <div className="card bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <div className="flex items-center gap-1 text-amber-50"><Clock size={16} /><span className="text-xs">Saatlik Net</span></div>
          <p className="mt-1 text-xl font-bold">{formatCurrency(summary.saatlik)}</p>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">Haftalık Kâr Grafiği</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weekly}>
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "rgba(148,163,184,0.1)" }} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", background: "#ffffff", color: "#0f172a", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }} labelStyle={{ color: "#64748b", fontWeight: 600 }} formatter={(v: number) => [formatCurrency(v), "Net Kâr"]} />
            <Bar dataKey="net" radius={[6, 6, 0, 0]}>
              {weekly.map((entry, i) => <Cell key={i} fill={entry.net >= 0 ? "#10b981" : "#ef4444"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {platformShare.length > 0 && (
        <div className="card">
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">Platform Gelir Dağılımı</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={platformShare} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {platformShare.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", background: "#ffffff", color: "#0f172a", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }} formatter={(v: number, n: string) => [formatCurrency(v), n]} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {expenseData.length > 0 && (
        <div className="card">
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">Gider Dağılımı</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={expenseData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={75} paddingAngle={2}>
                {expenseData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", background: "#ffffff", color: "#0f172a", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }} formatter={(v: number, n: string) => [formatCurrency(v), n]} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {platformShare.length === 0 && expenseData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex gap-1">
            {[40, 60, 30, 80, 50, 70, 45].map((h, i) => <div key={i} className="w-4 rounded-t bg-slate-200 dark:bg-slate-700" style={{ height: h }} />)}
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Henüz analiz için veri yok</p>
          <p className="text-xs text-slate-400">Gün sonu kayıtları girdikçe grafikler burada görünecek</p>
        </div>
      )}
    </div>
  );
}
