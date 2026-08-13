import React from 'react';
import {
  Sparkles,
  Zap,
  Globe,
  FolderPlus,
  Download,
  Upload,
  FlaskConical,
  Star,
  Clock,
  ArrowRight,
  ShieldCheck,
  Code2,
  TrendingUp,
  Radio,
  Wifi,
} from 'lucide-react';
import { PromptItem, Collection, HistoryLog, ViewMode } from '../types';
import { useRealtime } from '../context/RealtimeContext';

interface DashboardViewProps {
  prompts: PromptItem[];
  collections: Collection[];
  history: HistoryLog[];
  onNavigateView: (view: ViewMode) => void;
  onSelectPrompt: (prompt: PromptItem) => void;
  onOpenOptimizeModal: () => void;
  onOpenTranslateModal: () => void;
  onOpenExportImportModal: () => void;
  onOpenNewCollectionModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  prompts,
  collections,
  history,
  onNavigateView,
  onSelectPrompt,
  onOpenOptimizeModal,
  onOpenTranslateModal,
  onOpenExportImportModal,
  onOpenNewCollectionModal,
}) => {
  const { isConnected, onlineUsers, latencyMs } = useRealtime();
  const recentPrompts = [...prompts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  const favoritePrompts = prompts.filter((p) => p.isFavorite).slice(0, 3);

  const quickActions = [
    {
      label: 'Generate Prompt',
      icon: Sparkles,
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      onClick: () => onNavigateView('generate'),
    },
    {
      label: 'Optimize Prompt',
      icon: Zap,
      color: 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900',
      onClick: onOpenOptimizeModal,
    },
    {
      label: 'Translate Prompt',
      icon: Globe,
      color: 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50',
      onClick: onOpenTranslateModal,
    },
    {
      label: 'Buat Collection',
      icon: FolderPlus,
      color: 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50',
      onClick: onOpenNewCollectionModal,
    },
    {
      label: 'Export / Import',
      icon: Download,
      color: 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50',
      onClick: onOpenExportImportModal,
    },
    {
      label: 'Buka Playground',
      icon: FlaskConical,
      color: 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50',
      onClick: () => onNavigateView('playground'),
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Welcome Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              Selamat Datang Kembali
            </span>
            <span className="text-xs text-slate-400">• Workspace Aktif</span>
          </div>
          <h2 className="text-lg sm:text-xl font-heading font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Generate Prompt by Walzetass AI Workspace
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
            Pusat kerja terpadu untuk membuat, menguji, mengoptimalkan, dan mengorganisir prompt AI profesional Anda.
          </p>
        </div>

        <button
          onClick={() => onNavigateView('generate')}
          id="dashboard-hero-generate-btn"
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all self-stretch sm:self-start md:self-auto shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Buat Prompt Baru</span>
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500">Total Prompt</span>
            <Code2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-heading text-slate-900 dark:text-slate-100">
            {prompts.length}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> Tersimpan aman
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500">Prompt Favorit</span>
            <Star className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-heading text-slate-900 dark:text-slate-100">
            {prompts.filter((p) => p.isFavorite).length}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Di-pin & disukai</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500">Collections</span>
            <FolderPlus className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-heading text-slate-900 dark:text-slate-100">
            {collections.length}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Folder terorganisir</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500">Avg Prompt Score</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-heading text-slate-900 dark:text-slate-100">
            95 <span className="text-xs font-normal text-slate-400">/100</span>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block mt-1">
            Kualitas Tinggi
          </span>
        </div>

        {/* Realtime Live Status Card */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 mb-2">
            <span className="text-xs font-bold uppercase tracking-tight flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
              <span>Realtime Sync</span>
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div className="text-2xl font-bold font-heading text-emerald-900 dark:text-emerald-100 flex items-baseline gap-1">
            {onlineUsers} <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">User Online</span>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono block mt-1">
            {isConnected ? `Connected (${latencyMs}ms latency)` : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Aksi Cepat
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                onClick={action.onClick}
                className={`p-3 rounded-2xl text-left transition-all duration-150 flex flex-col justify-between h-22 shadow-2xs group ${action.color}`}
              >
                <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold leading-tight">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Recent Prompts & Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Prompts (2 Cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-bold text-slate-900 dark:text-slate-100">
              Prompt Terakhir
            </h3>
            <button
              onClick={() => onNavigateView('library')}
              className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium flex items-center gap-1"
            >
              <span>Lihat Semua Library</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentPrompts.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                Belum ada prompt. Klik "Generate Prompt" untuk membuat prompt pertama Anda.
              </div>
            ) : (
              recentPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  onClick={() => onSelectPrompt(prompt)}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-4 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {prompt.category}
                      </span>
                      {prompt.framework && (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                          {prompt.framework}
                        </span>
                      )}
                      {prompt.score && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 ml-auto sm:ml-0">
                          Score: {prompt.score}/100
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                      {prompt.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {prompt.description}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-[10px] text-slate-400 block">
                      {new Date(prompt.updatedAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity & Favorites (1 Col) */}
        <div className="space-y-6">
          {/* Favorites Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Favorit Teratas</span>
              </h3>
              <button
                onClick={() => onNavigateView('favorites')}
                className="text-[10px] text-red-600 dark:text-red-400 font-medium hover:underline"
              >
                Lihat Semua
              </button>
            </div>

            <div className="space-y-2">
              {favoritePrompts.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-4">
                  Belum ada prompt favorit. Tandai prompt dengan bintang untuk disematkan.
                </p>
              ) : (
                favoritePrompts.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => onSelectPrompt(f)}
                    className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                      {f.title}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {f.aiModel} • {f.category}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* History Timeline */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Aktivitas Hari Ini</span>
              </h3>
              <button
                onClick={() => onNavigateView('history')}
                className="text-[10px] text-red-600 dark:text-red-400 font-medium hover:underline"
              >
                Riwayat
              </button>
            </div>

            <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
              {history.slice(0, 3).map((h) => (
                <div key={h.id} className="relative pl-6">
                  <span className="absolute left-0 top-1 w-4 h-4 rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 flex items-center justify-center text-[8px] font-bold">
                    •
                  </span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {h.promptTitle}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    {h.details}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
