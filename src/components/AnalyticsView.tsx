import React from 'react';
import { BarChart3, TrendingUp, PieChart, Layers, Bot, Zap, ShieldCheck } from 'lucide-react';
import { PromptItem, Collection } from '../types';

interface AnalyticsViewProps {
  prompts: PromptItem[];
  collections: Collection[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ prompts, collections }) => {
  // Compute category stats
  const categoryCounts: Record<string, number> = {};
  prompts.forEach((p) => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });

  const modelCounts: Record<string, number> = {};
  prompts.forEach((p) => {
    modelCounts[p.aiModel] = (modelCounts[p.aiModel] || 0) + 1;
  });

  const totalPrompts = prompts.length || 1;

  const weeklyActivity = [
    { day: 'Sen', count: 4 },
    { day: 'Sel', count: 7 },
    { day: 'Rab', count: 3 },
    { day: 'Kam', count: 9 },
    { day: 'Jum', count: 12 },
    { day: 'Sab', count: 5 },
    { day: 'Min', count: 2 },
  ];

  const maxActivity = Math.max(...weeklyActivity.map((w) => w.count));

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-heading font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-red-600" />
          <span>Analitik & Statistik Workspace</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Tinjauan produktivitas prompt engineering, distribusi model AI, dan tren penggunaan.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 block">Total Prompts</span>
          <div className="text-2xl font-bold font-heading text-slate-900 dark:text-slate-100 mt-1">
            {prompts.length}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> +28% bulan ini
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 block">Collections</span>
          <div className="text-2xl font-bold font-heading text-slate-900 dark:text-slate-100 mt-1">
            {collections.length}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Proyek aktif</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 block">Favorit Rate</span>
          <div className="text-2xl font-bold font-heading text-slate-900 dark:text-slate-100 mt-1">
            {Math.round((prompts.filter((p) => p.isFavorite).length / totalPrompts) * 100)}%
          </div>
          <span className="text-[10px] text-amber-500 font-medium block mt-1">Pinned High Value</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 block">Rata-rata Score</span>
          <div className="text-2xl font-bold font-heading text-slate-900 dark:text-slate-100 mt-1">
            95 / 100
          </div>
          <span className="text-[10px] text-emerald-600 font-medium block mt-1">Teroptimasi AI</span>
        </div>
      </div>

      {/* Grid Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-red-600" />
            <span>Aktivitas Mingguan (Prompt Executions)</span>
          </h3>

          <div className="h-44 flex items-end justify-between gap-3 pt-6 px-2">
            {weeklyActivity.map((w) => {
              const heightPct = Math.round((w.count / maxActivity) * 100);
              return (
                <div key={w.day} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500">{w.count}</span>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg h-32 relative overflow-hidden flex items-end">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-red-600 dark:bg-red-500 rounded-t-lg transition-all duration-300"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">{w.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-emerald-500" />
            <span>Distribusi Kategori Prompt</span>
          </h3>

          <div className="space-y-3">
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const pct = Math.round((count / totalPrompts) * 100);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{cat}</span>
                    <span className="text-slate-400">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-red-600 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
