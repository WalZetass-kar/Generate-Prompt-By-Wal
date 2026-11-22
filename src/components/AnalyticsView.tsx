import React from 'react';
import { BarChart3, TrendingUp, PieChart } from 'lucide-react';
import { PromptItem, Collection, HistoryLog } from '../types';

interface AnalyticsViewProps {
  prompts: PromptItem[];
  collections: Collection[];
  history?: HistoryLog[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  prompts,
  collections,
  history = [],
}) => {
  const categoryCounts: Record<string, number> = {};
  prompts.forEach((p) => {
    const key = p.category || 'Lainnya';
    categoryCounts[key] = (categoryCounts[key] || 0) + 1;
  });

  const totalPrompts = prompts.length;
  const favoriteCount = prompts.filter((p) => p.isFavorite).length;
  const favoriteRate = totalPrompts > 0 ? Math.round((favoriteCount / totalPrompts) * 100) : 0;

  const scoredPrompts = prompts.filter((p) => typeof p.score === 'number');
  const avgScore =
    scoredPrompts.length > 0
      ? Math.round(
          scoredPrompts.reduce((sum, p) => sum + (p.score || 0), 0) / scoredPrompts.length
        )
      : null;

  // Build real 7-day activity counts from actual prompt creations and history logs
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const now = new Date();
  const weeklyActivity = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - idx));
    const dateKey = d.toISOString().slice(0, 10);
    const label = dayNames[d.getDay()];

    const historyHits = history.filter(
      (h) => typeof h.timestamp === 'string' && h.timestamp.slice(0, 10) === dateKey
    ).length;
    const promptHits = prompts.filter(
      (p) => typeof p.createdAt === 'string' && p.createdAt.slice(0, 10) === dateKey
    ).length;

    return {
      day: label,
      count: Math.max(historyHits, promptHits),
    };
  });

  const maxActivity = Math.max(1, ...weeklyActivity.map((w) => w.count));
  const hasAnyActivity = weeklyActivity.some((w) => w.count > 0);
  const categoryEntries = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-heading font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-600" />
          <span>Analitik Workspace</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Statistik nyata dari prompt, folder, dan aktivitas yang tersimpan di akun Anda.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Total Prompt</span>
          <div className="text-2xl font-bold font-heading text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
            {totalPrompts}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {totalPrompts === 0 ? 'Belum ada data' : 'Tersimpan di cloud'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Collections</span>
          <div className="text-2xl font-bold font-heading text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
            {collections.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {collections.length === 0 ? 'Belum ada folder' : 'Folder aktif'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Rasio Favorit</span>
          <div className="text-2xl font-bold font-heading text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
            {favoriteRate}%
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block tabular-nums">
            {favoriteCount} ditandai favorit
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Rata-rata Skor</span>
          <div className="text-2xl font-bold font-heading text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
            {avgScore !== null ? `${avgScore} / 100` : '—'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {scoredPrompts.length > 0
              ? `Dari ${scoredPrompts.length} prompt dinilai`
              : 'Belum ada prompt dinilai'}
          </span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Aktivitas 7 Hari Terakhir</span>
          </h3>

          {!hasAnyActivity ? (
            <div className="h-44 flex items-center justify-center text-xs text-slate-400 text-center px-4">
              Belum ada aktivitas dalam 7 hari terakhir. Mulai buat dan simpan prompt untuk melihat grafik.
            </div>
          ) : (
            <div className="h-44 flex items-end justify-between gap-3 pt-6 px-2">
              {weeklyActivity.map((w, idx) => {
                const heightPct = w.count > 0 ? Math.max(8, Math.round((w.count / maxActivity) * 100)) : 0;
                return (
                  <div key={`${w.day}-${idx}`} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-500 tabular-nums">
                      {w.count}
                    </span>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-md h-32 relative overflow-hidden flex items-end">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full bg-emerald-600 dark:bg-emerald-500 rounded-t-md transition-all duration-300"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{w.day}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-emerald-600" />
            <span>Distribusi Kategori Prompt</span>
          </h3>

          {categoryEntries.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-slate-400 text-center px-4">
              Belum ada prompt tersimpan di library.
            </div>
          ) : (
            <div className="space-y-3">
              {categoryEntries.map(([cat, count]) => {
                const pct = Math.round((count / totalPrompts) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{cat}</span>
                      <span className="text-slate-400 tabular-nums">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-emerald-600 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
